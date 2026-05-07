# Feature: Budget & Goals

## Overview

Budget tracks spending limits by category. Goals track savings targets with deadlines. Both work at personal and household levels, with alerts when limits are approached.

---

## Budget

### Budget Period Types

| Period | Auto-reset | Use Case |
|---|---|---|
| Monthly | Yes, on 1st | General monthly budgeting |
| Quarterly | Yes, every 3 months | Seasonal spending |
| Yearly | Yes, on July 1 (BD FY) | Annual planning |
| Custom | No (fixed dates) | Special occasion, Eid, vacation |

### Creating a Monthly Budget

```
┌────────────────────────────────────────┐
│  Create Budget — May 2026              │
│                                        │
│  Budget Name    [May 2026 Budget]      │
│  Period         [Monthly ▼]            │
│  Total Amount   [৳60,000]             │
│                                        │
│  Category Allocations                  │
│  ┌──────────────────────────────────┐  │
│  │ 🍔 Food & Dining    [৳10,000]  │  │
│  │ 🏠 Housing          [৳20,000]  │  │
│  │ 🚌 Transport        [৳5,000]   │  │
│  │ 👗 Shopping         [৳8,000]   │  │
│  │ 📡 Bills            [৳5,000]   │  │
│  │ 📚 Education        [৳7,000]   │  │
│  │ 🔧 Other            [৳5,000]   │  │
│  │ [+ Add Category]               │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Allocated: ৳60,000 / ৳60,000 ✅      │
│                                        │
│  Alert at:  [80%] of each category    │
│                                        │
│  [Save Budget]                         │
└────────────────────────────────────────┘
```

### Budget Progress View

```
May 2026 Budget               ████████░░  22 days remaining

Overall: ৳32,450 / ৳60,000 (54%)

Category Breakdown:
─────────────────────────────────────────────────────────
🍔 Food & Dining
   ████████░░░░ ৳8,500 / ৳10,000  85%  ⚠️ Alert sent

🏠 Housing
   ██████████ ৳20,000 / ৳20,000  100% ✅ Fully spent

🚌 Transport
   ████░░░░░░ ৳2,000 / ৳5,000    40%  ✅ On track

👗 Shopping
   ██████████████░ ৳11,200 / ৳8,000 140% 🔴 Over!

📡 Bills
   ██████████ ৳5,000 / ৳5,000   100% ✅ Paid

📚 Education
   ██████████ ৳7,000 / ৳7,000   100% ✅ Paid

🔧 Other
   ██░░░░░░░░ ৳1,250 / ৳5,000    25%  ✅ Under budget
─────────────────────────────────────────────────────────
Unallocated remaining: ৳0
```

### Budget Alerts

Alerts fire when a category reaches the threshold (default 80%):

| Alert Type | Trigger | Channel |
|---|---|---|
| Warning | Spending reaches 80% of category budget | Push notification + in-app |
| Exceeded | Spending goes over 100% | Push notification + email |
| On track digest | Weekly Sunday summary | Email (optional) |

Alert example:
```
⚠️ Budget Alert
Your Food & Dining budget is 85% used with 22 days remaining.
Spent: ৳8,500 | Remaining: ৳1,500
```

---

## Goals

### Goal Types

| Goal | Description |
|---|---|
| **Savings Target** | Save a fixed amount by a date |
| **Emergency Fund** | Build 3-6 months of expenses |
| **Purchase** | Save for a specific item (phone, car, etc.) |
| **Debt Payoff** | Pay off a debt by a target date |
| **Investment** | Accumulate investment amount |
| **Education Fund** | Education-specific savings |

### Creating a Goal

```
┌────────────────────────────────────────┐
│  Create Goal                           │
│                                        │
│  Goal Name    [House Down Payment]     │
│  Type         [Savings Target ▼]      │
│  Icon/Color   [🏠] [Blue ▼]           │
│                                        │
│  Target Amount  [৳10,00,000]         │
│  Deadline       [December 2027]        │
│                                        │
│  Link to Account                       │
│  [DBBL Savings ▼]  (track balance)    │
│                                        │
│  Share with household  [☑]            │
│                                        │
│  [Save Goal]                           │
└────────────────────────────────────────┘
```

### Goal Progress View

```
🏠 House Down Payment
Target: ৳10,00,000 by December 2027

████████░░░░░░░░░░░░  55%
৳5,50,000 of ৳10,00,000

Current Pace:    ৳52,550/month average savings
Required Pace:   ৳47,619/month to reach goal
Status:          ✅ Ahead of schedule!
Time Remaining:  19 months
Projected Date:  October 2027 (2 months early!)

Contribution History:
May 2026    +৳52,550    Auto-detected from savings
Apr 2026    +৳48,000    Manual contribution
Mar 2026    +৳55,000    Auto-detected from savings
```

### Goal Contributions

Two ways to track progress:

1. **Manual:** User explicitly marks an amount as contributed to goal
2. **Auto-detect:** App calculates monthly net savings and suggests allocating surplus to active goals

### Goal Achievement

When a goal is reached:
- Confetti animation 🎉
- Achievement notification: "Congratulations! You've reached your 'House Down Payment' goal!"
- Email celebration message
- Goal marked as ACHIEVED, kept in history

---

## Budget vs Goals — Key Difference

| Budget | Goals |
|---|---|
| Controls **spending** (limits) | Tracks **saving** progress |
| Resets each period | Accumulates over time |
| Per category | Per purpose/dream |
| Alert when too much spent | Alert when milestone reached |
| Example: "Don't spend more than ৳10k on food" | Example: "Save ৳10 lakh for house" |
