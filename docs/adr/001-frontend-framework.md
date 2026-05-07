# ADR-001: Frontend Framework

**Date:** 2026-05-07
**Status:** Accepted
**Deciders:** Project Owner

---

## Context

We need a frontend framework for a financial PWA that:
- Is installable on mobile via Chrome (PWA)
- Renders complex dashboards with real-time data
- Supports server-side rendering for performance
- Has strong TypeScript support
- Has a rich ecosystem for UI components and charting

## Decision

**Next.js 14 (App Router) with TypeScript**

## Alternatives Considered

| Option | Pros | Cons | Decision |
|---|---|---|---|
| **Next.js 14** | SSR/SSG, file-based routing, API routes, large ecosystem, Vercel/Cloudflare Pages compatible | Steeper learning curve than CRA | ✅ **Chosen** |
| React + Vite | Fast dev server, simple | No SSR, manual routing, no built-in API | ❌ Rejected |
| Remix | Good DX, SSR | Smaller ecosystem, less component library support | ❌ Rejected |
| SvelteKit | Lightweight, fast | Smaller community, fewer financial UI libraries | ❌ Rejected |

## Consequences

### Positive
- App Router enables React Server Components → less JavaScript sent to client
- Built-in image optimization for receipt thumbnails
- Middleware for auth protection at edge
- `next-pwa` plugin for PWA support with zero config
- Excellent TypeScript support throughout

### Negative
- App Router has a learning curve
- More complex than a simple SPA for small teams

## UI Component Strategy

- **shadcn/ui** — Accessible, copy-paste components, Tailwind-based, no lock-in
- **Tailwind CSS v3** — Utility-first, consistent design system
- **Recharts** — React-first charting library, good for financial dashboards
- **Lucide React** — Icon library (consistent with shadcn/ui)
- **react-hook-form + Zod** — Form handling and validation

## PWA Configuration

```js
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});
```

Key PWA features:
- Installable via Chrome "Add to Home Screen"
- Offline fallback page
- Background sync for queued transactions (offline entry)
- Push notifications for budget alerts and debt reminders
