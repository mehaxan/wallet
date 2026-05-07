# Feature: Dashboard & Analytics

## Overview

The main dashboard is the first screen users see. It provides an instant financial snapshot with real-time data. All numbers update live as family members add transactions.

---

## Dashboard Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────────┐
│  💰 FinanceOS BD          [🔔 3]  [+ Add]  [👤 Hasan]          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐ ┌──────────────────┐ ┌────────────────┐  │
│  │  Net Worth        │ │  This Month       │ │  Tax Meter     │  │
│  │  ৳24,85,000      │ │  Income  ৳85,000  │ │  FY 2025-26    │  │
│  │  ▲ ৳12,000 (May) │ │  Expense ৳32,450  │ │  Paid: ৳65,000 │  │
│  └──────────────────┘ │  Saved   ৳52,550  │ │  Due:  ৳16,250 │  │
│                        └──────────────────┘ └────────────────┘  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Cash Flow — Last 6 Months                                 │ │
│  │  [Income ▬] [Expense ▬]                                   │ │
│  │  ████                                                      │ │
│  │  ████ ███                                                  │ │
│  │  ████ ███ ████                                             │ │
│  │  ████ ███ ████ ████                                        │ │
│  │  Dec  Jan  Feb  Mar  Apr  May                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────┐  ┌────────────────────────────────┐  │
│  │  Spending by Category│  │  Account Balances              │  │
│  │       🍔 Food 28%    │  │  🏦 DBBL Bank    ৳18,50,000    │  │
│  │    🏠 Housing 35%    │  │  📱 bKash        ৳12,500       │  │
│  │  🚌 Transport 12%    │  │  💵 Cash         ৳8,000        │  │
│  │  📚 Education 15%    │  │  💳 Credit Card  -৳25,000      │  │
│  │     🔧 Other 10%     │  │  ─────────────────────────     │  │
│  │    [Donut Chart]     │  │  Total           ৳18,45,500    │  │
│  └──────────────────────┘  └────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────┐  ┌──────────────────────────────┐   │
│  │  Budget Status        │  │  Active Goals                │   │
│  │  Food & Dining        │  │  🏠 House Down Payment       │   │
│  │  ████████░░ 78%       │  │  ████████░░░░░░ 55%          │   │
│  │  ৳7,800 / ৳10,000    │  │  ৳5,50,000 / ৳10,00,000     │   │
│  │                        │  │                              │   │
│  │  Transport            │  │  ✈️ Cox's Bazar Trip          │   │
│  │  ████░░░░░░ 40%       │  │  ████████████░░ 82%          │   │
│  │  ৳2,000 / ৳5,000     │  │  ৳41,000 / ৳50,000           │   │
│  └───────────────────────┘  └──────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Recent Transactions                            [View All] │ │
│  │  Today                                                     │ │
│  │  🍔 Lunch at Fakruddin         -৳850    bKash  2:30 PM    │ │
│  │  🚌 Uber to office             -৳120    bKash  9:15 AM    │ │
│  │  Yesterday                                                 │ │
│  │  💰 April Salary             +৳85,000  DBBL   8:00 AM    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dashboard Layout (Mobile PWA)

Stacked single-column layout with swipeable cards:

```
┌───────────────────────┐
│  FinanceOS BD  [+] 🔔 │
├───────────────────────┤
│                       │
│  Net Worth            │
│  ৳24,85,000          │
│  ▲ ৳12,000 this month │
│                       │
│  May 2026             │
│  Income   ৳85,000    │
│  Expense  ৳32,450    │
│  Saved    ৳52,550    │
│                       │
│  ← Swipe for more →  │
│  [●○○○○]             │
├───────────────────────┤
│  Quick Add:           │
│  [Expense] [Income]   │
│  [Scan Receipt 📷]    │
├───────────────────────┤
│  Today's Transactions │
│  🍔 Lunch    -৳850   │
│  🚌 Uber     -৳120   │
│  [See all]            │
└───────────────────────┘
```

---

## Stats & Analytics Pages

### Cash Flow Analysis
- Bar chart: Income vs Expense per month (12 months)
- Running savings balance line chart
- Comparison with previous year same month
- Filter by account, visibility (personal/household)

### Spending Analysis
- Donut chart: Spending by category
- Bar chart: Category spending over time
- Drill-down into sub-categories
- Top 5 merchants by spending

### Net Worth Tracking
- Line chart: Net worth over time (monthly snapshots)
- Asset breakdown: Cash + Bank + Investments - Debt
- Liability breakdown: Credit cards + loans + borrowed money

### Expense Heatmap
- Calendar heatmap (like GitHub contribution graph)
- Dark = heavy spending days, light = low spending days

---

## Key Metrics Calculated

```typescript
// Dashboard summary service
async function getDashboardSummary(userId: string, period: DateRange) {
  const [income, expenses, accounts, debts, investments] = await Promise.all([
    sumTransactions(userId, 'INCOME', period),
    sumTransactions(userId, 'EXPENSE', period),
    getAccountBalances(userId),
    getDebtSummary(userId),
    getInvestmentValue(userId),
  ]);

  return {
    // Period totals
    totalIncome: income,
    totalExpenses: expenses,
    netSavings: income - expenses,
    savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,

    // Net worth
    cashBalance: accounts.cash,
    bankBalance: accounts.bank,
    investmentValue: investments.total,
    totalAssets: accounts.total + investments.total,
    totalLiabilities: debts.owing + accounts.creditCardBalance,
    netWorth: (accounts.total + investments.total) - (debts.owing + accounts.creditCardBalance),

    // Debt summary
    debtOwed: debts.owed,     // others owe you
    debtOwing: debts.owing,   // you owe others
  };
}
```

---

## Caching Strategy

Dashboard data is cached in Redis to avoid expensive queries on every load:

```typescript
const CACHE_TTL = {
  dashboardSummary: 5 * 60,       // 5 minutes
  categoryBreakdown: 5 * 60,      // 5 minutes
  cashFlowChart: 30 * 60,         // 30 minutes (monthly data doesn't change often)
  netWorthHistory: 60 * 60,       // 1 hour
  accountBalances: 2 * 60,        // 2 minutes
};

// Cache key strategy
const cacheKey = `dashboard:${userId}:${period}:${dataType}`;

// Invalidation: clear relevant keys when new transaction is created
async function invalidateDashboardCache(userId: string, householdId: string) {
  await redis.del(`dashboard:${userId}:*`);
  if (householdId) {
    await redis.del(`dashboard:household:${householdId}:*`);
  }
}
```
