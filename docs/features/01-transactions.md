# Feature: Transaction Management

## Overview

The transaction system is the core of the app. Every financial event — spending, earning, borrowing, lending, transfers — is a transaction. The system is flexible enough to handle all types while maintaining simplicity for the user.

---

## Transaction Types

| Type | Description | Example |
|---|---|---|
| `INCOME` | Money received | Salary, freelance payment, gift |
| `EXPENSE` | Money spent | Grocery, rent, restaurant |
| `TRANSFER` | Between own accounts | bKash to bank, cash to savings |
| `DEBT_GIVEN` | Money lent to someone | Lent ৳5,000 to Rahim |
| `DEBT_TAKEN` | Money borrowed from someone | Borrowed ৳10,000 from father |
| `DEBT_PAYMENT` | Paying back a debt | Repaid ৳2,000 to Karim |
| `DPS_DEPOSIT` | Monthly DPS installment | ৳3,000 to BRAC Bank DPS |
| `INVESTMENT_BUY` | Buying an investment | Bought 100 shares of BEXIMCO |
| `INVESTMENT_SELL` | Selling an investment | Sold 50 shares |

---

## UI: Transaction Entry Form

### Quick Entry (Mobile-optimized)
```
┌─────────────────────────────────────────┐
│  💸 Add Transaction                     │
│                                         │
│  [Expense] [Income] [Transfer] [Debt]   │  ← Tab switcher
│                                         │
│  Amount                                 │
│  ┌─────────────────────────────────────┐│
│  │ ৳ 0.00                              ││  ← Large number input
│  └─────────────────────────────────────┘│
│                                         │
│  Category    [🍔 Food & Dining      ▼]  │
│  Account     [🏦 DBBL Savings       ▼]  │
│  Date        [Today, 7 May 2026     ]   │
│  Description [Optional note...      ]   │
│                                         │
│  [📷 Add Receipt]  [🏷️ Tags]           │
│                                         │
│  [          Save Transaction          ] │
└─────────────────────────────────────────┘
```

### Full Entry (Advanced mode)
- All quick entry fields
- Split expense across multiple categories
- Mark as shared with household
- Link to existing debt record
- Add items (for itemized receipts)
- Set as recurring (daily/weekly/monthly/yearly)

---

## Transaction List View

### Filters
- Date range (presets: Today, This Week, This Month, This Year, Custom)
- Type (Expense, Income, All, etc.)
- Category (multi-select)
- Account (multi-select)
- Amount range
- Tags
- Search (description text)
- Visibility (My transactions, Household shared)

### Display
```
May 2026                          Total: -৳45,230

7 May ─────────────────────────────────────────
  🍔 Food & Dining                    -৳850
     Lunch at Fakruddin
     [Cash] · [food, lunch]

  🚌 Transport                        -৳120
     Uber to office
     [bKash] · [transport]

6 May ─────────────────────────────────────────
  💰 Salary                         +৳85,000
     April salary
     [DBBL Bank] · [income, salary]
  ...
```

---

## Recurring Transactions

Recurring transactions are templates that auto-generate on schedule:

| Schedule | Use Case |
|---|---|
| Monthly (on 1st) | Salary, house rent, DPS |
| Monthly (on 5th) | Loan EMI |
| Weekly | Weekly allowance |
| Yearly | Insurance premium, domain renewal |

Worker runs daily at midnight Bangladesh time (UTC+6) to check and create due recurring transactions. User receives push notification when auto-created.

---

## Bulk Import (CSV)

Users can import historical data via CSV:

```csv
date,type,amount,category,account,description,tags
2026-01-01,expense,850,Food & Dining,Cash,Lunch at Fakruddin,"food,lunch"
2026-01-01,income,85000,Salary,DBBL Bank,January salary,"income,salary"
```

- Preview screen before import
- Duplicate detection (same date + amount + description)
- Category auto-mapping
- Error row highlighting

---

## Business Rules

1. **Account balance:** Automatically updated on every transaction save/edit/delete
2. **Shared visibility:** Only EDITOR and above can create shared transactions
3. **Delete restriction:** Transactions linked to settled debts cannot be deleted
4. **Currency:** Always stored in BDT (multi-currency display planned for Phase 4)
5. **Future transactions:** Allowed (for scheduled payments), flagged in UI
6. **Edit audit:** `updatedAt` timestamp tracked; full audit log planned for Phase 4

---

## Category System

### Default System Categories (pre-seeded)

**Expense Categories:**
- 🏠 Housing (Rent, Utilities, Maintenance)
- 🍔 Food & Dining (Groceries, Restaurant, Delivery)
- 🚌 Transport (Fuel, Uber, Bus, CNG, Train)
- 👗 Shopping (Clothes, Electronics, Household items)
- 🏥 Health (Doctor, Medicine, Hospital)
- 📚 Education (Tuition, Books, Courses)
- 🎬 Entertainment (Movies, Games, Subscriptions)
- 📡 Bills (Mobile, Internet, Electricity)
- 💆 Personal Care (Salon, Gym)
- 🕌 Religious (Zakat, Sadaqah, Mosque donation)
- 🎁 Gifts & Donations
- ✈️ Travel (Hotels, Flights, Tours)
- 🔧 Miscellaneous

**Income Categories:**
- 💼 Salary
- 💻 Freelance / Business
- 🏢 House Rent Income
- 📈 Investment Returns
- 🎁 Gifts Received
- 🌾 Agriculture Income
- 🏦 Interest Income
- 🔄 Refunds

Users can create sub-categories or custom top-level categories.
