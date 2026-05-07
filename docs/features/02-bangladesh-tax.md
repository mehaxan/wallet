# Bangladesh Income Tax Feature

## Overview

Real-time income tax calculation following NBR (National Board of Revenue) rules.
Tax rules are stored in the database — not hardcoded — so they can be updated
when the government changes rules, without any code changes.

---

## Tax Configuration Storage

Tax rules live in the `tax_config` table as JSONB, with one record per fiscal year.
This allows historical tax calculation and AI-powered rule updates.

```json
{
  "fiscal_year": "2024-25",
  "is_current": true,
  "config": {
    "minimum_tax": {
      "dhaka_city_corp": 5000,
      "other_city_corp": 4000,
      "other_areas": 3000
    },
    "female_senior_freedom_fighter_threshold": 400000,
    "regular_threshold": 350000,
    "slabs": [
      { "min": 0,      "max": 100000,  "rate": 0.05, "label": "First ৳1,00,000" },
      { "min": 100000, "max": 400000,  "rate": 0.10, "label": "Next ৳3,00,000" },
      { "min": 400000, "max": 700000,  "rate": 0.15, "label": "Next ৳3,00,000" },
      { "min": 700000, "max": 1100000, "rate": 0.20, "label": "Next ৳4,00,000" },
      { "min": 1100000,"max": 1600000, "rate": 0.25, "label": "Next ৳5,00,000" },
      { "min": 1600000,"max": null,    "rate": 0.30, "label": "Remainder" }
    ],
    "rebate": {
      "max_eligible_investment_percent": 0.25,
      "max_eligible_investment_cap": 1500000,
      "rebate_on_investment_rate": 0.15,
      "max_rebate_cap": 10000000
    },
    "tds_rates": {
      "sanchayapatra_interest": 0.10,
      "bank_interest": 0.10,
      "dividend": 0.10,
      "rental_income": 0.05
    },
    "eligible_investments": [
      { "code": "dps", "label": "DPS", "annual_cap": 120000 },
      { "code": "sanchayapatra", "label": "Sanchayapatra", "annual_cap": 5000000 },
      { "code": "life_insurance", "label": "Life Insurance Premium", "annual_cap": null },
      { "code": "provident_fund", "label": "Provident Fund", "annual_cap": null },
      { "code": "rrsp", "label": "Govt Approved Fund", "annual_cap": null }
    ]
  }
}
```

---

## Tax Calculation Algorithm

```typescript
function calculateBDTax(
  annualIncome: number,
  investments: Investment[],
  config: TaxConfig,
  residency: 'dhaka' | 'other_city' | 'other'
): TaxSummary {
  const { slabs, rebate, minimum_tax } = config;

  // Step 1: Gross income slabs
  let taxableIncome = annualIncome - config.regular_threshold;
  if (taxableIncome <= 0) return { taxableIncome: 0, grossTax: 0, rebate: 0, netTax: 0 };

  // Step 2: Slab-wise tax
  let grossTax = 0;
  let remaining = taxableIncome;
  const slabBreakdown = [];

  for (const slab of slabs) {
    if (remaining <= 0) break;
    const slabSize = slab.max ? slab.max - slab.min : remaining;
    const taxable = Math.min(remaining, slabSize);
    const tax = taxable * slab.rate;
    grossTax += tax;
    remaining -= taxable;
    slabBreakdown.push({ ...slab, taxable, tax });
  }

  // Step 3: Investment rebate
  const totalInvestments = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const maxEligible = Math.min(
    annualIncome * rebate.max_eligible_investment_percent,
    rebate.max_eligible_investment_cap
  );
  const eligibleInvestment = Math.min(totalInvestments, maxEligible);
  const investmentRebate = Math.min(
    eligibleInvestment * rebate.rebate_on_investment_rate,
    rebate.max_rebate_cap,
    grossTax  // rebate cannot exceed tax
  );

  // Step 4: Apply minimum tax
  const minTax = minimum_tax[residency === 'dhaka' ? 'dhaka_city_corp' 
                            : residency === 'other_city' ? 'other_city_corp' 
                            : 'other_areas'];
  const netTax = Math.max(grossTax - investmentRebate, minTax);

  return {
    annualIncome,
    taxableIncome,
    grossTax,
    rebate: investmentRebate,
    netTax,
    minTaxApplied: netTax === minTax,
    slabBreakdown,
    effectiveRate: (netTax / annualIncome) * 100,
  };
}
```

---

## AI Tax Rule Update Feature

When the government changes tax rules (typically in the June national budget),
you can update the entire tax configuration without touching any code.

### Flow

```
Settings → Tax Configuration → "Update Tax Rules with AI" button
         │
         ▼
Text area opens: "Paste the NBR circular, budget announcement, or news article"
         │
         ▼
POST /api/tax/update-with-ai
  { raw_text: "The Finance Minister announced..." }
         │
         ▼
Gemini Flash prompt:
  "Extract Bangladesh income tax rules from this text and return structured JSON
   matching this schema: [schema]. Return ONLY the JSON, no explanation."
         │
         ▼
Gemini returns structured JSON
         │
         ▼
Diff view: Current Rules vs Proposed Rules
  ┌─────────────────────────────────────────────┐
  │ Change Preview                              │
  │                                             │
  │ Tax-free threshold:                         │
  │   Current:  ৳3,50,000                       │
  │   Proposed: ৳4,00,000  ✅ Changed          │
  │                                             │
  │ Slab 1 rate (first ৳1 lakh):               │
  │   Current:  5%                              │
  │   Proposed: 5%         — No change          │
  │                                             │
  │ [Review & Apply] [Cancel]                   │
  └─────────────────────────────────────────────┘
         │ user clicks Apply
         ▼
New TaxConfig record saved with fiscal_year tag
Old config preserved (used for past-year calculations)
All tax calculations immediately use new rules
```

### Implementation Notes

- Only you (admin/owner) can trigger tax rule updates
- Always show a diff before saving — never auto-apply
- Old tax configs are NEVER deleted (audit trail + historical accuracy)
- Each fiscal year is a separate DB row; `is_current = true` for the active one
- If Gemini fails to parse, show error + raw text for manual editing

### Gemini Prompt Template (stored in `prompts` table, editable)

```
You are a Bangladesh tax expert. Extract income tax rules from the following 
government announcement or news article and return ONLY valid JSON matching 
this exact schema:

{
  "fiscal_year": "YYYY-YY",
  "regular_threshold": number,           // tax-free limit in BDT
  "female_senior_freedom_fighter_threshold": number,
  "minimum_tax": {
    "dhaka_city_corp": number,
    "other_city_corp": number,
    "other_areas": number
  },
  "slabs": [
    { "min": number, "max": number|null, "rate": number }
  ],
  "rebate": {
    "max_eligible_investment_percent": number,
    "max_eligible_investment_cap": number,
    "rebate_on_investment_rate": number
  }
}

If any field is not mentioned in the text, preserve its current value.
Current values: {current_config_json}

Text to parse:
{raw_text}
```

---

## Tax Optimization Guide

Shows you exactly how much more you should invest to maximize your tax rebate.

### Calculation Logic

```typescript
function getTaxOptimizationGuide(userId: string): OptimizationGuide {
  const config = await getCurrentTaxConfig();
  const ytdIncome = await getYearToDateIncome(userId);          // actual income so far
  const remainingMonths = getMonthsRemainingInFiscalYear();      // how many months left
  const projectedAnnualIncome = ytdIncome * (12 / monthsElapsed);
  
  const ytdInvestments = await getEligibleInvestments(userId);
  
  // Max eligible investment = 25% of income or ৳15 lakh, whichever is lower
  const maxEligible = Math.min(
    projectedAnnualIncome * config.rebate.max_eligible_investment_percent,
    config.rebate.max_eligible_investment_cap
  );
  
  const remainingCapacity = Math.max(0, maxEligible - ytdInvestments);
  const potentialAdditionalRebate = remainingCapacity * config.rebate.rebate_on_investment_rate;
  const monthlyTarget = remainingCapacity / remainingMonths;
  
  // Rank instruments by liquidity and returns
  const recommendations = [
    {
      instrument: "DPS (Bank)",
      cap: config.eligible_investments.find(e => e.code === 'dps').annual_cap,
      interest_rate: 0.075,  // ~7.5% per year (fetched from user's bank)
      liquidity: "Low",
      risk: "Zero",
      action: `Open a ৳${formatCurrency(monthlyTarget)} monthly DPS`
    },
    {
      instrument: "Sanchayapatra",
      cap: 5000000,
      interest_rate: 0.1172,  // 11.72% for 5-year
      liquidity: "Medium",
      risk: "Zero",
      action: `Invest ৳${formatCurrency(remainingCapacity)} in 5-Year Sanchayapatra`
    },
    {
      instrument: "Life Insurance",
      cap: null,
      interest_rate: 0.05,  // approximate
      liquidity: "Very Low",
      risk: "Low",
      action: "Increase life insurance premium"
    }
  ];
  
  return {
    projectedAnnualIncome,
    currentEligibleInvestments: ytdInvestments,
    maxEligibleInvestment: maxEligible,
    remainingInvestmentCapacity: remainingCapacity,
    potentialAdditionalRebate,
    monthlyInvestmentTarget: monthlyTarget,
    monthsRemaining: remainingMonths,
    recommendations,
    whatIfScenarios: [
      { invest: remainingCapacity * 0.25, taxSaving: remainingCapacity * 0.25 * 0.15 },
      { invest: remainingCapacity * 0.50, taxSaving: remainingCapacity * 0.50 * 0.15 },
      { invest: remainingCapacity,        taxSaving: potentialAdditionalRebate },
    ]
  };
}
```

### UI Display

```
┌─────────────────────────────────────────────────────────────────┐
│  💡 Tax Optimization Guide    FY 2024-25                        │
├─────────────────────────────────────────────────────────────────┤
│  Projected Annual Income:        ৳12,00,000                     │
│  Max Eligible Investment:         ৳3,00,000  (25% of income)    │
│  Already Invested:                ৳1,20,000  (DPS ৳10k/mo)     │
│  Remaining Capacity:              ৳1,80,000  ← invest this!     │
│  Potential Additional Tax Saving: ৳27,000    (15% rebate)       │
│  Monthly Target (6 months left):  ৳30,000/month                 │
├─────────────────────────────────────────────────────────────────┤
│  Recommended Actions:                                           │
│                                                                 │
│  🥇 Sanchayapatra — 11.72%, Zero Risk                          │
│     Invest ৳1,80,000 → Save ৳27,000 in tax                     │
│     [Open Sanchayapatra Guide →]                                │
│                                                                 │
│  🥈 DPS (additional) — ~7.5%                                   │
│     Add ৳30,000/month DPS → covers remaining capacity           │
│     [Calculate DPS →]                                           │
│                                                                 │
│  🥉 Life Insurance Premium — increases rebate base              │
│     [Contact your agent →]                                      │
├─────────────────────────────────────────────────────────────────┤
│  What If Calculator:                                            │
│  If I invest ৳ [_______]  →  Tax reduces by ৳ 0               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fiscal Year Handling

Bangladesh fiscal year runs **July 1 → June 30** (not calendar year).

```typescript
function getBDFiscalYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-indexed
  if (month >= 7) return `${year}-${String(year + 1).slice(2)}`;
  return `${year - 1}-${String(year).slice(2)}`;
}
// June 30, 2024 → "2023-24"
// July 1, 2024  → "2024-25"
```

All cron jobs run in Asia/Dhaka timezone (UTC+6).

---

## Real-time Tax Meter

Displayed on dashboard — recalculates whenever income/investment records change.

```
Income Tax Meter (FY 2024-25)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YTD Income:           ৳8,50,000
YTD Tax Liability:    ৳62,500
TDS Already Paid:     ৳15,000
Outstanding Tax:      ৳47,500

Progress to FY end:  ━━━━━━━━━░░░  67% (8 of 12 months)
Projected Annual Tax: ৳93,750

[View Details] [Optimize →]
```

---

## TDS Tracking

Automatically deducted at source — tracked separately.

| Source | TDS Rate | Tracked From |
|---|---|---|
| Bank FDR interest | 10% | Interest transaction records |
| Sanchayapatra interest | 10% (if total > ৳5 lakh invested) | Investment records |
| Dividend income | 10% | Dividend transaction records |
| Rental income | 5% | Income records tagged "rental" |

TDS paid → shows as credit against annual tax liability.
