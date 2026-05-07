# Development Guide

## Code Standards

### TypeScript
- Strict mode enabled (`"strict": true` in tsconfig.json)
- No `any` types — use `unknown` and type guards
- Explicit return types on functions
- Zod schemas for all API request/response validation

### Naming Conventions
```typescript
// Files: kebab-case
transaction-service.ts
use-dashboard-stats.ts

// Variables/functions: camelCase
const taxableIncome = ...
function calculateRebate() {}

// Components: PascalCase
TransactionList.tsx
DashboardSummaryCard.tsx

// Types/interfaces: PascalCase
interface Transaction { ... }
type TransactionType = ...

// Constants: UPPER_SNAKE_CASE
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const BD_TAX_FREE_THRESHOLD_MALE = 350_000;
```

### API Service Pattern

```typescript
// services/tax.service.ts
export class TaxService {
  constructor(private readonly prisma: PrismaClient) {}

  async calculateTax(userId: string): Promise<TaxCalculation> {
    const profile = await this.prisma.taxProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new AppError('TAX_PROFILE_NOT_FOUND', 'Tax profile not set up', 404);
    }

    const { start, end } = getCurrentFiscalYear(); // July 1 → June 30

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
        type: {
          in: ['INCOME', 'INVESTMENT_SELL'],
        },
      },
    });

    return computeTax(profile, transactions);
  }
}
```

### Route Pattern (Fastify)

```typescript
// routes/tax/index.ts
import { FastifyPluginAsync } from 'fastify';

const taxRoutes: FastifyPluginAsync = async (fastify) => {
  const taxService = new TaxService(fastify.prisma);

  fastify.get('/calculate', {
    preHandler: [fastify.authenticate],
    schema: {
      response: {
        200: TaxCalculationResponseSchema,
      },
    },
  }, async (request, reply) => {
    const { userId } = request.user;
    const calculation = await taxService.calculateTax(userId);
    return reply.send(calculation);
  });
};

export default taxRoutes;
```

---

## Frontend Patterns

### Data Fetching (TanStack Query)

```typescript
// hooks/use-dashboard-summary.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useDashboardSummary(period: DatePeriod) {
  return useQuery({
    queryKey: ['dashboard', 'summary', period],
    queryFn: () => apiClient.get<DashboardSummary>('/dashboard/summary', { params: { period } }),
    staleTime: 5 * 60 * 1000,   // 5 minutes (matches server cache TTL)
    refetchOnWindowFocus: true,
  });
}
```

### Real-time Updates

```typescript
// hooks/use-realtime.ts
import { useEffect } from 'react';
import { socket } from '@/lib/socket';
import { useQueryClient } from '@tanstack/react-query';

export function useRealtimeTransactions(householdId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    socket.emit('subscribe:household', { householdId });

    socket.on('transaction:created', (data) => {
      // Invalidate affected queries
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    });

    return () => {
      socket.off('transaction:created');
    };
  }, [householdId, queryClient]);
}
```

### State Management (Zustand)

```typescript
// stores/ui.store.ts
import { create } from 'zustand';

interface UIStore {
  isAddTransactionOpen: boolean;
  selectedPeriod: DatePeriod;
  openAddTransaction: () => void;
  closeAddTransaction: () => void;
  setPeriod: (period: DatePeriod) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isAddTransactionOpen: false,
  selectedPeriod: 'this_month',
  openAddTransaction: () => set({ isAddTransactionOpen: true }),
  closeAddTransaction: () => set({ isAddTransactionOpen: false }),
  setPeriod: (period) => set({ selectedPeriod: period }),
}));
```

---

## Error Handling

### Backend Error Classes

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Usage in routes
fastify.setErrorHandler((error, request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message },
      statusCode: error.statusCode,
    });
  }
  
  // Zod validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: error.validation },
      statusCode: 400,
    });
  }

  fastify.log.error(error);
  return reply.status(500).send({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    statusCode: 500,
  });
});
```

### Frontend Error Boundaries

```tsx
// components/shared/QueryErrorBoundary.tsx
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

export function QueryErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary }) => (
            <div className="flex flex-col items-center gap-4 p-8">
              <p>Something went wrong loading this section.</p>
              <button onClick={resetErrorBoundary}>Try again</button>
            </div>
          )}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

---

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// services/__tests__/tax.service.test.ts
import { describe, it, expect } from 'vitest';
import { computeTax } from '../tax.service';

describe('Bangladesh Tax Calculation', () => {
  it('should calculate zero tax for income below threshold (male)', () => {
    const result = computeTax({
      profile: { gender: 'MALE', residenceType: 'OTHER' },
      totalIncome: 300_000,
      incomeBreakdown: { salary: 300_000 },
      totalTDS: 0,
      totalEligibleInvestment: 0,
    });
    expect(result.finalTaxLiability).toBe(2_000); // minimum tax
    expect(result.taxBeforeRebate).toBe(0);
  });

  it('should apply investment rebate correctly', () => {
    const result = computeTax({
      profile: { gender: 'MALE', residenceType: 'DHAKA_CITY_CORP' },
      totalIncome: 800_000,
      incomeBreakdown: { salary: 800_000 },
      totalTDS: 0,
      totalEligibleInvestment: 100_000,
    });
    // Taxable = 450,000; tax = 5%×100k + 10%×300k + 15%×50k = 42,500
    // Rebate = 15% of 100k = 15,000
    // Final = 42,500 - 15,000 = 27,500
    expect(result.taxBeforeRebate).toBe(42_500);
    expect(result.investmentRebate).toBe(15_000);
    expect(result.finalTaxLiability).toBe(27_500);
  });
});
```

### Integration Tests

```typescript
// routes/__tests__/transactions.test.ts
import { buildApp } from '../../app';

describe('POST /api/transactions', () => {
  it('should create transaction and update account balance', async () => {
    const app = await buildApp();
    
    const res = await app.inject({
      method: 'POST',
      url: '/api/transactions',
      headers: { cookie: `auth-token=${testUserToken}` },
      payload: {
        type: 'EXPENSE',
        amount: 850,
        date: '2026-05-07T00:00:00Z',
        categoryId: foodCategoryId,
        accountId: cashAccountId,
        description: 'Lunch',
      },
    });

    expect(res.statusCode).toBe(201);
    const transaction = res.json();
    expect(transaction.amount).toBe(850);

    // Verify balance updated
    const account = await prisma.financialAccount.findUnique({
      where: { id: cashAccountId },
    });
    expect(account.balance.toString()).toBe('9150'); // was 10000
  });
});
```

---

## Database Query Patterns

### Optimized Dashboard Query

```typescript
// Efficient monthly summary using Prisma aggregation
async function getMonthlySummary(userId: string, month: Date) {
  const { start, end } = getMonthRange(month);
  
  const [incomeResult, expenseResult] = await prisma.$transaction([
    prisma.transaction.aggregate({
      where: {
        userId,
        type: { in: ['INCOME'] },
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: { in: ['EXPENSE'] },
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    totalIncome: incomeResult._sum.amount?.toNumber() ?? 0,
    incomeCount: incomeResult._count,
    totalExpenses: expenseResult._sum.amount?.toNumber() ?? 0,
    expenseCount: expenseResult._count,
  };
}
```

### Category Breakdown

```typescript
// Spending by category with efficient GROUP BY
const categoryBreakdown = await prisma.transaction.groupBy({
  by: ['categoryId'],
  where: {
    userId,
    type: 'EXPENSE',
    date: { gte: start, lte: end },
  },
  _sum: { amount: true },
  _count: true,
  orderBy: { _sum: { amount: 'desc' } },
  take: 10,
});
```
