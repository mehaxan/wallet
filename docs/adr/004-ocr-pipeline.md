# ADR-004: OCR Pipeline

**Date:** 2026-05-07
**Status:** Accepted
**Deciders:** Project Owner

---

## Context

Users upload receipts (photos, scanned PDFs) to auto-create transactions. We need to:
- Extract text from images/PDFs (OCR)
- Parse extracted text into structured financial data (merchant, amount, date, items)
- Keep the pipeline **100% free** for personal use
- Handle English receipts (all Bangladeshi commercial receipts use English)

## Decision

**Tesseract.js (OCR) + Google Gemini Flash 2.0 (AI Parser)**

## Pipeline Flow

```
User uploads receipt
        │
        ▼
Cloudflare R2 Storage
(original image preserved)
        │
        ▼
BullMQ Job Queue (Redis)
        │
        ▼
┌───────────────────────┐
│   Tesseract.js (OCR)  │
│  Runs in Node.js      │
│  English lang pack    │
│  No API call needed   │
└───────────┬───────────┘
            │ raw text
            ▼
┌───────────────────────┐
│  Gemini Flash 2.0     │
│  (Free API Tier)      │
│  1500 req/day free    │
│  Structured JSON out  │
└───────────┬───────────┘
            │ parsed data
            ▼
User Review Screen
(confirm/edit before saving)
            │
            ▼
Transaction Created
```

## Gemini Flash Prompt Strategy

```
System: You are a financial receipt parser. Extract structured data from receipt text.
Always respond with valid JSON matching the schema provided.

User: Parse this receipt text into structured transaction data:
---
{ocrText}
---

Expected JSON schema:
{
  "merchant": "string",
  "date": "ISO date string or null",
  "total": "number",
  "currency": "BDT",
  "items": [{ "name": "string", "qty": number, "price": number }],
  "category_suggestion": "string (e.g., Food, Transport, Shopping)",
  "confidence": 0-1
}
```

## Free Tier Limits

| Service | Limit | Expected Usage |
|---|---|---|
| Tesseract.js | Unlimited (local) | All receipts |
| Gemini Flash 2.0 | 1500 req/day, 1M tokens/day | ~50 receipts/day max |

Personal use: ~30-100 receipts/month → well within free limits.

## Alternatives Considered

| Option | Cost | Accuracy | Decision |
|---|---|---|---|
| **Tesseract.js + Gemini Flash** | Free | Good | ✅ Chosen |
| Google Cloud Vision + GPT-4o mini | $1.50/1000 + $0.01/receipt | Excellent | ❌ Has cost |
| AWS Textract | $1.50/1000 | Excellent | ❌ Has cost |
| Rule-based regex only | Free | Poor | ❌ Too unreliable |

## Image Preprocessing

Before OCR, images are preprocessed to improve accuracy:
1. Convert to grayscale
2. Increase contrast
3. Deskew if rotated
4. Resize to optimal DPI (300 DPI target)

Library: `sharp` (Node.js, very fast)

## Supported Input Formats

- JPEG, PNG, WebP (photos taken on phone)
- PDF (single page scanned receipts)
- HEIC → auto-converted to JPEG via `sharp`

## Consequences

### Positive
- Zero cost for the entire pipeline
- Tesseract.js runs locally — no external API call for OCR, faster
- Gemini Flash is genuinely capable of parsing structured receipt data
- User review step before saving = no incorrect transactions from bad OCR

### Negative
- Tesseract.js is slower than cloud OCR (~2-5 seconds per image vs ~500ms for Google Vision)
- Accuracy slightly lower than Google Cloud Vision for low-quality images
- Tesseract.js adds ~50MB to backend bundle size
- Gemini API key required (free but requires Google account)

## Error Handling

- OCR fails → mark receipt as `manual_review_needed`, notify user
- Gemini parse fails → show raw OCR text to user for manual entry
- Image too blurry → detect via `sharp` sharpness score, prompt user to retake
