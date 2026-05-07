# Caching Architecture

**Client:** `@upstash/redis`  
**Server:** Upstash Redis (free tier — 10k req/day, 256MB)  
**Pattern:** Cache-aside with explicit key invalidation

---

## Setup

### 1. Create Upstash Redis database

1. Go to [console.upstash.com](https://console.upstash.com) → **Create Database**
2. Name: `wallet`, Region: `ap-southeast-1` (Singapore — closest to BD), Type: **Regional**
3. Free tier — no credit card required
4. From the database page, copy:
   - `UPSTASH_REDIS_REST_URL` → e.g. `https://xxx.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` → long token string

### 2. Add to Railway environment variables

In Railway → wallet service → **Variables**:
```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...
```

### 3. Local development

Add to `.env.local`:
```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...
```

You use the same Upstash database for local dev (it's free and there's no localhost Redis to run).

---

## Cache Client (`src/lib/cache.ts`)

```typescript
import { Redis } from "@upstash/redis";

// Lazy singleton — created only when first cache operation runs
let _redis: Redis | null = null;

function getRedis(): Redis | null {
  // Returns null if env vars not set — graceful degradation
  if (!process.env.UPSTASH_REDIS_REST_URL) return null;
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = getRedis();
      if (!redis) return null;
      return await redis.get<T>(key); // @upstash/redis auto-parses JSON ✅
    } catch {
      return null; // cache miss on error — degrade gracefully
    }
  },

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    try {
      const redis = getRedis();
      if (!redis) return;
      await redis.set(key, value, { ex: ttlSeconds }); // auto-serializes JSON ✅
    } catch {
      // silently fail — app still works without cache
    }
  },

  async del(...keys: string[]): Promise<void> {
    try {
      const redis = getRedis();
      if (!redis) return;
      if (keys.length > 0) await redis.del(...keys);
    } catch {}
  },

  // Invalidate all cache entries for a user (e.g., after bulk receipt import)
  async invalidateUser(userId: string): Promise<void> {
    try {
      const redis = getRedis();
      if (!redis) return;
      // Use SCAN to find all user keys (non-blocking, unlike KEYS)
      let cursor = 0;
      const toDelete: string[] = [];
      do {
        const [nextCursor, keys] = await redis.scan(cursor, {
          match: `user:${userId}:*`,
          count: 100,
        });
        cursor = nextCursor as number;
        toDelete.push(...(keys as string[]));
      } while (cursor !== 0);
      if (toDelete.length > 0) await redis.del(...toDelete);
    } catch {}
  },
};

// TTL constants (seconds)
export const TTL = {
  DASHBOARD: 120,    // 2 min — balance freshness vs DB load
  TAX: 300,          // 5 min — tax changes infrequently within session
  NET_WORTH: 300,    // 5 min — investments/assets don't change by the second
  PROJECTIONS: 600,  // 10 min — expensive to compute, changes rarely
  DPS: 300,          // 5 min — DPS deposits are monthly
  BUDGET: 120,       // 2 min — budgets update with new expenses
  TAX_CONFIG: 3600,  // 1 hr  — tax config changes at most once a year
  REPORT: 86400,     // 24 hr — reports are pre-computed
} as const;

// Cache key helpers — centralized so they're consistent across routes
export const cacheKey = {
  dashboard:  (userId: string, fy: string) => `user:${userId}:dashboard:${fy}`,
  tax:        (userId: string, fy: string) => `user:${userId}:tax:${fy}`,
  netWorth:   (userId: string)             => `user:${userId}:networth`,
  projections:(userId: string, type: string) => `user:${userId}:proj:${type}`,
  dps:        (userId: string)             => `user:${userId}:dps`,
  budget:     (userId: string, ym: string) => `user:${userId}:budget:${ym}`,
  taxConfig:  (fy: string)                 => `tax:config:${fy}`,
  report:     (userId: string, ym: string) => `user:${userId}:report:${ym}`,
};
```

> **Graceful degradation:** If `UPSTASH_REDIS_REST_URL` is not set, `getRedis()` returns `null`
> and all cache ops are no-ops. The app works correctly, just slower.

---

## Cache Key Conventions

```
user:{userId}:dashboard:{fy}        → DashboardStats       (e.g., fy = "2024-25")
user:{userId}:tax:{fy}              → TaxCalculation
user:{userId}:networth              → NetWorthSummary
user:{userId}:proj:{type}           → ProjectionData        (type = "networth"|"loan"|"dps")
user:{userId}:dps                   → DPSSummary
user:{userId}:budget:{yyyy-mm}      → BudgetStatus
user:{userId}:report:{yyyy-mm}      → GeneratedReportData

tax:config:{fy}                     → TaxConfig (shared, not per-user)
```

---

## TTL Reference

| Key Pattern | TTL | Rationale |
|---|---|---|
| `user:*:dashboard:*` | **120s** (2 min) | Balance between freshness and DB load |
| `user:*:tax:*` | **300s** (5 min) | Tax changes infrequently within a session |
| `user:*:networth` | **300s** (5 min) | Investments/assets don't change by the second |
| `user:*:proj:*` | **600s** (10 min) | Projections are expensive, change rarely |
| `user:*:dps` | **300s** (5 min) | DPS deposits are monthly |
| `user:*:budget:*` | **120s** (2 min) | Budgets update with new expenses |
| `tax:config:*` | **3600s** (1 hr) | Tax config changes at most once a year |
| `user:*:report:*` | **86400s** (24 hr) | Reports are pre-computed and stored |

---

## Cache-Aside Pattern in API Routes

```typescript
// src/app/api/dashboard/route.ts
import { cache, cacheKey, TTL } from "@/lib/cache";
import { getBDFiscalYear } from "@/lib/tax";
import { requireSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireSession();
    const fy = getBDFiscalYear(new Date()); // e.g., "2024-25"
    const key = cacheKey.dashboard(session.sub, fy);

    // 1. Try cache first
    const cached = await cache.get<DashboardStats>(key);
    if (cached) return NextResponse.json(cached);

    // 2. Cache miss → compute from DB
    const stats = await computeDashboardStats(session.sub, fy);

    // 3. Store in cache
    await cache.set(key, stats, TTL.DASHBOARD);

    return NextResponse.json(stats);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
```

---

## Cache Invalidation After Writes

```typescript
// src/app/api/transactions/route.ts
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();

    const [txn] = await db.insert(transactions).values({
      userId: session.sub,
      ...body,
    }).returning();

    // Invalidate affected cache keys after write
    const fy = getBDFiscalYear(new Date(body.date));
    const ym = body.date.slice(0, 7); // "2024-11"
    await cache.del(
      cacheKey.dashboard(session.sub, fy),
      cacheKey.tax(session.sub, fy),
      cacheKey.netWorth(session.sub),
      cacheKey.budget(session.sub, ym),
    );

    return NextResponse.json(txn, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

### Full Invalidation Map

| Write Operation | Keys to Delete |
|---|---|
| Add / edit / delete transaction | `dashboard`, `tax:fy`, `networth`, `budget:ym` |
| Add / edit loan | `dashboard`, `networth`, `proj:loan` |
| Add / edit DPS | `dashboard`, `dps`, `proj:dps`, `tax:fy` |
| Add / edit investment | `dashboard`, `networth`, `proj:networth`, `tax:fy` |
| Add / edit asset | `networth`, `proj:networth` |
| Update tax config | `tax:config:fy` (invalidate for all users via pattern scan) |
| Bulk import / receipt processing | `cache.invalidateUser(userId)` — nuke everything |

---

## Health Check

```typescript
// src/app/api/health/route.ts
import { Redis } from "@upstash/redis";

export async function GET() {
  let redisOk = false;
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    await redis.ping();
    redisOk = true;
  } catch {}

  return NextResponse.json({
    status: "ok",
    redis: redisOk ? "connected" : "unavailable",
  });
}
```

---

## What We Do NOT Cache

| Data | Reason |
|---|---|
| Individual transactions (list) | Fast indexed query, SWR handles UI freshness |
| Account balances (raw) | Queried with transactions, already fast |
| User profile | Already in JWT cookie |
| Auth tokens | JWT is stateless |

