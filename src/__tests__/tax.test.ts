import { describe, it, expect } from "vitest";
import { calculateBDTax, type TaxConfig } from "@/lib/tax";

const CONFIG_2024_25: TaxConfig = {
  slabs: [
    { limit: 350000, rate: 0  },
    { limit: 100000, rate: 5  },
    { limit: 400000, rate: 10 },
    { limit: 500000, rate: 15 },
    { limit: 500000, rate: 20 },
    { limit: null,   rate: 25 },
  ],
  rebateRate: "15",
  rebateInvestmentCap: "1000000",
  rebateIncomePercent: "25",
  minTaxDhaka: "5000",
  minTaxCityCorpOther: "4000",
  minTaxOther: "3000",
  taxFreeThreshold: "350000",
  sanchayapatraThreshold: "500000",
  sanchayapatraTdsRate: "10",
  rebateInstruments: [],
};

describe("calculateBDTax", () => {
  it("returns zero tax when income is at or below threshold", () => {
    const result = calculateBDTax({ grossIncome: 350000, totalInvestment: 0, sanchayapatraTotal: 0, location: "dhaka", taxPaid: 0 }, CONFIG_2024_25);
    expect(result.finalTax).toBe(0);
    expect(result.taxDue).toBe(0);
  });

  it("applies minimum tax for Dhaka when income exceeds threshold", () => {
    // Small income just above threshold — gross tax < minimum
    const result = calculateBDTax({ grossIncome: 360000, totalInvestment: 0, sanchayapatraTotal: 0, location: "dhaka", taxPaid: 0 }, CONFIG_2024_25);
    expect(result.finalTax).toBeGreaterThanOrEqual(5000);
    expect(result.minimumTax).toBe(5000);
  });

  it("computes correct gross tax for 600k income", () => {
    // 0 on first 350k, 5% on next 100k, 10% on next 150k = 0 + 5000 + 15000 = 20000
    const result = calculateBDTax({ grossIncome: 600000, totalInvestment: 0, sanchayapatraTotal: 0, location: "dhaka", taxPaid: 0 }, CONFIG_2024_25);
    expect(result.grossTax).toBe(20000);
  });

  it("applies 15% rebate on eligible investments", () => {
    // 600k income → 20000 gross tax
    // 100k investment eligible → 15000 max rebate base × 15% = 2250 rebate
    const result = calculateBDTax({ grossIncome: 600000, totalInvestment: 100000, sanchayapatraTotal: 0, location: "dhaka", taxPaid: 0 }, CONFIG_2024_25);
    expect(result.rebateAmount).toBe(Math.round(100000 * 0.15));
    expect(result.netTax).toBe(result.grossTax - result.rebateAmount);
  });

  it("caps rebate investment at 25% of gross income", () => {
    // 600k × 25% = 150k cap; if invest 300k → capped at 150k
    const result = calculateBDTax({ grossIncome: 600000, totalInvestment: 300000, sanchayapatraTotal: 0, location: "dhaka", taxPaid: 0 }, CONFIG_2024_25);
    expect(result.investmentForRebate).toBe(150000);
  });

  it("calculates Sanchayapatra TDS when above 5L threshold", () => {
    const result = calculateBDTax({ grossIncome: 600000, totalInvestment: 0, sanchayapatraTotal: 700000, location: "dhaka", taxPaid: 0 }, CONFIG_2024_25);
    expect(result.sanchayapatraTds).toBe(Math.round(700000 * 0.10));
  });

  it("sets taxDue to zero if already paid enough", () => {
    const result = calculateBDTax({ grossIncome: 600000, totalInvestment: 0, sanchayapatraTotal: 0, location: "dhaka", taxPaid: 50000 }, CONFIG_2024_25);
    expect(result.taxDue).toBe(0);
  });
});
