# Tech Stack

Follows the same architecture pattern as [fundy](https://github.com/mehaxan/fundy) —
a Next.js monolith deployed on Railway via Docker.

---

## Core Stack

| Layer | Technology | Version | Why |
|---|---|---|---|
| Frontend | Next.js (App Router) | 15.x | Same as fundy, monolith = no separate API server |
| Language | TypeScript | 5.x | Same as fundy |
| Styling | Tailwind CSS v4 | 4.x | Same as fundy |
| Icons | FontAwesome | 7.x | Same as fundy |
| Charts | Recharts | 3.x | Same as fundy |
| Data fetching | SWR | 2.x | Same as fundy |
| Date handling | date-fns | 4.x | Same as fundy |
| CSS utilities | clsx | 2.x | Same as fundy |

## Database & ORM

| Item | Choice | Why |
|---|---|---|
| Database | PostgreSQL | Railway PostgreSQL plugin |
| ORM | **Drizzle ORM** | Same as fundy — type-safe, no codegen, fast |
| Driver | postgres (npm) | Same as fundy |
| Migrations | drizzle-kit | Same as fundy — `drizzle-kit generate` + `migrate` |

> **⚠️ Important difference from fundy:** Fundy uses `doublePrecision` for money.
> The wallet app uses **`numeric(15,2)`** everywhere instead — financial apps need
> exact decimal arithmetic. Tax calculations can be wrong by fractions of a taka
> with floating point.

### Drizzle Connection (`src/db/index.ts`)
```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

### drizzle.config.ts
```typescript
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```


## Caching

| Item | Choice | Why |
|---|---|---|
| Cache server | **Upstash Redis** (free tier) | 10k req/day free — enough for a personal app |
| Client | **`@upstash/redis`** | HTTP-based, zero TLS config, auto JSON serialize/parse |
| Pattern | Cache-aside | Try cache → DB on miss → store result |
| Graceful degradation | ✅ Yes | App works even if Redis is unavailable (try/catch everywhere) |

```typescript
// src/lib/cache.ts — lazy singleton, @upstash/redis
import { Redis } from "@upstash/redis";
let _redis: Redis | null = null;
function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null;
  return _redis ??= new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

export const cache = {
  get:  <T>(key: string) => ...,           // returns null on miss or error; auto-parses JSON
  set:  (key: string, val: unknown, ttl: number) => ...,  // { ex: ttl }
  del:  (...keys: string[]) => ...,
  invalidateUser: (userId: string) => ..., // SCAN user:* → del all
};
```

**Env vars needed:**
```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...
```

## Authentication

| Item | Choice | Why |
|---|---|---|
| JWT | **jose** | Same as fundy — edge-compatible, no heavy deps |
| Passwords | bcryptjs | Same as fundy — 12 rounds |
| Session storage | httpOnly cookie (`token`) | Same as fundy — XSS safe |
| Middleware | Next.js middleware.ts | Same as fundy — verifies JWT on every request |

No NextAuth.js — custom implementation identical to fundy pattern.

### Auth helpers (`src/lib/auth.ts`) — same as fundy
```typescript
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function signToken(payload: SessionPayload): Promise<string> { ... }
export async function verifyToken(token: string): Promise<SessionPayload | null> { ... }
export async function hashPassword(password: string): Promise<string> { ... }
export async function comparePassword(pw: string, hash: string): Promise<boolean> { ... }
```

### Session helpers (`src/lib/session.ts`) — same as fundy
```typescript
export async function getSession(): Promise<SessionPayload | null>
export async function requireSession(): Promise<SessionPayload>
export async function requireAdmin(): Promise<SessionPayload>
```

## AI & OCR

| Item | Choice | Why |
|---|---|---|
| AI parser | Google Gemini Flash 2.0 | Free: 1500 req/day |
| OCR | Tesseract.js | Free, runs in Node.js, no external API |

Gemini used for:
1. Parsing receipt images → structured transaction data
2. Updating tax rules from NBR circulars → structured JSON

## Email & Storage

| Item | Choice |
|---|---|
| Email | Resend (free 100/day) |
| File storage | Cloudflare R2 (free 10GB) |

## Deployment

| Item | Choice |
|---|---|
| Hosting | Railway |
| Containerization | Docker (multi-stage, same Dockerfile as fundy) |
| Database | Railway PostgreSQL plugin |
| Package manager | **pnpm** |
| Node version | 20 (`.nvmrc`) |

### Dockerfile (identical to fundy)
```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

## Package Scripts (same as fundy)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
}
```

## Folder Structure (same as fundy)

```
src/
├── app/
│   ├── (app)/              ← protected pages
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── tax/
│   │   ├── dps/
│   │   ├── investments/
│   │   ├── assets/
│   │   ├── loans/
│   │   ├── budget/
│   │   ├── goals/
│   │   ├── projections/
│   │   ├── family/
│   │   ├── reports/
│   │   └── settings/
│   ├── (auth)/             ← login/register
│   │   ├── login/
│   │   └── register/
│   └── api/                ← Next.js Route Handlers
│       ├── auth/
│       ├── transactions/
│       ├── tax/
│       ├── dps/
│       ├── investments/
│       ├── assets/
│       ├── loans/
│       ├── budget/
│       ├── goals/
│       ├── projections/
│       ├── family/
│       ├── reports/
│       └── receipts/
├── db/
│   ├── index.ts            ← drizzle(postgres(DATABASE_URL), { schema })
│   └── schema.ts           ← all table definitions
├── lib/
│   ├── auth.ts             ← jose JWT helpers
│   ├── session.ts          ← cookie session helpers
│   ├── tax.ts              ← Bangladesh tax calculation engine
│   ├── gemini.ts           ← Gemini Flash API client
│   └── utils.ts            ← formatBDT, formatDate, apiError, cn
└── components/
    ├── ui/                 ← shared UI primitives
    ├── charts/             ← Recharts wrappers
    └── forms/              ← transaction forms, etc.
```

## Wallet-Specific Additions (not in fundy)

| Addition | Package | Purpose |
|---|---|---|
| AI/OCR | `@google/generative-ai` | Gemini Flash for receipt + tax parsing |
| OCR | `tesseract.js` | Extract text from receipt images |
| PDF reports | `@react-pdf/renderer` | Monthly PDF generation |
| QR/share | Custom | Household invite links |

## What's NOT used (vs original plan)

| Removed | Why |
|---|---|
| Fastify (separate API) | Fundy proves Next.js API routes are sufficient |
| NextAuth.js | Fundy's jose pattern is simpler and already works |
| Prisma | Drizzle is what fundy uses — no codegen, lighter |
| Redis/Upstash | Not needed for core features at personal scale |
| BullMQ | Background jobs can be done via `/api/cron/` route + Railway cron |
| Socket.io | Not needed — SWR with polling or manual refresh is sufficient |
| React Query | SWR is what fundy uses — simpler |
