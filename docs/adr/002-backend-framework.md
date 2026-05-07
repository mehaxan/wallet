# ADR-002: Backend Framework

**Status:** Accepted  
**Pattern:** Same as fundy (mehaxan/fundy)

## Decision

**Next.js Route Handlers — no separate backend**

All API endpoints live in `src/app/api/*/route.ts` as Next.js Route Handlers.
Same architecture as fundy. No Fastify, no Express.

```
src/app/api/
├── auth/login/route.ts
├── auth/register/route.ts
├── auth/logout/route.ts
├── transactions/route.ts
├── transactions/[id]/route.ts
├── tax/route.ts
├── tax/update-with-ai/route.ts
├── dps/route.ts
├── investments/route.ts
├── assets/route.ts
├── loans/route.ts
├── budget/route.ts
├── goals/route.ts
├── projections/net-worth/route.ts
├── family/route.ts
├── reports/monthly/route.ts
├── receipts/upload/route.ts
└── receipts/[id]/parse/route.ts
```

## Pattern (same as fundy)

```typescript
export async function GET() {
  try {
    const session = await requireSession();
    const rows = await db.select().from(table).where(eq(table.userId, session.sub));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 500 });
  }
}
```

## Why Not Separate Backend?

Fundy proves Next.js API routes are sufficient for this scale.
One service on Railway = lower cost (~$5/month less).
Simpler deployment — same Dockerfile, same Railway service.

## Background Jobs

Railway provides a cron job feature. For periodic tasks (monthly snapshots, DPS maturity alerts):
- Create `/api/cron/monthly-snapshot/route.ts`
- Secure with `Authorization: Bearer CRON_SECRET` header check
- Configure in Railway: Settings → Cron Jobs → `0 0 1 * *` (monthly)
