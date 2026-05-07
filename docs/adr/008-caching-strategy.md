# ADR-008: Caching Strategy

**Date:** 2026-05-07  
**Status:** Accepted

## Context

The wallet app runs expensive queries on every page load:
- Dashboard: sums income/expense across all transactions for the fiscal year
- Tax calculation: aggregates all income + investments → runs full BD tax algorithm
- Net worth: sums accounts + investments + assets - loans
- Projections: multi-step calculations over historical snapshots

Without caching, every dashboard visit hits the DB with several aggregation queries.
For a personal app this is manageable, but it's wasteful and adds latency.

## Decision

**`@upstash/redis` + Upstash Redis** (free tier) — explicit cache-aside with key invalidation.

Upstash free tier: 10,000 requests/day, 256MB storage. A personal finance app for one family will comfortably stay within this limit (estimated 200–500 cache ops/day).

## Cost Impact

```
web (256MB Railway):       ~$5.00/month
postgres (256MB Railway):  ~$5.00/month
redis (Upstash):           FREE
──────────────────────────────────────
Subtotal:                  ~$10.00/month
Less Railway credit:        -$5.00/month
──────────────────────────────────────
Actual bill:               ~$5.00/month  ✅
```

## Why `@upstash/redis` over `ioredis`

| | `@upstash/redis` | `ioredis` |
|---|---|---|
| Cost | **Free** (Upstash) | ~$5/month (Railway Redis) |
| Protocol | HTTP REST | TCP (standard Redis) |
| TLS config | **Zero config** | Must configure `rediss://` |
| JSON handling | **Auto-serialize/parse** | Manual JSON.parse/stringify |
| Next.js compat | **Excellent** (no persistent conn) | Good (works on Railway server) |
| Setup | One URL + one token | One `REDIS_URL` |

For a Railway server (not serverless), both work. Upstash wins on cost and simplicity.

## What Gets Cached

| Cache Key | TTL | Invalidated When |
|---|---|---|
| `user:{id}:dashboard` | 2 min | Any transaction added/edited |
| `user:{id}:tax:fy:{year}` | 5 min | Transaction added/edited, tax config updated |
| `tax:config:current` | 1 hour | Tax config updated |
| `user:{id}:networth` | 5 min | Any account/investment/asset/loan change |
| `user:{id}:projections` | 10 min | Any major record change |
| `monthly:report:{id}:{year}:{month}` | 24 hours | Manual regeneration |
| `user:{id}:dps:summary` | 5 min | DPS record changes |

## Graceful Degradation

All cache operations are wrapped in try/catch. If Upstash is unavailable, the app falls back to direct DB queries — no crashes, slightly slower responses.

## Alternatives Considered

| Option | Verdict |
|---|---|
| Railway Redis + ioredis | Works, but costs ~$5/month extra |
| Next.js `unstable_cache` | No explicit invalidation control |
| In-memory `lru-cache` | Cleared on every Railway deploy |
| No caching | Fine at personal scale, chosen as fallback |
