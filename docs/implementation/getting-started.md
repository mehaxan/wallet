# Getting Started

Follows the exact same setup pattern as [fundy](https://github.com/mehaxan/fundy).

## Prerequisites

- Node.js 20+ (check with `node -v`)
- pnpm 9+ — `npm install -g pnpm`
- PostgreSQL (local) OR Railway PostgreSQL URL
- Git

---

## 1. Clone & Install

```bash
git clone https://github.com/mehaxan/wallet.git
cd wallet
pnpm install
```

---

## 2. Environment Variables

Copy and fill in:

```bash
cp .env.example .env.local
```

**.env.local**
```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/wallet

# Auth (generate with: openssl rand -hex 32)
JWT_SECRET=your-secret-here

# AI (free from https://aistudio.google.com)
GEMINI_API_KEY=AIzaSy...

# File Storage (Cloudflare R2)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_ACCESS_KEY_ID=
CLOUDFLARE_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=wallet-receipts
CLOUDFLARE_R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com

# Email (free from https://resend.com)
RESEND_API_KEY=re_...
EMAIL_FROM=wallet@mehaxan.com

# Redis (caching — use your real Upstash credentials even for local dev)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...
# Leave blank to disable caching locally: UPSTASH_REDIS_REST_URL=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 3. Database Setup

### Local PostgreSQL
```bash
# Create the database
psql -U postgres -c "CREATE DATABASE wallet;"

# Generate migrations from schema
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Optional: seed initial tax config + categories
npx tsx src/db/seed.ts

# Open Drizzle Studio (browser DB explorer)
pnpm db:studio
```

### Local Redis setup (optional — app works without it)

Since we use Upstash (free, cloud-hosted), you can use your real Upstash credentials even locally. No local Redis needed.

To disable caching entirely in local dev, just leave `UPSTASH_REDIS_REST_URL` blank in `.env.local`.

### Railway PostgreSQL
If using Railway for local dev, just set `DATABASE_URL` to the public Railway URL.

---

## 4. Run Dev Server

```bash
pnpm dev
# → http://localhost:3000
```

First visit: you'll be redirected to `/register` to create your account.

---

## 5. Project Structure

```
wallet/
├── Dockerfile                  ← identical to fundy
├── drizzle.config.ts
├── drizzle/                    ← generated SQL migrations (commit these)
├── middleware.ts               ← JWT auth check on every request
├── next.config.ts
├── package.json
├── pnpm-lock.yaml              ← commit this
├── .nvmrc                      ← "20"
├── .npmrc                      ← "shamefully-hoist=true"
├── public/
└── src/
    ├── app/
    │   ├── (app)/              ← all protected pages
    │   ├── (auth)/             ← login / register
    │   └── api/                ← Next.js Route Handlers
    ├── components/
    ├── db/
    │   ├── index.ts
    │   ├── schema.ts
    │   └── seed.ts
    └── lib/
        ├── auth.ts             ← jose JWT
        ├── session.ts          ← cookie helpers
        ├── tax.ts              ← BD tax engine
        ├── gemini.ts           ← Gemini Flash client
        └── utils.ts
```

---

## 6. Adding a New Feature (pattern from fundy)

Example: adding a new `goals` endpoint.

**1. Schema** (`src/db/schema.ts`) — add your table
**2. Generate migration** — `pnpm db:generate`
**3. API route** (`src/app/api/goals/route.ts`):

```typescript
import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { requireSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireSession();
    const rows = await db
      .select()
      .from(goals)
      .where(eq(goals.userId, session.sub))
      .orderBy(desc(goals.createdAt));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { name, targetAmount, targetDate } = await req.json();
    if (!name || !targetAmount) {
      return NextResponse.json({ error: "name and targetAmount required" }, { status: 400 });
    }
    const [goal] = await db.insert(goals).values({
      userId: session.sub,
      name,
      targetAmount: String(targetAmount),
      targetDate: targetDate ? new Date(targetDate) : null,
    }).returning();
    return NextResponse.json(goal, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

**4. Page** (`src/app/(app)/goals/page.tsx`) — SWR fetch + display

```typescript
"use client";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function GoalsPage() {
  const { data: goals, isLoading } = useSWR("/api/goals", fetcher);
  // ... render
}
```

**5. Apply migration** — `pnpm db:migrate`

---

## 7. Deploy to Railway

See [deployment guide](./deployment.md).

Short version:
```bash
# Push to GitHub → Railway auto-deploys (same as fundy)
git add . && git commit -m "feat: ..." && git push
```

Railway runs the Dockerfile (multi-stage build), `pnpm build`, `node server.js`.

---

## 8. Useful Commands

```bash
pnpm dev             # start dev server (port 3000)
pnpm build           # production build
pnpm db:generate     # generate migration from schema changes
pnpm db:migrate      # apply migrations
pnpm db:studio       # open Drizzle Studio at http://local.drizzle.studio
```
