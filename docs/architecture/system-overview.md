# System Overview

Architecture follows **fundy** (mehaxan/fundy) — a Next.js monolith on Railway.

## High-Level Architecture

```
User Browser / PWA
        │
        ▼
Cloudflare DNS (wallet.mehaxan.com)
        │  proxied
        ▼
Railway Service: wallet
┌────────────────────────────────────────────────────────────┐
│  Next.js 15 (App Router)                                   │
│                                                            │
│  ┌─────────────────┐    ┌──────────────────────────────┐  │
│  │  Pages (RSC)    │    │  Route Handlers (API)        │  │
│  │  src/app/(app)/ │    │  src/app/api/*/route.ts      │  │
│  │                 │    │                              │  │
│  │  - dashboard    │    │  - /api/transactions         │  │
│  │  - transactions │    │  - /api/tax                  │  │
│  │  - tax          │    │  - /api/dps                  │  │
│  │  - dps          │    │  - /api/investments          │  │
│  │  - investments  │    │  - /api/assets               │  │
│  │  - assets       │    │  - /api/loans                │  │
│  │  - loans        │    │  - /api/projections          │  │
│  │  - projections  │    │  - /api/receipts             │  │
│  │  - reports      │    │  - /api/reports              │  │
│  │  - settings     │    │  - /api/family               │  │
│  └─────────────────┘    └──────────────────────────────┘  │
│                                    │                       │
│                           src/lib/                         │
│                           ├── auth.ts (jose JWT)           │
│                           ├── session.ts (cookies)         │
│                           ├── tax.ts (BD tax engine)       │
│                           └── gemini.ts (AI client)        │
│                                    │                       │
└────────────────────────────────────┼───────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
    Railway PostgreSQL       Cloudflare R2          Gemini Flash API
    (same Railway project)   (receipt images)       (free, AI parsing)
```

## Request Flow

### Authenticated page request
```
Browser → Cloudflare → Railway (Next.js)
              middleware.ts verifies JWT cookie
              → RSC renders page, fetches DB directly
              → HTML sent to browser
              SWR fetches /api/* for dynamic data
```

### Adding a transaction
```
User fills form → POST /api/transactions
  → requireSession() checks cookie
  → Zod validates body
  → db.insert(transactions).values(...).returning()
  → NextResponse.json(newTransaction, { status: 201 })
  → SWR mutate() refreshes dashboard data
```

### Receipt OCR flow
```
User uploads image → POST /api/receipts/upload
  → Upload to Cloudflare R2
  → Insert receiptJobs row (status: "pending")
  → POST /api/receipts/[id]/parse (called client-side after upload)
      → Tesseract.js extracts text from image
      → Gemini Flash parses text → structured transaction fields
      → Update receiptJobs row (status: "done", extractedData: {...})
      → Return pre-filled form data to user
  → User reviews + saves transaction
```

### AI tax rule update
```
User pastes NBR circular text → POST /api/tax/update-with-ai
  → Gemini Flash extracts tax slabs/rates → structured JSON
  → Return diff: current vs proposed
  → User reviews diff → POST /api/tax/config (saves new tax_config row)
  → All future tax calculations use new rules
```

## Key Middleware Pattern (identical to fundy)

```typescript
// middleware.ts — runs on every request
const PUBLIC = ["/login", "/register", "/api/auth/login", "/api/auth/register"];

export async function middleware(req: NextRequest) {
  if (PUBLIC.some(p => req.nextUrl.pathname.startsWith(p)))
    return NextResponse.next();

  const token = req.cookies.get("token")?.value;
  if (!token) {
    if (req.nextUrl.pathname.startsWith("/api/"))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    // expired/invalid token
    if (req.nextUrl.pathname.startsWith("/api/"))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("token");
    return res;
  }
}
```

## Bangladesh-Specific Notes

- **Fiscal year**: July 1 → June 30 (NOT calendar year)
- **Timezone**: All dates stored UTC, displayed in Asia/Dhaka (UTC+6)
- **Currency**: BDT — `numeric(15,2)`, formatted as ৳1,00,000 (lakh system)
- **Tax config**: JSONB in DB — updatable via AI without code changes
- **DPS**: Monthly deposit tracking with maturity projection
- **bKash/Nagad/Rocket**: First-class account types

## Comparison to Fundy

| Aspect | Fundy | Wallet |
|---|---|---|
| Purpose | Group fund management | Personal finance (BD-specific) |
| Users | Multiple members | You + family |
| Auth | Custom jose JWT | Same ✅ |
| ORM | Drizzle | Same ✅ |
| Money type | `doublePrecision` | `numeric(15,2)` (tax precision) |
| Deploy | Railway + Docker | Same ✅ |
| Package mgr | pnpm | Same ✅ |
| Charts | Recharts | Same ✅ |
| Data fetch | SWR | Same ✅ |
| Extra: AI | — | Gemini Flash (tax + OCR) |
| Extra: OCR | — | Tesseract.js |
| Extra: Tax | — | BD tax engine + optimizer |
