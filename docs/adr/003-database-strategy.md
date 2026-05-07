# ADR-003: Database Strategy

**Status:** Accepted  
**Pattern:** Same as fundy (mehaxan/fundy)

## Decision

**Drizzle ORM + postgres driver + Railway PostgreSQL**

Exact same setup as fundy:
- `drizzle-orm` for queries
- `postgres` npm package as the driver
- `drizzle-kit` for migrations

## Key Difference from Fundy

Fundy uses `doublePrecision` for money. The wallet app uses **`numeric(15,2)`** instead.

Reason: Tax calculations at the taka level can accumulate floating-point errors.
`numeric` is exact decimal arithmetic in PostgreSQL. `doublePrecision` is IEEE 754 float.

```typescript
// fundy pattern (fine for fund tracking):
balance: doublePrecision("balance")

// wallet pattern (required for tax accuracy):
amount: numeric("amount", { precision: 15, scale: 2 })
```

## Schema Location

All tables in one file: `src/db/schema.ts` — same as fundy.

## Migration Workflow

```bash
pnpm db:generate    # creates files in /drizzle folder
pnpm db:migrate     # applies to connected DATABASE_URL
```

Migrations are committed to git. Railway applies them on deploy.
