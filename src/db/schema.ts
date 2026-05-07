import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "member"] }).notNull().default("member"),
  householdId: uuid("household_id"),
  taxArea: text("tax_area", {
    enum: ["dhaka_city_corp", "other_city_corp", "other"],
  })
    .notNull()
    .default("dhaka_city_corp"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Households ───────────────────────────────────────────────────────────────

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const householdMembers = pgTable(
  "household_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "member", "viewer"] })
      .notNull()
      .default("member"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqMember: unique("hm_user_household_unique").on(t.householdId, t.userId),
  }),
);

// ─── Accounts ─────────────────────────────────────────────────────────────────

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type", { enum: ["cash", "bank", "mfs", "card", "other"] }).notNull(),
  balance: numeric("balance", { precision: 15, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("BDT"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Categories ───────────────────────────────────────────────────────────────

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type", { enum: ["income", "expense", "transfer"] }).notNull(),
  icon: text("icon"),
  color: text("color"),
  isSystem: boolean("is_system").notNull().default(false),
});

// ─── Transactions ─────────────────────────────────────────────────────────────

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  type: text("type", { enum: ["income", "expense", "transfer"] }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  date: date("date").notNull(),
  note: text("note"),
  receiptUrl: text("receipt_url"),
  taxable: boolean("taxable").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Loans (money borrowed / lent) ────────────────────────────────────────────

export const loans = pgTable("loans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  /** "taken" = you borrowed money; "given" = you lent money */
  direction: text("direction", { enum: ["taken", "given"] }).notNull(),
  personName: text("person_name").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  interestRate: numeric("interest_rate", { precision: 5, scale: 2 }),
  startDate: date("start_date").notNull(),
  dueDate: date("due_date"),
  emi: numeric("emi", { precision: 15, scale: 2 }),
  paidAmount: numeric("paid_amount", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  status: text("status", { enum: ["active", "paid", "overdue"] })
    .notNull()
    .default("active"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── DPS Accounts ─────────────────────────────────────────────────────────────

export const dpsAccounts = pgTable("dps_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number"),
  monthlyAmount: numeric("monthly_amount", { precision: 15, scale: 2 }).notNull(),
  interestRate: numeric("interest_rate", { precision: 5, scale: 2 }).notNull(),
  tenureMonths: integer("tenure_months").notNull(),
  startDate: date("start_date").notNull(),
  maturityDate: date("maturity_date").notNull(),
  totalDeposited: numeric("total_deposited", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  maturityAmount: numeric("maturity_amount", { precision: 15, scale: 2 }),
  status: text("status", { enum: ["active", "matured", "closed"] })
    .notNull()
    .default("active"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Investments ──────────────────────────────────────────────────────────────

export const investments = pgTable("investments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: [
      "stock",
      "mutual_fund",
      "bond",
      "sanchayapatra",
      "gold",
      "crypto",
      "fd",
      "other",
    ],
  }).notNull(),
  name: text("name").notNull(),
  investedAmount: numeric("invested_amount", { precision: 15, scale: 2 }).notNull(),
  currentValue: numeric("current_value", { precision: 15, scale: 2 }).notNull(),
  units: numeric("units", { precision: 15, scale: 6 }),
  purchaseDate: date("purchase_date").notNull(),
  maturityDate: date("maturity_date"),
  interestRate: numeric("interest_rate", { precision: 5, scale: 2 }),
  brokerName: text("broker_name"),
  isTaxRebateEligible: boolean("is_tax_rebate_eligible").notNull().default(false),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Assets ───────────────────────────────────────────────────────────────────

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["real_estate", "vehicle", "gold", "electronics", "other"],
  }).notNull(),
  name: text("name").notNull(),
  purchasePrice: numeric("purchase_price", { precision: 15, scale: 2 }).notNull(),
  currentValue: numeric("current_value", { precision: 15, scale: 2 }).notNull(),
  purchaseDate: date("purchase_date").notNull(),
  depreciationMethod: text("depreciation_method", {
    enum: ["none", "straight_line", "declining_balance"],
  })
    .notNull()
    .default("none"),
  depreciationRate: numeric("depreciation_rate", { precision: 5, scale: 2 }),
  location: text("location"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Budgets ──────────────────────────────────────────────────────────────────

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "cascade",
    }),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqBudget: unique("budgets_user_category_month_unique").on(
      t.userId,
      t.categoryId,
      t.month,
      t.year,
    ),
  }),
);

// ─── Goals ────────────────────────────────────────────────────────────────────

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetAmount: numeric("target_amount", { precision: 15, scale: 2 }).notNull(),
  currentAmount: numeric("current_amount", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  targetDate: date("target_date"),
  icon: text("icon"),
  status: text("status", { enum: ["active", "completed", "abandoned"] })
    .notNull()
    .default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Tax Configurations ───────────────────────────────────────────────────────

export const taxConfigs = pgTable("tax_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  fiscalYear: text("fiscal_year").notNull().unique(),
  /** Array of { limit: number | null, rate: number } — null limit = rest */
  slabs: jsonb("slabs").notNull(),
  rebateRate: numeric("rebate_rate", { precision: 5, scale: 2 }).notNull(),
  rebateInvestmentCap: numeric("rebate_investment_cap", { precision: 15, scale: 2 }).notNull(),
  rebateIncomePercent: numeric("rebate_income_percent", { precision: 5, scale: 2 }).notNull(),
  minTaxDhaka: numeric("min_tax_dhaka", { precision: 15, scale: 2 })
    .notNull()
    .default("5000"),
  minTaxCityCorpOther: numeric("min_tax_city_corp_other", { precision: 15, scale: 2 })
    .notNull()
    .default("4000"),
  minTaxOther: numeric("min_tax_other", { precision: 15, scale: 2 })
    .notNull()
    .default("3000"),
  taxFreeThreshold: numeric("tax_free_threshold", { precision: 15, scale: 2 })
    .notNull()
    .default("350000"),
  /** Instruments eligible for rebate with per-instrument limits */
  rebateInstruments: jsonb("rebate_instruments").notNull(),
  sanchayapatraThreshold: numeric("sanchayapatra_threshold", { precision: 15, scale: 2 })
    .notNull()
    .default("500000"),
  sanchayapatraTdsRate: numeric("sanchayapatra_tds_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("10"),
  isCurrent: boolean("is_current").notNull().default(false),
  /** Raw NBR circular / gazette text for AI re-parsing */
  rawSource: text("raw_source"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Net Worth Snapshots ──────────────────────────────────────────────────────

export const netWorthSnapshots = pgTable(
  "net_worth_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    totalAssets: numeric("total_assets", { precision: 15, scale: 2 }).notNull(),
    totalLiabilities: numeric("total_liabilities", {
      precision: 15,
      scale: 2,
    }).notNull(),
    netWorth: numeric("net_worth", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqSnapshot: unique("nws_user_month_year_unique").on(t.userId, t.month, t.year),
  }),
);

// ─── Receipt OCR Jobs ─────────────────────────────────────────────────────────

export const receiptJobs = pgTable("receipt_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fileUrl: text("file_url").notNull(),
  status: text("status", {
    enum: ["pending", "processing", "done", "failed"],
  })
    .notNull()
    .default("pending"),
  /** Parsed transaction data returned by AI */
  result: jsonb("result"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Item Loans (physical items borrowed / lent) ──────────────────────────────

export const itemLoans = pgTable("item_loans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  itemName: text("item_name").notNull(),
  personName: text("person_name").notNull(),
  direction: text("direction", { enum: ["lent", "borrowed"] }).notNull(),
  date: date("date").notNull(),
  expectedReturnDate: date("expected_return_date"),
  returnedAt: timestamp("returned_at"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  household: one(households, {
    fields: [users.householdId],
    references: [households.id],
  }),
  householdMemberships: many(householdMembers),
  accounts: many(accounts),
  categories: many(categories),
  transactions: many(transactions),
  loans: many(loans),
  dpsAccounts: many(dpsAccounts),
  investments: many(investments),
  assets: many(assets),
  budgets: many(budgets),
  goals: many(goals),
  netWorthSnapshots: many(netWorthSnapshots),
  receiptJobs: many(receiptJobs),
  itemLoans: many(itemLoans),
}));

export const householdsRelations = relations(households, ({ many }) => ({
  members: many(householdMembers),
}));

export const householdMembersRelations = relations(householdMembers, ({ one }) => ({
  household: one(households, {
    fields: [householdMembers.householdId],
    references: [households.id],
  }),
  user: one(users, {
    fields: [householdMembers.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
  transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));
