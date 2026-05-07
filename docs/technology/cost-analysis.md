# Cost Analysis

## Monthly Cost Summary

| Service | Cost |
|---|---|
| Railway wallet service (Next.js monolith, 256MB) | ~$5.00/month |
| Railway PostgreSQL (256MB) | ~$5.00/month |
| **Railway subtotal** | ~$10.00/month |
| Railway Hobby credit | -$5.00/month |
| **Actual Railway bill** | **~$5.00/month** ✅ |
| Upstash Redis (free 10k req/day) | **FREE** ✅ |
| Cloudflare R2 (free 10GB) | **FREE** ✅ |
| Gemini Flash (free 1500 req/day) | **FREE** ✅ |
| Cloudflare DNS | **FREE** ✅ |
| GitHub Actions CI | **FREE** ✅ |
| **Total monthly** | **~$5.00/month** ✅ |

---

## Railway Pricing — Honest Breakdown

Railway Hobby plan = $5/month subscription, includes **$5 in free credits**.

Resource rates:
```
RAM:  $0.000463 / GB / minute
CPU:  $0.000231 / vCPU / minute
```

Cost calculation for 256MB service running 24/7:
```
0.25 GB × $0.000463 × 60 × 24 × 30 = $4.99/month per service
```

Two services (wallet app + PostgreSQL) = ~$10/month → after $5 credit = **~$5/month actual**.

---

## Free Tier Limits vs. Personal Usage

| Service | Free Limit | Personal App Usage |
|---|---|---|
| Upstash Redis | 10,000 req/day | ~200–500 req/day ✅ |
| Cloudflare R2 | 10GB storage, 1M ops/month | <1GB ✅ |
| Gemini Flash | 1,500 req/day | ~5-20 req/day ✅ |
| GitHub Actions | 2,000 min/month (private repo) | ~50 min/month ✅ |

All free tiers have **massive headroom** for a single-user/family app.

---

## Annual Cost

```
~$5/month × 12 = $60/year
```

For a personal finance app that replaces paid alternatives:
- MoneyManager: $5/month = $60/year (same cost, no BD tax support)
- YNAB: $14/month = $168/year (no BD features at all)
- This app: $60/year + full data ownership + fully custom for Bangladesh

---

## What You Get for $5/Month

- Custom-built for Bangladesh tax rules (no other app has this)
- AI-configurable tax rules (paste NBR circular → updates automatically)
- DPS, Sanchayapatra, investment tracking
- Family sharing
- Receipt OCR with AI parsing
- Financial projections and analytics
- Full data ownership (no third party holds your financial data)
- Custom domain (wallet.mehaxan.com)

---

## If Usage Grows

| Trigger | Action | Cost Impact |
|---|---|---|
| App gets slow | Upgrade Railway service to 512MB | +~$5/month |
| >10GB receipts in R2 | R2 paid: $0.015/GB after 10GB | Negligible |
| >1,500 Gemini req/day | Gemini paid ($0.10/1M tokens) | Negligible |
| Need more Redis | Upstash paid from $0.20/100k req | Still very cheap |

For a personal/family app, you will **never** hit these limits.

---

## Railway Pricing — Honest Breakdown

Railway Hobby plan = $5/month subscription, includes **$5 in free credits**.

Resource rates:
```
RAM:  $0.000463 / GB / minute
CPU:  $0.000231 / vCPU / minute
```

Cost calculation for 256MB service running 24/7:
```
0.25 GB × $0.000463 × 60 × 24 × 30 = $4.99/month per service
```

### Option A: Recommended (Cloudflare Pages + Railway) — ~$5/month ✅

```
Service                          Cost
──────────────────────────────────────────────────────
Cloudflare Pages (frontend)      FREE (unlimited builds, CDN)
Railway API service (256MB)      ~$5.00/month
Railway PostgreSQL (256MB)       ~$5.00/month
────────────────────────────────────────────
Railway subtotal                 ~$10.00
Less: Railway monthly credit     -$5.00
──────────────────────────────────────────
ACTUAL RAILWAY BILL              ~$5.00/month ✅
──────────────────────────────────────────
Upstash Redis (free tier)        $0 (up to 10k req/day)
Cloudflare R2 (free tier)        $0 (up to 10GB storage, 1M ops)
Gemini Flash (free tier)         $0 (1500 req/day)
Resend (free tier)               $0 (100 emails/day)
Cloudflare DNS + Proxy           $0 (included with any CF account)
──────────────────────────────────────────
TOTAL MONTHLY                    ~$5.00/month ✅
```

### Option B: All Railway (Monolith) — ~$10/month

```
Service                          Cost
──────────────────────────────────────────────────────
Railway web+API service (512MB)  ~$10.00/month
Railway PostgreSQL (256MB)       ~$5.00/month
────────────────────────────────────────────
Railway subtotal                 ~$15.00
Less: Railway monthly credit     -$5.00
──────────────────────────────────────────
ACTUAL RAILWAY BILL              ~$10.00/month
All external free services       $0
──────────────────────────────────────────
TOTAL MONTHLY                    ~$10.00/month
```

---

## Free Tier Limits vs. Personal Usage

| Service | Free Limit | Personal App Usage |
|---|---|---|
| Upstash Redis | 10,000 req/day | ~500 req/day ✅ |
| Cloudflare R2 | 10GB storage, 1M ops/month | <1GB ✅ |
| Gemini Flash | 1,500 req/day | ~5-20 req/day ✅ |
| Resend | 100 emails/day | 1-5/day ✅ |
| Cloudflare Pages | Unlimited | ✅ |

All free tiers have **massive headroom** for a single-user/family app.

---

## Annual Cost

```
Recommended setup (~$5/month):
  $5 × 12 = $60/year
  
All-Railway option (~$10/month):
  $10 × 12 = $120/year
```

For a personal finance app that replaces paid apps (MoneyManager = $5/month, YNAB = $14/month),
this is excellent value for a fully custom solution.

---

## What You Get for $5/Month

- Custom-built for Bangladesh tax rules (no other app has this)
- Configurable tax rules with AI update capability
- DPS, Sanchayapatra, investment tracking
- Real-time family sharing
- Receipt OCR with AI parsing
- Financial projections and analytics
- Full data ownership (no third party holds your financial data)
- Custom domain (wallet.mehaxan.com)

---

## If Usage Grows

| Trigger | Action | Cost Impact |
|---|---|---|
| >1GB receipts in R2 | Stay on free tier (costs $0.015/GB after 10GB) | +$0.015/GB |
| >1,500 Gemini req/day | Upgrade to Gemini paid ($0.10/1M tokens) | Negligible |
| >100 emails/day | Resend paid ($20/month for 50k emails) | +$20/month |
| App gets slow | Upgrade Railway service to 512MB | +$5/month |

For a personal/family app, you will **never** hit free tier limits.
