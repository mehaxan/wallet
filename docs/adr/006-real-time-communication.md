# ADR-006: Real-time Communication

**Date:** 2026-05-07
**Status:** Accepted
**Deciders:** Project Owner

---

## Context

The app needs real-time features for:
- Live dashboard updates (when a family member adds a transaction)
- Budget alert popups (when spending approaches/exceeds budget)
- Notification delivery
- Receipt processing status updates

## Decision

**Socket.io (WebSocket with polling fallback) + Redis pub/sub**

## Architecture

```
Family Member A adds transaction
         │
         ▼
Fastify API saves to PostgreSQL
         │
         ▼
Publishes event to Redis channel:
  household:{householdId}:transactions
         │
         ▼
Socket.io server (subscribed to Redis)
broadcasts to all connected household members
         │
         ▼
All members' dashboards update in real-time
```

## Events Specification

```typescript
// Server → Client events
type ServerEvents = {
  'transaction:created': { transaction: Transaction };
  'transaction:updated': { transaction: Transaction };
  'transaction:deleted': { transactionId: string };
  'budget:alert': { budgetId: string; percentage: number; categoryName: string };
  'receipt:processed': { receiptId: string; status: 'success' | 'failed'; data?: ParsedReceipt };
  'notification:new': { notification: Notification };
  'debt:reminder': { debt: Debt; daysUntilDue: number };
};

// Client → Server events
type ClientEvents = {
  'subscribe:household': { householdId: string };
  'ping': void;
};
```

## Connection Management

```
User opens app → connect Socket.io with JWT auth
                         │
              ┌──────────▼──────────┐
              │  Socket.io Server   │
              │  (on Railway)       │
              └──────────┬──────────┘
                         │ subscribe
                    Redis pub/sub
                    channel per household
```

## Fallback Strategy

Socket.io automatically falls back to HTTP long-polling if WebSockets are blocked.
For dashboards, if real-time is unavailable: auto-refresh every 30 seconds.

## Alternatives Considered

| Option | Pros | Cons | Decision |
|---|---|---|---|
| **Socket.io** | Fallback, rooms, mature | Requires sticky sessions in multi-server | ✅ Chosen |
| Server-Sent Events (SSE) | Simple, no library | One-directional, no bidirectional | ❌ Limited |
| Supabase Realtime | Managed, no setup | Ties us to Supabase, cost at scale | ❌ Rejected |
| Pusher | Managed | 200 connections free then paid | ❌ Has cost |

## Consequences

### Positive
- Real-time updates make family sharing feel live and responsive
- Redis pub/sub scales to multiple backend instances if needed
- Socket.io's auto-reconnection handles network interruptions gracefully

### Negative
- Railway's free tier doesn't support sticky sessions (need Redis adapter) — included in plan
- Adds WebSocket infrastructure complexity
- Mobile PWA may disconnect on screen lock — handled by reconnection on focus
