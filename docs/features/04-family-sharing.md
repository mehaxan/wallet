# Feature: Family Sharing (Household)

## Overview

A household is a shared financial space where family members can collaborate — see shared expenses, split bills, track joint budgets and goals. Each user has one household. Data privacy is preserved with visibility controls.

---

## Household Model

```
Household "Hasan Family"
├── Owner: Hasan (full control)
├── Admin: Fatema (wife — can invite, manage)
├── Editor: Rafi (son — can add transactions)
└── Viewer: Grandma (read-only shared view)
```

---

## Setup Flow

### Creating a Household

```
1. Go to Settings → Household
2. Click "Create Household"
3. Enter household name (e.g., "Hasan Family")
4. Household created — you are the Owner
5. Invite family members via email
```

### Joining via Invitation

```
1. Owner/Admin sends invite → member's email
2. Email received: "Hasan invited you to join Hasan Family"
3. Recipient clicks link → redirected to wallet.mehaxan.com/join/{token}
4. If no account: prompted to register
5. If existing account: auto-joins household with specified role
6. Invite link expires after 7 days
```

---

## Role Permissions Matrix

| Permission | Owner | Admin | Editor | Viewer |
|---|---|---|---|---|
| View own private transactions | ✅ | ✅ | ✅ | ✅ |
| View shared household transactions | ✅ | ✅ | ✅ | ✅ |
| Create shared transactions | ✅ | ✅ | ✅ | ❌ |
| Edit own transactions | ✅ | ✅ | ✅ | ❌ |
| Edit any household transaction | ✅ | ✅ | ❌ | ❌ |
| Delete transactions | ✅ | ✅ | Own only | ❌ |
| Manage budget | ✅ | ✅ | View only | View only |
| Manage goals | ✅ | ✅ | Contribute | View only |
| Invite members | ✅ | ✅ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ |
| Change roles | ✅ | ❌ | ❌ | ❌ |
| View tax calculator | ✅ | Own | Own | ❌ |
| Delete household | ✅ | ❌ | ❌ | ❌ |

---

## Transaction Visibility

Every transaction has a `visibility` field:

| Visibility | Who Can See |
|---|---|
| `PRIVATE` | Only the transaction creator |
| `HOUSEHOLD` | All household members (based on role) |

Users can toggle visibility when creating a transaction. Default visibility is configurable in settings (default: PRIVATE).

### Household Feed

A combined household timeline showing all shared transactions from all members:

```
Household Transactions — May 2026

7 May ─────────────────────────────────────────────
  Fatema · 🍔 Food          -৳2,500  [Shared]
  Eid dinner groceries

  Hasan  · 🚗 Transport     -৳850    [Shared]
  Fuel for family trip

6 May ─────────────────────────────────────────────
  Rafi   · 📚 Education     -৳5,000  [Shared]
  Monthly tuition fee
```

---

## Shared Budgets & Goals

### Household Budget
- Created by Owner/Admin
- Tracks combined household spending vs allocated budget
- Each category shows total from all members' shared transactions

### Joint Goals
- "Family Vacation Fund" — all members can contribute
- Progress visible to all household members
- Contributions tracked per member

---

## Real-time Sync

When any household member creates/updates/deletes a shared transaction:
1. Socket.io broadcasts event to all connected household members
2. All open dashboards update in real-time
3. Push notification sent if app is in background

```
Fatema adds a grocery expense →
Hasan's dashboard (open on laptop) auto-refreshes →
Shows updated total expenses for today
```

---

## Privacy Controls

- **Tax data** is always private — family members never see each other's tax profiles or personal income
- **Private transactions** are completely invisible to other members
- **Product loans** are private by default (borrowing/lending of physical items)
- **Debt records** are private by default

---

## Leaving / Removing Members

- **Member leaves:** Their private transactions remain theirs; shared transactions remain in household
- **Owner removes member:** Same as above
- **Owner deletes household:** All members notified; shared transactions archived; each member keeps their own transactions

---

## Household Switching (Future)

Currently one household per user. Future enhancement: support for multiple households (e.g., business + personal). Not in Phase 1-3 scope.
