# Maintenance Guide

## Regular Maintenance Tasks

### Annual (Every June — Before new fiscal year)

**Bangladesh Tax Rule Update:**
```
1. Check NBR (National Board of Revenue) announcement for new FY tax slabs
2. Update tax_config record in database:
   - New exemption limits
   - New slab boundaries and rates
   - New minimum tax amounts
   - New investment rebate rules
3. Deploy updated config
4. Verify tax calculator with test cases

SQL to update:
UPDATE tax_config 
SET config = '{"exemptions": {"male": 350000, ...}, "slabs": [...]}',
    fiscal_year = '2026-27',
    updated_at = NOW()
WHERE is_current = true;
```

### Monthly (Automated — 1st of month)

These run automatically via BullMQ cron:
- ✅ Generate monthly reports for all users
- ✅ Send report emails
- ✅ Create recurring transactions for the new month
- ✅ Send DPS installment reminders

Monitor in Railway logs to confirm successful execution.

### Weekly

- Check Railway logs for errors: `railway logs --service api`
- Check Sentry (if configured) for new errors
- Review Uptime Robot alerts (if configured)

### As Needed

- **Dependency updates:** Review Dependabot PRs (GitHub auto-creates these)
- **Database migrations:** Run with `pnpm db:migrate` (Drizzle) via start command on Railway
- **Tax config updates:** After NBR announcements

---

## Monitoring

### Health Check

The API exposes a health endpoint:
```
GET https://api.wallet.mehaxan.com/health

Response:
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "version": "1.0.0",
  "uptime": 86400
}
```

Configure a free uptime monitor:
- [Uptime Robot](https://uptimerobot.com) — free, checks every 5 minutes
- Alert via email if `https://api.wallet.mehaxan.com/health` goes down

### Logs

```bash
# View Railway API logs
railway logs --service api --tail 100

# View Railway Worker logs  
railway logs --service worker --tail 100

# Filter for errors
railway logs --service api | grep ERROR
```

### Key Metrics to Watch

| Metric | Warning Threshold | Action |
|---|---|---|
| API response time | > 2 seconds | Check slow queries, add indexes |
| Database storage | > 400MB (80% of free) | Upgrade to Neon paid plan |
| Redis memory | > 200MB | Review cache TTLs |
| Railway RAM | > 400MB (of 512MB) | Optimize or upgrade |
| OCR queue depth | > 50 jobs | Check worker is running |
| Failed jobs | > 5/day | Review error logs |

---

## Database Maintenance

### Check Database Size
```sql
-- Run in Neon SQL editor
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Clean Old Notifications
```sql
-- Delete notifications older than 90 days that are read
DELETE FROM notifications 
WHERE is_read = true 
AND created_at < NOW() - INTERVAL '90 days';
```

### Clean Processed Receipts
```sql
-- Old processed receipts with confirmed transactions can have OCR text cleared
UPDATE receipts
SET ocr_raw_text = NULL
WHERE status = 'COMPLETED'
AND created_at < NOW() - INTERVAL '180 days'
AND transaction_id IS NOT NULL;
```

### Index Health Check
```sql
-- Find unused indexes (candidates for removal)
SELECT 
  schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY tablename;
```

---

## Backup Verification

Monthly: Download and spot-check a Neon backup:
1. Neon Dashboard → Branches → main → Restore
2. Restore to a new branch (not main!)
3. Connect to the restored branch and run a test query
4. Delete the test branch after verification

---

## Security Maintenance

### Rotate Secrets (Every 6 months)
```bash
# Generate new JWT secret
openssl rand -hex 32

# Update in Railway: Settings → Variables → JWT_SECRET
# Note: All logged-in users will be logged out (JWT invalidation)
```

### Dependency Security Audit
```bash
# Run from repo root
npm audit

# Fix automatically where safe
npm audit fix

# Review remaining issues manually
```

### Review Cloudflare WAF Logs
- Cloudflare Dashboard → Security → Events
- Check for any blocked legitimate requests (false positives)
- Check for suspicious patterns

---

## Scaling Triggers

| Event | Action |
|---|---|
| Neon hits 400MB (free tier 500MB) | Upgrade to Neon Launch ($19/mo) |
| Railway RAM consistently > 400MB | Upgrade to Railway Pro or optimize |
| OCR queue consistently delayed | Split worker to separate Railway service |
| Redis hits 200MB | Upgrade Upstash or reduce cache TTLs |
| Upstash hits 9k req/day | Review caching strategy or upgrade |

---

## Disaster Recovery

### Scenario: Railway service crashes
- **Detection:** Uptime Robot alert
- **Auto-recovery:** Railway automatically restarts on failure (configured in railway.toml)
- **Manual:** Go to Railway dashboard → restart service

### Scenario: Neon database corruption
- **Detection:** API errors, health check fails
- **Recovery:** Neon Dashboard → Point-in-time restore
- **Max data loss:** Up to 24 hours (daily backup) — in practice, Neon has continuous WAL archiving

### Scenario: Accidental bulk delete
- **Recovery:** Restore Neon to timestamp before the delete
- **Prevention:** Soft deletes implemented — most records have `deletedAt` field

### Scenario: Cloudflare Pages build fails
- **Detection:** GitHub PR check fails, or Cloudflare Pages build notification
- **Recovery:** Roll back to previous deployment in Cloudflare Pages UI

---

## Adding New Bangladesh Tax Rules

When NBR announces new FY budget:

1. Create a new `tax_config` record (don't modify old one — keep history):
```sql
INSERT INTO tax_config (
  fiscal_year, is_current, config
) VALUES (
  '2026-27',
  false, -- set to true only after testing
  '{
    "exemptions": {
      "male": 375000,
      "female": 425000,
      "disabled": 500000,
      "freedomFighter": 525000
    },
    "slabs": [
      {"limit": 100000, "rate": 0.05},
      {"limit": 300000, "rate": 0.10},
      {"limit": 400000, "rate": 0.15},
      {"limit": 500000, "rate": 0.20},
      {"limit": 2000000, "rate": 0.25},
      {"limit": null, "rate": 0.30}
    ],
    "minimumTax": {
      "DHAKA_CITY_CORP": 5000,
      "OTHER_CITY_CORP": 4000,
      "DISTRICT_HQ_POURASHAVA": 3000,
      "OTHER": 2000
    },
    "rebateRate": 0.15,
    "maxRebatePercent": 0.25
  }'::jsonb
);
```

2. Test with known calculation examples
3. Set `is_current = true` and old one `is_current = false` on July 1
