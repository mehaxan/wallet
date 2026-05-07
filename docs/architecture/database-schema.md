# Database Schema

**ORM:** Drizzle ORM (same as fundy)  
**Driver:** postgres  
**Convention:** `numeric(15,2)` for all monetary values (not `doublePrecision` — financial precision matters)

---

## Full Schema (`src/db/schema.ts`)

```typescript
import {
  pgTable, uuid, text, integer, boolean,
  timestamp, pgEnum, jsonb, numeric, date,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const txnTypeEnum = pgEnum("txn_type", [
  "income", "expense", "transfer",
  "borrow", "lend", "debt_payment", "loan_payment",
  "dps_deposit", "investment", "dividend", "asset_purchase",
]);

export const visibilityEnum = pgEnum("visibility", ["private", "household"]);
export const accountTypeEnum = pgEnum("account_type", [
  "cash", "bank", "bkash", "nagad", "rocket", "card", "savings", "other",
]);
export const loanTypeEnum = pgEnum("loan_type", ["borrowed", "lent"]);
export const loanStatusEnum = pgEnum("loan_status", ["active", "partially_paid", "settled"]);
export const dpsStatusEnum = pgEnum("dps_status", ["active", "matured", "broken", "completed"]);
export const investmentTypeEnum = pgEnum("investment_type", [
  "sanchayapatra", "dse_stock", "cse_stock", "fdr", "mutual_fund",
  "real_estate", "gold", "crypto", "other",
]);
export const assetTypeEnum = pgEnum("asset_type", [
  "real_estate", "vehicle", "gold", "electronics", "business", "other",
]);
export const goalStatusEnum = pgEnum("goal_status", ["active", "achieved", "abandoned"]);
export const budgetPeriodEnum = pgEnum("budget_period", ["monthly", "yearly"]);
export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "member"]);

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id:            uuid("id").primaryKey().defaultRandom(),
  name:          text("name").notNull(),
  email:         text("email").notNull().unique(),
  passwordHash:  text("password_hash").notNull(),
  phone:         text("phone"),
  isActive:      boolean("is_active").notNull().default(true),
  residency:     text("residency", { enum: ["dhaka", "other_city", "other"] }).notNull().default("dhaka"),
  householdId:   uuid("household_id").references(() => households.id),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

// ─── Households (family sharing) ─────────────────────────────────────────────

export const households = pgTable("households", {
  id:         uuid("id").primaryKey().defaultRandom(),
  name:       text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdBy:  uuid("created_by").notNull(),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

export const householdMembers = pgTable("household_members", {
  id:          uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").notNull().references(() => households.id),
  userId:      uuid("user_id").notNull().references(() => users.id),
  role:        memberRoleEnum("role").notNull().default("member"),
  joinedAt:    timestamp("joined_at").notNull().defaultNow(),
});

// ─── Accounts (cash, bank, bKash, etc.) ──────────────────────────────────────

export const accounts = pgTable("accounts", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      uuid("user_id").notNull().references(() => users.id),
  name:        text("name").notNull(),          // "DBBL Savings", "bKash", "Cash"
  type:        accountTypeEnum("type").notNull(),
  balance:     numeric("balance", { precision: 15, scale: 2 }).notNull().default("0"),
  currency:    text("currency").notNull().default("BDT"),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ─── Transactions ─────────────────────────────────────────────────────────────

export const transactions = pgTable("transactions", {
  id:            uuid("id").primaryKey().defaultRandom(),
  userId:        uuid("user_id").notNull().references(() => users.id),
  accountId:     uuid("account_id").references(() => accounts.id),
  type:          txnTypeEnum("type").notNull(),
  amount:        numeric("amount", { precision: 15, scale: 2 }).notNull(),
  direction:     text("direction", { enum: ["credit", "debit"] }).notNull(),
  description:   text("description").notNull(),
  category:      text("category"),               // "food", "transport", "salary", etc.
  tags:          text("tags").array(),
  date:          date("date").notNull(),
  visibility:    visibilityEnum("visibility").notNull().default("private"),
  receiptUrl:    text("receipt_url"),
  referenceId:   text("reference_id"),           // links to loan/dps/investment id
  isRecurring:   boolean("is_recurring").notNull().default(false),
  recurringRule: jsonb("recurring_rule"),         // { frequency: "monthly", day: 5 }
  isTdsDeducted: boolean("is_tds_deducted").notNull().default(false),
  tdsAmount:     numeric("tds_amount", { precision: 15, scale: 2 }),
  deletedAt:     timestamp("deleted_at"),         // soft delete
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

// ─── Loans (borrow & lend) ────────────────────────────────────────────────────

export const loans = pgTable("loans", {
  id:               uuid("id").primaryKey().defaultRandom(),
  userId:           uuid("user_id").notNull().references(() => users.id),
  type:             loanTypeEnum("type").notNull(),   // "borrowed" | "lent"
  personName:       text("person_name").notNull(),
  principalAmount:  numeric("principal_amount", { precision: 15, scale: 2 }).notNull(),
  interestRate:     numeric("interest_rate", { precision: 5, scale: 2 }),  // annual %
  paidAmount:       numeric("paid_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  startDate:        date("start_date").notNull(),
  dueDate:          date("due_date"),
  status:           loanStatusEnum("status").notNull().default("active"),
  notes:            text("notes"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

// ─── DPS (Deposit Pension Scheme) ─────────────────────────────────────────────

export const dpsAccounts = pgTable("dps_accounts", {
  id:               uuid("id").primaryKey().defaultRandom(),
  userId:           uuid("user_id").notNull().references(() => users.id),
  bankName:         text("bank_name").notNull(),
  accountNumber:    text("account_number"),
  monthlyDeposit:   numeric("monthly_deposit", { precision: 15, scale: 2 }).notNull(),
  interestRate:     numeric("interest_rate", { precision: 5, scale: 2 }).notNull(),
  tenureMonths:     integer("tenure_months").notNull(),
  startDate:        date("start_date").notNull(),
  maturityDate:     date("maturity_date").notNull(),
  maturityAmount:   numeric("maturity_amount", { precision: 15, scale: 2 }),  // calculated
  totalDeposited:   numeric("total_deposited", { precision: 15, scale: 2 }).notNull().default("0"),
  status:           dpsStatusEnum("status").notNull().default("active"),
  notes:            text("notes"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

// ─── Investments ─────────────────────────────────────────────────────────────

export const investments = pgTable("investments", {
  id:               uuid("id").primaryKey().defaultRandom(),
  userId:           uuid("user_id").notNull().references(() => users.id),
  type:             investmentTypeEnum("type").notNull(),
  name:             text("name").notNull(),           // "Sanchayapatra 5yr", "Square Pharma"
  investedAmount:   numeric("invested_amount", { precision: 15, scale: 2 }).notNull(),
  currentValue:     numeric("current_value", { precision: 15, scale: 2 }),
  units:            numeric("units", { precision: 15, scale: 4 }),    // shares/units
  purchasePrice:    numeric("purchase_price", { precision: 15, scale: 2 }), // per unit
  expectedReturn:   numeric("expected_return", { precision: 5, scale: 2 }), // annual %
  maturityDate:     date("maturity_date"),
  startDate:        date("start_date").notNull(),
  status:           text("status", { enum: ["active", "sold", "matured"] }).notNull().default("active"),
  isRebateEligible: boolean("is_rebate_eligible").notNull().default(true),
  notes:            text("notes"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

// ─── Assets ───────────────────────────────────────────────────────────────────

export const assets = pgTable("assets", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  userId:              uuid("user_id").notNull().references(() => users.id),
  type:                assetTypeEnum("type").notNull(),
  name:                text("name").notNull(),          // "Apartment - Mirpur", "Toyota Axio"
  purchaseValue:       numeric("purchase_value", { precision: 15, scale: 2 }).notNull(),
  currentValue:        numeric("current_value", { precision: 15, scale: 2 }).notNull(),
  purchaseDate:        date("purchase_date").notNull(),
  depreciationRate:    numeric("depreciation_rate", { precision: 5, scale: 2 }), // annual %
  depreciationMethod:  text("depreciation_method", { enum: ["straight_line", "declining", "none"] }).default("none"),
  quantity:            numeric("quantity", { precision: 10, scale: 3 }).default("1"), // for gold: grams
  unit:                text("unit"),           // "gram", "sqft", "piece"
  location:            text("location"),
  notes:               text("notes"),
  status:              text("status", { enum: ["active", "sold", "disposed"] }).notNull().default("active"),
  createdAt:           timestamp("created_at").notNull().defaultNow(),
});

// ─── Budget ───────────────────────────────────────────────────────────────────

export const budgets = pgTable("budgets", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    uuid("user_id").notNull().references(() => users.id),
  category:  text("category").notNull(),
  limit:     numeric("limit", { precision: 15, scale: 2 }).notNull(),
  period:    budgetPeriodEnum("period").notNull().default("monthly"),
  year:      integer("year").notNull(),
  month:     integer("month"),                 // null for yearly budgets
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Goals ────────────────────────────────────────────────────────────────────

export const goals = pgTable("goals", {
  id:            uuid("id").primaryKey().defaultRandom(),
  userId:        uuid("user_id").notNull().references(() => users.id),
  name:          text("name").notNull(),
  targetAmount:  numeric("target_amount", { precision: 15, scale: 2 }).notNull(),
  savedAmount:   numeric("saved_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  targetDate:    date("target_date"),
  status:        goalStatusEnum("status").notNull().default("active"),
  notes:         text("notes"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

// ─── Tax Configuration (configurable, not hardcoded) ─────────────────────────

export const taxConfigs = pgTable("tax_configs", {
  id:           uuid("id").primaryKey().defaultRandom(),
  fiscalYear:   text("fiscal_year").notNull().unique(),  // "2024-25"
  isCurrent:    boolean("is_current").notNull().default(false),
  config:       jsonb("config").notNull(),               // full tax rule JSON
  updatedVia:   text("updated_via", { enum: ["manual", "ai"] }).notNull().default("manual"),
  rawSource:    text("raw_source"),                      // pasted NBR text (for AI updates)
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

// ─── Net Worth Snapshots (monthly, for projections) ───────────────────────────

export const netWorthSnapshots = pgTable("net_worth_snapshots", {
  id:               uuid("id").primaryKey().defaultRandom(),
  userId:           uuid("user_id").notNull().references(() => users.id),
  year:             integer("year").notNull(),
  month:            integer("month").notNull(),
  totalAssets:      numeric("total_assets", { precision: 15, scale: 2 }).notNull(),
  totalLiabilities: numeric("total_liabilities", { precision: 15, scale: 2 }).notNull(),
  netWorth:         numeric("net_worth", { precision: 15, scale: 2 }).notNull(),
  breakdown:        jsonb("breakdown"),   // { accounts, investments, assets, loans }
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

// ─── Receipt OCR Queue ────────────────────────────────────────────────────────

export const receiptJobs = pgTable("receipt_jobs", {
  id:              uuid("id").primaryKey().defaultRandom(),
  userId:          uuid("user_id").notNull().references(() => users.id),
  fileUrl:         text("file_url").notNull(),
  status:          text("status", { enum: ["pending", "processing", "done", "failed"] }).notNull().default("pending"),
  extractedData:   jsonb("extracted_data"),    // parsed transaction fields
  transactionId:   uuid("transaction_id").references(() => transactions.id),
  error:           text("error"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});
```

---

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Money type | `numeric(15,2)` | Exact decimal — no floating point errors in tax |
| Timestamps | `timestamp` | Full datetime for audit trail |
| Dates | `date` | Date-only fields (DPS maturity, loan due date) |
| IDs | `uuid().defaultRandom()` | Same as fundy |
| Soft delete | `deletedAt` on transactions | Never lose financial records |
| Tax rules | JSONB in `tax_configs` | Flexible + AI-updatable without schema changes |
| Enums | `pgEnum` | Same as fundy pattern |

## Scripts (same as fundy)

```bash
pnpm db:generate    # drizzle-kit generate → creates SQL migration files in /drizzle
pnpm db:migrate     # drizzle-kit migrate  → applies migrations to database
pnpm db:studio      # drizzle-kit studio   → browser-based DB explorer on localhost
```
