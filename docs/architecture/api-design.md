# API Design

## Base Configuration

- **Base URL:** `https://api.wallet.mehaxan.com`
- **Version prefix:** `/api/v1`
- **Format:** JSON (application/json)
- **Auth:** JWT in httpOnly cookie (`auth-token`)
- **Rate limiting:** 100 req/min per user (Redis-backed)

---

## Authentication Endpoints

```
POST   /api/auth/register          Create new account
POST   /api/auth/login             Login with email/password
POST   /api/auth/logout            Invalidate session
POST   /api/auth/refresh           Refresh JWT token
POST   /api/auth/forgot-password   Send reset email
POST   /api/auth/reset-password    Reset with token
GET    /api/auth/me                Get current user profile
PUT    /api/auth/me                Update profile
```

---

## Transactions

```
GET    /api/transactions           List with filters
POST   /api/transactions           Create transaction
GET    /api/transactions/:id       Get single transaction
PUT    /api/transactions/:id       Update transaction
DELETE /api/transactions/:id       Delete transaction
POST   /api/transactions/bulk      Bulk import (CSV)
GET    /api/transactions/export    Export to CSV

Query params for GET /api/transactions:
  ?type=expense,income
  ?categoryId=uuid
  ?accountId=uuid
  ?startDate=2025-01-01
  ?endDate=2025-12-31
  ?search=grocery
  ?tags=food,household
  ?page=1&limit=20
  ?sort=date:desc
  ?visibility=household
```

### Response Shape
```typescript
{
  data: Transaction[],
  meta: {
    total: number,
    page: number,
    limit: number,
    totalPages: number
  }
}
```

---

## Dashboard / Analytics

```
GET    /api/dashboard/summary        Net worth, income, expenses (current month)
GET    /api/dashboard/cashflow       Income vs expense by period
GET    /api/dashboard/by-category    Spending breakdown by category
GET    /api/dashboard/trend          30/60/90 day trends
GET    /api/dashboard/accounts       Account balances

Query params:
  ?period=this_month|last_month|this_year|custom
  ?startDate=&endDate=
  ?householdId=   (include household shared data)
```

### Summary Response
```typescript
{
  netWorth: number,
  totalIncome: number,
  totalExpenses: number,
  totalSavings: number,
  cashBalance: number,
  bankBalance: number,
  debtOwed: number,      // others owe you
  debtOwing: number,     // you owe others
  investmentValue: number,
  currency: "BDT",
  period: { start: string, end: string }
}
```

---

## Accounts (Financial)

```
GET    /api/accounts                List user's financial accounts
POST   /api/accounts                Create account
GET    /api/accounts/:id            Account details + recent transactions
PUT    /api/accounts/:id            Update account
DELETE /api/accounts/:id            Delete (soft delete)
POST   /api/accounts/:id/reconcile  Manual balance adjustment
```

---

## Budget

```
GET    /api/budgets                 List budgets
POST   /api/budgets                 Create budget
GET    /api/budgets/:id             Budget with spending progress
PUT    /api/budgets/:id             Update budget
DELETE /api/budgets/:id             Delete budget
GET    /api/budgets/:id/categories  Category spending vs allocation
```

### Budget Progress Response
```typescript
{
  budget: Budget,
  totalAllocated: number,
  totalSpent: number,
  percentageUsed: number,
  daysRemaining: number,
  projectedOverspend: boolean,
  categories: [{
    category: Category,
    allocated: number,
    spent: number,
    percentage: number,
    status: 'ok' | 'warning' | 'exceeded'
  }]
}
```

---

## Goals

```
GET    /api/goals                   List goals
POST   /api/goals                   Create goal
GET    /api/goals/:id               Goal with progress
PUT    /api/goals/:id               Update goal
DELETE /api/goals/:id               Delete goal
POST   /api/goals/:id/contribute    Add contribution
GET    /api/goals/:id/contributions Goal contribution history
```

---

## Debt Tracking

```
GET    /api/debts                   List all debts (both directions)
POST   /api/debts                   Record new debt
GET    /api/debts/:id               Debt details with payment history
PUT    /api/debts/:id               Update debt
POST   /api/debts/:id/pay           Record a payment
POST   /api/debts/:id/settle        Mark as fully settled
GET    /api/debts/summary           Total owed to you vs you owe
```

---

## Tax (Bangladesh)

```
GET    /api/tax/profile             Get user's tax profile
PUT    /api/tax/profile             Update tax profile (gender, residence, etc.)
GET    /api/tax/calculate           Real-time tax calculation
GET    /api/tax/summary             Tax year summary (income by source, TDS, rebates)
GET    /api/tax/slabs               Current year tax slabs (for display)
POST   /api/tax/export              Generate tax return summary PDF
```

### Tax Calculation Response
```typescript
{
  fiscalYear: "2025-26",
  totalIncome: number,
  incomeBreakdown: {
    salary: number,
    business: number,
    houseRent: number,
    agriculture: number,
    capitalGains: number,
    other: number
  },
  taxableIncome: number,
  exemptionAmount: number,        // 3,50,000 male / 4,00,000 female
  taxBeforeRebate: number,
  investmentRebate: number,
  taxAfterRebate: number,
  tdsAlreadyPaid: number,
  minimumTax: number,             // based on residence type
  finalTaxLiability: number,
  refundOrPayable: number,        // negative = refund
  slabBreakdown: [{
    slab: string,
    rate: number,
    income: number,
    tax: number
  }]
}
```

---

## Receipts (OCR)

```
POST   /api/receipts/upload         Upload receipt image/PDF
GET    /api/receipts                List receipts
GET    /api/receipts/:id            Receipt details + parsed data
POST   /api/receipts/:id/confirm    Confirm parsed data → create transaction
DELETE /api/receipts/:id            Delete receipt
GET    /api/receipts/:id/status     Poll OCR processing status (WebSocket preferred)
```

---

## DPS

```
GET    /api/dps                     List DPS accounts
POST   /api/dps                     Add DPS account
GET    /api/dps/:id                 DPS details + installment schedule
PUT    /api/dps/:id                 Update DPS
POST   /api/dps/:id/pay             Mark installment as paid
GET    /api/dps/upcoming            Upcoming installment dues
```

---

## Investments

```
GET    /api/investments             List investments
POST   /api/investments             Add investment
PUT    /api/investments/:id         Update (current price, etc.)
DELETE /api/investments/:id         Remove
GET    /api/investments/summary     Portfolio value, gain/loss
```

---

## Product Loans

```
GET    /api/product-loans           List all (lent + borrowed)
POST   /api/product-loans           Record new product loan
PUT    /api/product-loans/:id       Update
POST   /api/product-loans/:id/return Mark as returned
GET    /api/product-loans/overdue   Items past expected return date
```

---

## Household

```
GET    /api/household               Get current household info
POST   /api/household               Create household
PUT    /api/household               Update name/settings
GET    /api/household/members       List members with roles
POST   /api/household/invite        Send invitation email
DELETE /api/household/members/:userId Remove member
PUT    /api/household/members/:userId/role  Change role
POST   /api/household/join/:token   Accept invitation
DELETE /api/household/leave         Leave household
```

---

## Reports

```
GET    /api/reports                 List generated reports
POST   /api/reports/generate        Trigger report generation
GET    /api/reports/:id/download    Download PDF report
GET    /api/reports/:id/status      Check generation status
```

---

## Error Response Format

```typescript
{
  error: {
    code: string,        // machine-readable: "VALIDATION_ERROR", "NOT_FOUND"
    message: string,     // human-readable
    details?: object     // field-level errors for validation
  },
  statusCode: number
}
```

## Standard HTTP Status Codes

| Code | Usage |
|---|---|
| 200 | Success |
| 201 | Created |
| 204 | Deleted (no content) |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Forbidden (wrong role) |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 429 | Rate limited |
| 500 | Server error |
