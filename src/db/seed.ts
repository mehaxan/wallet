import { db } from "./index";
import { categories, taxConfigs } from "./schema";

const CATEGORIES = [
  // Income
  { name: "Salary", type: "income" as const, icon: "💼", color: "#10b981", isSystem: true },
  { name: "Freelance", type: "income" as const, icon: "💻", color: "#10b981", isSystem: true },
  { name: "Business", type: "income" as const, icon: "🏢", color: "#10b981", isSystem: true },
  { name: "Rental Income", type: "income" as const, icon: "🏠", color: "#10b981", isSystem: true },
  { name: "Investment Return", type: "income" as const, icon: "📈", color: "#10b981", isSystem: true },
  { name: "Gift", type: "income" as const, icon: "🎁", color: "#10b981", isSystem: true },
  { name: "Other Income", type: "income" as const, icon: "➕", color: "#10b981", isSystem: true },

  // Expense
  { name: "Food & Dining", type: "expense" as const, icon: "🍽️", color: "#ef4444", isSystem: true },
  { name: "Groceries", type: "expense" as const, icon: "🛒", color: "#ef4444", isSystem: true },
  { name: "Transport", type: "expense" as const, icon: "🚗", color: "#ef4444", isSystem: true },
  { name: "Utilities", type: "expense" as const, icon: "💡", color: "#ef4444", isSystem: true },
  { name: "Rent & Housing", type: "expense" as const, icon: "🏠", color: "#ef4444", isSystem: true },
  { name: "Healthcare", type: "expense" as const, icon: "🏥", color: "#ef4444", isSystem: true },
  { name: "Education", type: "expense" as const, icon: "📚", color: "#ef4444", isSystem: true },
  { name: "Shopping", type: "expense" as const, icon: "🛍️", color: "#ef4444", isSystem: true },
  { name: "Entertainment", type: "expense" as const, icon: "🎬", color: "#ef4444", isSystem: true },
  { name: "Mobile & Internet", type: "expense" as const, icon: "📱", color: "#ef4444", isSystem: true },
  { name: "Insurance", type: "expense" as const, icon: "🛡️", color: "#ef4444", isSystem: true },
  { name: "Tax Payment", type: "expense" as const, icon: "🧾", color: "#ef4444", isSystem: true },
  { name: "Other Expense", type: "expense" as const, icon: "➖", color: "#ef4444", isSystem: true },

  // Transfer
  { name: "Transfer", type: "transfer" as const, icon: "↔️", color: "#3b82f6", isSystem: true },
  { name: "Savings", type: "transfer" as const, icon: "💰", color: "#3b82f6", isSystem: true },
];

// FY 2024-25 BD tax config
const TAX_CONFIG_2024_25 = {
  fiscalYear: "2024-25",
  slabs: [
    { limit: 350000,  rate: 0  },
    { limit: 100000,  rate: 5  },
    { limit: 400000,  rate: 10 },
    { limit: 500000,  rate: 15 },
    { limit: 500000,  rate: 20 },
    { limit: null,    rate: 25 },
  ],
  rebateRate: "15",
  rebateInvestmentCap: "1000000",
  rebateIncomePercent: "25",
  minTaxDhaka: "5000",
  minTaxCityCorpOther: "4000",
  minTaxOther: "3000",
  taxFreeThreshold: "350000",
  rebateInstruments: [
    { name: "Life Insurance Premium",       limit: 100000 },
    { name: "DPS",                          limit: 120000 },
    { name: "Sanchayapatra / Bonds",        limit: null   },
    { name: "Provident Fund",               limit: null   },
    { name: "Mutual Fund / Stocks",         limit: 500000 },
    { name: "Real Estate / Construction",   limit: 1200000 },
  ],
  sanchayapatraThreshold: "500000",
  sanchayapatraTdsRate: "10",
  isCurrent: true,
};

async function seed() {
  console.log("Seeding categories…");
  await db.insert(categories).values(CATEGORIES).onConflictDoNothing();
  console.log(`  ✓ ${CATEGORIES.length} categories`);

  console.log("Seeding tax config FY 2024-25…");
  await db.insert(taxConfigs).values(TAX_CONFIG_2024_25).onConflictDoNothing();
  console.log("  ✓ Tax config inserted");

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
