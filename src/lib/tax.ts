/**
 * Bangladesh Income Tax Calculator — FY 2024-25 NBR rules
 */

export interface TaxSlab { limit: number | null; rate: number; }
export interface RebateInstrument { name: string; limit: number | null; }

export interface TaxConfig {
  slabs: TaxSlab[];
  rebateRate: string;              // "15"
  rebateInvestmentCap: string;     // "1000000"
  rebateIncomePercent: string;     // "25"
  minTaxDhaka: string;             // "5000"
  minTaxCityCorpOther: string;     // "4000"
  minTaxOther: string;             // "3000"
  taxFreeThreshold: string;        // "350000"
  sanchayapatraThreshold: string;  // "500000"
  sanchayapatraTdsRate: string;    // "10"
  rebateInstruments: RebateInstrument[];
}

export interface TaxInput {
  grossIncome: number;       // annual taxable income (BDT)
  totalInvestment: number;   // eligible rebate investment (BDT)
  sanchayapatraTotal: number; // total Sanchayapatra balance (BDT)
  location: "dhaka" | "city_corp" | "other";
  taxPaid: number;           // advance/withholding tax already paid
}

export interface SlabBreakdown {
  from: number;
  to: number | null;
  rate: number;
  taxable: number;
  tax: number;
}

export interface TaxResult {
  grossIncome: number;
  taxableIncome: number;
  grossTax: number;
  rebateAmount: number;
  netTax: number;
  minimumTax: number;
  finalTax: number;
  taxPaid: number;
  taxDue: number;
  effectiveRate: number;
  slabBreakdown: SlabBreakdown[];
  sanchayapatraTds: number;
  investmentForRebate: number;
}

export function calculateBDTax(input: TaxInput, config: TaxConfig): TaxResult {
  const { grossIncome, totalInvestment, sanchayapatraTotal, location, taxPaid } = input;
  const slabs = config.slabs as TaxSlab[];

  const taxFreeThreshold = parseFloat(config.taxFreeThreshold);
  const taxableIncome    = Math.max(0, grossIncome);

  // ── Slab calculation ───────────────────────────────────────────────────────
  let remaining = taxableIncome;
  let taxed = 0;
  let grossTax = 0;
  const slabBreakdown: SlabBreakdown[] = [];

  for (const slab of slabs) {
    if (remaining <= 0) break;
    const band = slab.limit !== null ? Math.min(remaining, slab.limit) : remaining;
    const exempt = taxed === 0 ? Math.min(band, taxFreeThreshold - taxed) : 0;
    const taxable = Math.max(0, band - Math.max(0, taxFreeThreshold - taxed));
    const tax = (taxable * slab.rate) / 100;
    grossTax += tax;
    slabBreakdown.push({ from: taxed, to: slab.limit !== null ? taxed + slab.limit : null, rate: slab.rate, taxable, tax });
    taxed    += band;
    remaining -= band;
    void exempt; // exempt band is zero-rated, not subtracted from grossTax
  }

  // ── Rebate ─────────────────────────────────────────────────────────────────
  const rebateRate       = parseFloat(config.rebateRate) / 100;
  const rebateCap        = parseFloat(config.rebateInvestmentCap);
  const rebateIncomePct  = parseFloat(config.rebateIncomePercent) / 100;
  const maxRebateBase    = Math.min(totalInvestment, rebateCap, grossIncome * rebateIncomePct);
  const rebateAmount     = Math.round(maxRebateBase * rebateRate);
  const netTax           = Math.max(0, grossTax - rebateAmount);

  // ── Minimum tax ────────────────────────────────────────────────────────────
  const minTaxMap: Record<typeof location, number> = {
    dhaka:     parseFloat(config.minTaxDhaka),
    city_corp: parseFloat(config.minTaxCityCorpOther),
    other:     parseFloat(config.minTaxOther),
  };
  const minimumTax = grossIncome > taxFreeThreshold ? minTaxMap[location] : 0;
  const finalTax   = Math.max(netTax, minimumTax);

  // ── Sanchayapatra TDS ──────────────────────────────────────────────────────
  const spThreshold = parseFloat(config.sanchayapatraThreshold);
  const spTdsRate   = parseFloat(config.sanchayapatraTdsRate) / 100;
  const sanchayapatraTds = sanchayapatraTotal > spThreshold
    ? Math.round(sanchayapatraTotal * spTdsRate)
    : 0;

  return {
    grossIncome,
    taxableIncome,
    grossTax: Math.round(grossTax),
    rebateAmount,
    netTax: Math.round(netTax),
    minimumTax,
    finalTax: Math.round(finalTax),
    taxPaid,
    taxDue: Math.round(Math.max(0, finalTax - taxPaid)),
    effectiveRate: grossIncome > 0 ? Math.round((finalTax / grossIncome) * 10000) / 100 : 0,
    slabBreakdown,
    sanchayapatraTds,
    investmentForRebate: Math.round(maxRebateBase),
  };
}
