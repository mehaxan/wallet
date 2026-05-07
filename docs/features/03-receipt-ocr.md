# Feature: Receipt OCR & Auto-Transaction Creation

## Overview

Users can photograph or upload receipts. The system automatically extracts transaction data using Tesseract.js (free OCR) and Google Gemini Flash (free AI parser), then presents a pre-filled transaction form for the user to confirm or edit before saving.

---

## User Flow

```
1. User taps [📷 Scan Receipt] button
         │
         ├── Option A: Take photo with camera (mobile)
         └── Option B: Upload file (JPEG/PNG/PDF)
         │
         ▼
2. Image preview shown → [Process Receipt] button
         │
         ▼
3. "Processing..." spinner shown (non-blocking)
         │
         ▼
4. Real-time status via WebSocket:
   → "Extracting text..."
   → "Analyzing receipt..."
   → "Ready for review!"
         │
         ▼
5. Review panel slides in:
   ┌────────────────────────────────┐
   │  📄 Receipt Detected           │
   │                                │
   │  Merchant   Shajgoj Restaurant │
   │  Date       7 May 2026         │
   │  Amount     ৳1,250             │
   │  Category   🍔 Food & Dining   │
   │                                │
   │  Items:                        │
   │  • Beef Kala Bhuna    ৳450     │
   │  • Rice (2)           ৳200     │
   │  • Cold Drink (2)     ৳100     │
   │  • Service Charge     ৳125     │
   │  • VAT (15%)          ৳375     │
   │                                │
   │  [Edit] [✅ Save Transaction]  │
   └────────────────────────────────┘
         │
         ▼
6. Transaction saved → appears in list
```

---

## Processing Pipeline Details

### Step 1: Image Preprocessing (sharp)

```typescript
async function preprocessImage(inputBuffer: Buffer): Promise<Buffer> {
  return sharp(inputBuffer)
    .grayscale()                          // remove color noise
    .normalize()                          // stretch contrast
    .sharpen()                            // improve text clarity
    .resize({ width: 2000, withoutEnlargement: false }) // standardize width
    .toFormat('png')
    .toBuffer();
}
```

### Step 2: OCR (Tesseract.js)

```typescript
import Tesseract from 'tesseract.js';

async function extractText(imageBuffer: Buffer): Promise<string> {
  const { data: { text, confidence } } = await Tesseract.recognize(
    imageBuffer,
    'eng',  // English only — all BD commercial receipts use English
    {
      logger: (m) => updateJobProgress(m),
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,/:- ',
    }
  );
  
  if (confidence < 30) {
    throw new Error('Image quality too low for OCR');
  }
  
  return text;
}
```

### Step 3: AI Parsing (Gemini Flash)

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });

async function parseReceiptText(ocrText: string): Promise<ParsedReceipt> {
  const prompt = `
You are a financial receipt parser. Extract structured data from this receipt text.
Respond ONLY with valid JSON, no explanation.

Receipt text:
---
${ocrText}
---

JSON schema (use null for missing fields):
{
  "merchant": "string",
  "date": "YYYY-MM-DD or null",
  "total": number,
  "subtotal": "number or null",
  "tax": "number or null",
  "service_charge": "number or null",
  "currency": "BDT",
  "items": [
    { "name": "string", "quantity": number, "unit_price": number, "total": number }
  ],
  "category_suggestion": "Food & Dining | Transport | Shopping | Health | Bills | Entertainment | Other",
  "payment_method": "Cash | Card | bKash | Nagad | Rocket | Other | null",
  "confidence": 0.0-1.0
}
`;

  const result = await model.generateContent(prompt);
  const json = result.response.text().trim();
  return JSON.parse(json);
}
```

---

## Queue System (BullMQ)

```typescript
// Queue definition
const ocrQueue = new Queue('ocr-processing', { connection: redisClient });

// Enqueue when receipt uploaded
await ocrQueue.add('process', {
  receiptId,
  userId,
  storageKey,
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: true,
});

// Worker (runs as separate process)
const worker = new Worker('ocr-processing', async (job) => {
  const { receiptId, userId, storageKey } = job.data;
  
  await updateReceiptStatus(receiptId, 'PROCESSING');
  
  const imageBuffer = await downloadFromR2(storageKey);
  const preprocessed = await preprocessImage(imageBuffer);
  const ocrText = await extractText(preprocessed);
  const parsed = await parseReceiptText(ocrText);
  
  await updateReceipt(receiptId, {
    status: 'COMPLETED',
    ocrRawText: ocrText,
    parsedData: parsed,
  });
  
  // Notify user via WebSocket
  await io.to(userId).emit('receipt:processed', { receiptId, data: parsed });
}, { connection: redisClient });
```

---

## Cloudflare R2 Storage Structure

```
receipts/
├── {userId}/
│   ├── {receiptId}-original.jpg    (original upload, preserved forever)
│   └── {receiptId}-thumb.jpg       (compressed preview for list view)
reports/
├── {userId}/
│   └── {year}-{month}-report.pdf
```

---

## Error Handling & Fallbacks

| Error | User Experience |
|---|---|
| Image too blurry (confidence < 30%) | "Image too unclear. Please retake in better lighting." |
| Gemini API fails | Show raw OCR text in editable textarea for manual entry |
| Gemini quota exceeded (1500/day) | Fallback to rule-based regex parser |
| PDF with multiple pages | Process first page only, warn user |
| File too large (>10MB) | "Please compress the image before uploading" |
| Network error during upload | Retry with exponential backoff, local queue |

---

## Rule-Based Fallback Parser

For when Gemini is unavailable (quota exceeded or API error):

```typescript
function ruleParseFallback(text: string): Partial<ParsedReceipt> {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Amount patterns: ৳1,250 | BDT 1250 | Total: 850.00 | Amount 500
  const amountPattern = /(?:total|amount|grand total|payable)[:\s]*[৳BDT]*\s*([0-9,]+\.?[0-9]*)/i;
  
  // Date patterns: 07/05/2026 | 2026-05-07 | 07 May 2026
  const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
  
  return {
    total: extractAmount(lines, amountPattern),
    date: extractDate(text, datePattern),
    merchant: lines[0] || null, // first non-empty line often merchant name
    confidence: 0.4, // lower confidence for rule-based
  };
}
```

---

## Performance

| Step | Typical Duration |
|---|---|
| Image upload to R2 | 1-3 seconds |
| Image preprocessing (sharp) | 0.1-0.5 seconds |
| Tesseract OCR | 2-5 seconds |
| Gemini Flash parsing | 1-2 seconds |
| **Total pipeline** | **~5-10 seconds** |

User sees a progress indicator and is notified via WebSocket when complete. They can navigate away and come back — the notification will appear when done.
