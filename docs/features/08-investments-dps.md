# Feature: Investments & DPS Tracking

## Overview

Comprehensive tracking for all financial instruments available in Bangladesh — DPS, FDR, Sanchayapatra, stock market (DSE/CSE), mutual funds, and other investments.

---

## DPS (Deposit Pension Scheme)

### What is DPS?
A monthly recurring deposit scheme offered by banks. You deposit a fixed amount every month for a fixed tenure (1-10 years) and receive the principal + interest at maturity.

### DPS Tracking

```
DPS Accounts

┌────────────────────────────────────────────────────────────┐
│  BRAC Bank DPS                                   ACTIVE    │
│  Monthly Deposit: ৳3,000 | Tenure: 3 years               │
│  Interest Rate: 7.50% | Started: Jan 2024                 │
│  Maturity: January 2027 | Maturity Amount: ৳1,19,700      │
│                                                            │
│  Progress: ████████████░░░░░░ 17/36 installments          │
│  Paid: ৳51,000 | Maturity Value: ৳1,19,700               │
│  Effective Return: ৳68,700 (134.7% of invested)          │
│                                                            │
│  Next Installment: 1 June 2026 — ৳3,000                  │
│  [Mark as Paid]  [View Schedule]                          │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Dutch-Bangla Bank DPS                           ACTIVE    │
│  Monthly Deposit: ৳5,000 | Tenure: 5 years               │
│  Interest Rate: 8.00% | Started: Jul 2023                 │
│  Maturity: July 2028 | Maturity Amount: ৳3,67,600         │
│                                                            │
│  Progress: ████████░░░░░░░░░░░░ 22/60 installments        │
└────────────────────────────────────────────────────────────┘
```

### DPS Installment Schedule

```
BRAC Bank DPS — Full Schedule

No.  Due Date     Amount    Status      Transaction
──────────────────────────────────────────────────────
1    1 Jan 2024   ৳3,000   ✅ Paid     #txn-001
2    1 Feb 2024   ৳3,000   ✅ Paid     #txn-042
...
17   1 May 2026   ৳3,000   ✅ Paid     #txn-432
18   1 Jun 2026   ৳3,000   ⏰ Due      [Mark Paid]
19   1 Jul 2026   ৳3,000   📅 Upcoming
...
36   1 Jan 2027   ৳3,000   📅 Upcoming
```

### DPS Reminders

- Push notification 3 days before installment due date
- Email reminder on due date if not marked paid
- Dashboard "Upcoming" section shows next 30 days of DPS dues

### DPS Interest Calculation

```typescript
function calculateDPSMaturity(
  monthlyAmount: number,
  tenureMonths: number,
  annualRate: number
): number {
  // Bangladesh banks typically use simple interest on DPS
  const monthlyRate = annualRate / 12;
  const totalPrincipal = monthlyAmount * tenureMonths;
  
  // Interest on each installment: installment × rate × months remaining
  let totalInterest = 0;
  for (let month = 1; month <= tenureMonths; month++) {
    const monthsRemaining = tenureMonths - month + 1;
    totalInterest += monthlyAmount * monthlyRate * monthsRemaining;
  }
  
  return totalPrincipal + totalInterest;
}
```

---

## Sanchayapatra (National Savings Certificate)

Bangladesh government-backed savings instruments:

| Type | Duration | Current Rate |
|---|---|---|
| 3-Month Profit-Based Sanchayapatra | 3 months | ~11.04% |
| 5-Year Bangladesh Sanchayapatra | 5 years | ~11.28% |
| Pensioner Sanchayapatra | 5 years | ~11.76% (for 65+) |
| Paribar Sanchayapatra | 5 years | ~11.52% (for women/65+) |

Tracked as investments with:
- Purchase amount
- Purchase date
- Maturity date
- Quarterly/monthly interest tracking
- TDS deduction tracking (10% on interest above ৳5 lakh)

---

## FDR (Fixed Deposit Receipt)

```typescript
interface FDR {
  bankName: string;
  amount: number;
  startDate: Date;
  maturityDate: Date;
  interestRate: number;  // e.g., 0.065 = 6.5%
  interestPayment: 'at_maturity' | 'quarterly' | 'monthly';
  autoRenew: boolean;
  maturityAmount: number;
}
```

App calculates:
- Days to maturity
- Accrued interest to date
- Projected maturity value
- Alert 30 days before maturity (decision: renew or withdraw)

---

## Stock Market (DSE / CSE)

### Investment Recording

```
Add Investment

Type:       [DSE Stocks ▼]
Company:    [BRAC Bank Limited (BRACBANK)]
Quantity:   [100] shares
Buy Price:  [৳32.50] per share
Buy Date:   [1 May 2026]
Buy Cost:   ৳3,250 (auto-calculated)
Notes:      [Long-term hold]

[Save Investment]
```

### Portfolio View

```
Investment Portfolio

Total Value:    ৳1,45,000
Total Cost:     ৳1,20,000
Total Gain:     +৳25,000 (+20.8%)

────────────────────────────────────────────────────────────
DSE Stocks
  BRACBANK        100 shares   Cost: ৳3,250    Current: ৳4,200   +৳950 (+29.2%)
  GRAMEENPHONE    50 shares    Cost: ৳14,000   Current: ৳16,500  +৳2,500 (+17.9%)
  DUTCHBANGLA     30 shares    Cost: ৳12,000   Current: ৳11,700  -৳300 (-2.5%)

Mutual Funds
  AIBL 1st Islami   5000 units  Cost: ৳50,000  Current: ৳52,500  +৳2,500 (+5%)

Sanchayapatra
  5-Year Certificate  ৳1,00,000  Purchased: Jan 2024  Maturity: Jan 2029
  Accrued Interest: ৳25,280 (to date)
```

### Current Price Updates

**Challenge:** No free official DSE/CSE API exists.

**Solution options:**
1. **Manual update:** User taps a stock → enters current price → portfolio recalculates. Simple, reliable.
2. **DSE website scraping:** Scrape `dsebd.org` for prices (fragile, may break, legal gray area).
3. **Future:** Community-maintained price feed API.

**Phase 1-3:** Manual price updates with a clear "Last updated" timestamp.

---

## Investment Summary for Tax

Investments are auto-tagged for tax purposes:
- DPS installments → eligible for investment rebate (up to limit)
- Sanchayapatra interest → separate income source (with TDS)
- Life insurance premium → eligible for rebate
- Stock capital gains → may have reduced tax rate

All aggregated in the Tax Calculator automatically.
