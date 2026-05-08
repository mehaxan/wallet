import { NextRequest, NextResponse } from "next/server";
import { eq, and, sum } from "drizzle-orm";
import { db } from "@/db";
import { taxConfigs, transactions, investments } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError, getBDFiscalYear } from "@/lib/utils";
import { calculateBDTax, type TaxConfig } from "@/lib/tax";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const uid = session.sub;
    const url = new URL(req.url);
    const fiscalYear = url.searchParams.get("fy") ?? getBDFiscalYear();

    const [config] = await db.select().from(taxConfigs).where(eq(taxConfigs.fiscalYear, fiscalYear));
    if (!config) return apiError(`No tax config for FY ${fiscalYear}`, 404);

    const [incomeRow, investRow, spRow] = await Promise.all([
      db.select({ total: sum(transactions.amount) }).from(transactions).where(and(eq(transactions.userId, uid), eq(transactions.type, "income"), eq(transactions.taxable, true))),
      db.select({ total: sum(investments.investedAmount) }).from(investments).where(and(eq(investments.userId, uid), eq(investments.isTaxRebateEligible, true))),
      db.select({ total: sum(investments.currentValue) }).from(investments).where(and(eq(investments.userId, uid), eq(investments.type, "sanchayapatra"))),
    ]);

    const grossIncome      = parseFloat((incomeRow[0]?.total as string | null) ?? "0");
    const totalInvestment  = parseFloat((investRow[0]?.total as string | null) ?? "0");
    const sanchayapatraTotal = parseFloat((spRow[0]?.total as string | null) ?? "0");

    const current = calculateBDTax(
      { grossIncome, totalInvestment, sanchayapatraTotal, location: "dhaka", taxPaid: 0 },
      config as unknown as TaxConfig,
    );

    const suggestions: { priority: "high" | "medium" | "low"; title: string; description: string; potentialSaving: number }[] = [];

    // 1. Rebate gap — can invest more to claim more rebate
    const maxInvestmentForRebate = Math.min(grossIncome * 0.25, 1_000_000);
    const rebateGap = maxInvestmentForRebate - current.investmentForRebate;
    if (rebateGap > 10_000 && current.grossIncome > parseFloat(config.taxFreeThreshold)) {
      const additionalRebate = Math.round(rebateGap * (parseFloat(config.rebateRate) / 100));
      suggestions.push({
        priority: "high",
        title:    "Increase tax-rebate investments",
        description: `You can invest ৳${rebateGap.toLocaleString("en-IN")} more in rebate-eligible instruments (DPS, Sanchayapatra, life insurance) to claim an additional ৳${additionalRebate.toLocaleString("en-IN")} in tax rebate.`,
        potentialSaving: additionalRebate,
      });
    }

    // 2. Sanchayapatra — optimal holding below TDS threshold
    const spThreshold = parseFloat(config.sanchayapatraThreshold);
    if (sanchayapatraTotal > spThreshold) {
      const excess = sanchayapatraTotal - spThreshold;
      const tdsOnExcess = Math.round(excess * (parseFloat(config.sanchayapatraTdsRate) / 100));
      suggestions.push({
        priority: "medium",
        title:    "Sanchayapatra holding above TDS threshold",
        description: `Your Sanchayapatra balance is ৳${excess.toLocaleString("en-IN")} above the ৳${spThreshold.toLocaleString("en-IN")} TDS-free threshold. Consider shifting excess to other rebate-eligible instruments to avoid the ${config.sanchayapatraTdsRate}% TDS.`,
        potentialSaving: tdsOnExcess,
      });
    } else if (sanchayapatraTotal === 0 && grossIncome > parseFloat(config.taxFreeThreshold)) {
      suggestions.push({
        priority: "medium",
        title:    "Consider Sanchayapatra for guaranteed returns + tax rebate",
        description: `Sanchayapatra offers government-guaranteed returns and qualifies for tax rebate. Up to ৳${spThreshold.toLocaleString("en-IN")} has no TDS.`,
        potentialSaving: 0,
      });
    }

    // 3. Track taxable income
    if (grossIncome === 0) {
      suggestions.push({
        priority: "low",
        title:    "Mark income transactions as taxable",
        description: "Tag your income transactions as taxable so the tax calculator can compute your liability accurately.",
        potentialSaving: 0,
      });
    }

    // 4. Life insurance
    suggestions.push({
      priority: "low",
      title:    "Life insurance premium is rebate-eligible",
      description: "Premiums paid on life insurance policies qualify for the 15% tax rebate under BD tax law. Ensure these are tracked as investments.",
      potentialSaving: 0,
    });

    return NextResponse.json({
      fiscalYear,
      currentTax: current.finalTax,
      suggestions,
    });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error(e);
    return apiError("Internal server error", 500);
  }
}
