# Deployment Guide

## Architecture

```
GitHub repo (mehaxan/wallet)
        │
        │  push to main
        ▼
GitHub Actions CI
  ├─ pnpm install --frozen-lockfile
  ├─ tsc --noEmit  (type-check)
  └─ railway up --service $RAILWAY_SERVICE_ID --detach
        │
        ▼
Railway (wallet service)
  ├─ Docker build (multi-stage, same as fundy)
  ├─ pnpm db:migrate  (run in start command)
  └─ node server.js
        │
        ├── wallet.mehaxan.com (Cloudflare DNS → Railway)
        ├── PostgreSQL (Railway plugin, same project)
        └── Upstash Redis (external free service)
```

Same CI/CD pattern as `mehaxan/fundy`. One Railway service runs the full Next.js monolith.

---

## Step 1: Create Upstash Redis (free, do this first)

1. Go to [console.upstash.com](https://console.upstash.com) → **Create Database**
2. Name: `wallet`, Region: `ap-southeast-1` (Singapore), Type: **Regional**
3. Copy two values from the database page:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

---

## Step 2: Create Railway Project

1. [railway.app](https://railway.app) → **New Project** → **Empty Project** → name it `wallet`
2. Click **+ New** → **Database** → **Add PostgreSQL**
   - Railway provisions it in ~30 seconds
   - Click the Postgres service → **Connect** tab → copy both the internal URL and the public URL
3. Click **+ New** → **GitHub Repo** → select `mehaxan/wallet`
   - Railway detects the Dockerfile automatically
   - Leave root directory as `/`

---

## Step 3: Environment Variables

In Railway → `wallet` service → **Variables** tab, add:

```env
# Database (Railway variable reference — auto-updates if credentials rotate)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (Upstash — free external service)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...

# Authentication (generate with: openssl rand -hex 32)
JWT_SECRET=<64-char hex string>

# AI (free from aistudio.google.com)
GEMINI_API_KEY=AIzaSy...

# File storage (Cloudflare R2 — free 10GB)
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET=wallet-receipts
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com

# App
NEXT_PUBLIC_APP_URL=https://wallet.mehaxan.com
NODE_ENV=production
PORT=3000
```

---

## Step 4: Custom Domain

In Railway → wallet service → **Settings** → **Networking** → **Custom Domain**:
- Add: `wallet.mehaxan.com`
- Railway gives you a target (e.g., `wallet-production.up.railway.app`)

In Cloudflare DNS for `mehaxan.com`:
```
Type    Name     Content                              Proxied
──────────────────────────────────────────────────────────────
CNAME   wallet   wallet-production.up.railway.app     ✅ Yes
```

---

## Step 5: GitHub Actions CI/CD

Create `.github/workflows/deploy.yml` in the wallet repo (identical pattern to fundy):

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Type-check & Deploy
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type-check
        run: pnpm exec tsc --noEmit

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: railway up --service ${{ secrets.RAILWAY_SERVICE_ID }} --detach
```

### GitHub Secrets Required

Add these in GitHub → wallet repo → **Settings** → **Secrets and variables** → **Actions**:

| Secret | Where to find it |
|---|---|
| `RAILWAY_TOKEN` | Railway → Account Settings → Tokens → **New Token** |
| `RAILWAY_SERVICE_ID` | Railway → wallet service → Settings → copy **Service ID** |

---

## Step 6: Database Migrations

Drizzle migrations run via `pnpm db:migrate`. Run this:

**First time (from your laptop using the public Postgres URL):**
```bash
# Copy the PUBLIC URL from Railway Postgres → Connect → Public URL
export DATABASE_URL="postgresql://postgres:xxx@xxx.railway.app:5432/railway"

pnpm db:generate  # generate migration files from schema
pnpm db:migrate   # apply to Railway Postgres
```

**After that:** Add `pnpm db:migrate` to the Docker start command so it runs automatically on each deploy:

```dockerfile
# In Dockerfile CMD or railway.toml startCommand
CMD pnpm db:migrate && node server.js
```

Or add a `postinstall` / start script in `package.json`:
```json
{
  "scripts": {
    "start": "node server.js",
    "start:migrate": "pnpm db:migrate && node server.js"
  }
}
```

---

## Package.json Scripts

Make sure these scripts exist (typecheck is needed by the GitHub Actions workflow):

```json
{
  "scripts": {
    "dev":        "next dev",
    "build":      "next build",
    "start":      "node .next/standalone/server.js",
    "typecheck":  "tsc --noEmit",
    "lint":       "next lint",
    "db:generate":"drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio":  "drizzle-kit studio"
  }
}
```

---

## Deployment Flow

```
git push origin main
        │
        ▼
GitHub Actions runner (ubuntu-latest)
  1. pnpm install --frozen-lockfile
  2. tsc --noEmit          ← stops here if type errors exist
  3. railway up --detach   ← triggers Railway build + deploy
        │
        ▼
Railway builds Docker image
  Stage 1: deps   (pnpm install --prod)
  Stage 2: builder (pnpm build → .next/standalone)
  Stage 3: runner  (node:20-alpine + standalone output)
        │
        ▼
Railway swaps to new container
  → pnpm db:migrate (runs migrations)
  → node server.js
        │
        ▼
wallet.mehaxan.com updated  (~3-5 minutes total)
```

---

## Local Development

```bash
# .env.local
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wallet
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io  # use real Upstash (it's free)
UPSTASH_REDIS_REST_TOKEN=AXxx...
JWT_SECRET=any-long-string-for-local-dev
GEMINI_API_KEY=AIzaSy...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Start local Postgres
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres --name wallet-db postgres:16-alpine

# Install + run
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

---

## Rollback

| Layer | How to rollback |
|---|---|
| App | Railway → wallet service → Deployments → pick previous → **Redeploy** (~30s) |
| Database | Railway → Postgres → **Backups** → restore to any point (7 days kept) |
| Schema | Drizzle doesn't auto-rollback — keep `drizzle/` migration files in git |

---

## Monitoring

```bash
# Install Railway CLI locally
npm install -g @railway/cli
railway login

# Tail logs
railway logs --service wallet
railway logs --service wallet --tail 100 | grep -i error
```

**Health check endpoint:**
```bash
curl https://wallet.mehaxan.com/api/health
# → {"status":"ok","redis":"connected"}
```

**Free uptime monitoring:** [uptimerobot.com](https://uptimerobot.com) → monitor `https://wallet.mehaxan.com/api/health` every 5 minutes → email alert when down.

---

## Cost Summary

```
Railway wallet service (256MB):   ~$5.00/month
Railway PostgreSQL (256MB):        ~$5.00/month
─────────────────────────────────────────────
Subtotal:                          ~$10.00/month
Railway credit:                     -$5.00/month
─────────────────────────────────────────────
Actual bill:                        ~$5.00/month

Upstash Redis:                      FREE  ✅
Gemini Flash API:                   FREE  ✅
Cloudflare DNS:                     FREE  ✅
GitHub Actions:                     FREE  ✅ (2000 min/month)
```
