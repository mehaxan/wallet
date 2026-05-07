# ADR-007: Deployment Strategy

**Date:** 2026-05-07 (Updated)
**Status:** Accepted
**Deciders:** Project Owner

---

## Context

- Everything must run on **Railway** (frontend, backend, database)
- Budget: Railway Hobby plan at **$5/month**
- Domain: `wallet.mehaxan.com` via Cloudflare (existing)

## Railway Cost Reality

```
256MB service running 24/7:
  0.25 GB × $0.000463/GB/min × 43,200 min = ~$5.00/month per service

3 separate services (frontend + backend + postgres): ~$15/month - $5 credit = $10/month
2 services (one combined app + postgres):           ~$10/month - $5 credit = $5/month ✅
```

## Decision

**Single Next.js Monolith + Railway PostgreSQL** — two services total, fits $5/month.

Combining frontend and backend into ONE Next.js service using a custom server
saves an entire service cost (~$5/month). This is the only way to stay at $5/month total.

## Architecture

```
Railway Project: "wallet"
│
├── Service: web (Next.js — frontend + API + WebSocket)  ~$5/month
│   ├── App Router pages           → frontend UI
│   ├── Route Handlers (/api/*)    → REST API
│   ├── Custom server (server.ts)  → Socket.io WebSocket
│   └── BullMQ worker (same process, forked thread)
│
└── Plugin: PostgreSQL             ~$5/month (256MB)
    └── Database: wallet

External free services:
├── Upstash Redis (free 10k req/day) → BullMQ queues + cache
├── Cloudflare R2 (free 10GB)       → receipt storage
├── Gemini Flash API (free 1500/day) → OCR parsing + tax AI
└── Resend (free 100/day)           → email reports

Cloudflare (existing):
└── DNS + Proxy: wallet.mehaxan.com → Railway service
```

## Cost After This Decision

| Item | Monthly Cost |
|---|---|
| Railway Hobby subscription | $5.00 |
| Railway web service (256MB) | ~$5.00 |
| Railway PostgreSQL (256MB) | ~$5.00 |
| **Railway subtotal** | **~$15.00** |
| Railway monthly credit | -$5.00 |
| **Net Railway cost** | **~$10/month** |
| All external services (free tiers) | $0 |
| **Total** | **~$10/month** |

> **Honest note:** Running two Railway services costs ~$10/month, not $5.
> To achieve true $5/month, you would need to keep the external Cloudflare Pages
> for the frontend (free) and only put the API + PostgreSQL on Railway (~$10/month - $5 credit = $5/month).
> **Recommended: Use Cloudflare Pages for frontend (free) + Railway for API + PostgreSQL (~$5/month after credit)**

## Recommended Hybrid (Best Value)

```
wallet.mehaxan.com     → Cloudflare Pages (free, global CDN)
api.wallet.mehaxan.com → Railway API service (~$5/month)
                         + Railway PostgreSQL plugin (~$5/month)
                         = $10 - $5 credit = $5/month actual ✅
```

This is **genuinely $5/month** and gives the best performance (CDN for frontend).

## Alternatives Considered

| Option | Cost | Tradeoff |
|---|---|---|
| All Railway (3 services) | ~$10/mo | Simpler management |
| All Railway (2 services — monolith) | ~$5/mo | Less separation of concerns |
| Cloudflare Pages + Railway API + PG | ~$5/mo | Best performance, minor split management |
| Cloudflare Pages + Railway API + Neon | ~$0/mo | But Neon pauses after inactivity |

## Domain Configuration (Cloudflare)

```
DNS Records:

Type    Name         Content                    Proxy
────────────────────────────────────────────────────────
CNAME   wallet       wallet.up.railway.app      ✅ Proxied
CNAME   api.wallet   api.up.railway.app         ✅ Proxied
```

Cloudflare proxy provides: HTTPS, DDoS protection, WAF — all free.

## Consequences

### Positive
- Everything in one Railway project = one dashboard to manage
- Railway's built-in PostgreSQL is properly managed, auto-backup
- Cloudflare DNS handles HTTPS automatically
- Simple deployment: push to GitHub → Railway auto-deploys

### Negative
- ~$10/month actual cost (not $5) if all on Railway
- Must be honest about this with the budget
