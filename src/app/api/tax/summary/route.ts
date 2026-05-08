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
    const url = new URL(req.url);
    const fiscalYear = url.searchParams.get("fy") ?? getBDFiscalYear();
    const location   = (url.searchParams.get("location") ?? "dhaka") as "dhaka" | "city_corp" | "other";

    // Load tax config
    const [config] = await db.select().from(taxConfigs).where(eq(taxConfigs.fiscalYear, fiscalYear));
    if (!config) return apiError(`No tax config for FY ${fiscalYear}`, 404);

    // Gross income: sum of taxable income transactions
    const incomeRows = await db.select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(
        eq(transactions.userId, session.sub),
        eq(transactions.type, "income"),
        eq(transactions.taxable, true),
      ));
    const grossIncome = parseFloat((incomeRows[0]?.total as string | null) ?? "0");

    // Tax paid (expense transactions tagged taxable)
    const expenseRows = await db.select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(
        eq(transactions.userId, session.sub),
        eq(transactions.type, "expense"),
        eq(transactions.taxable, true),
      ));
    const taxPaid = parseFloat((expenseRows[0]?.total as string | null) ?? "0");

    // Investments eligible for rebate
    const investRows = await db.select({ total: sum(investments.investedAmount) })
      .from(investments)
      .where(and(
        eq(investments.userId, session.sub),
        eq(investments.isTaxRebateEligible, true),
      ));
    const totalInvestment = parseFloat((investRows[0]?.total as string | null) ?? "0");

    // Sanchayapatra balance (for TDS calculation)
    const spRows = await db.select({ total: sum(investments.currentValue) })
      .from(investments)
      .where(and(
        eq(investments.userId, session.sub),
        eq(investments.type, "sanchayapatra"),
      ));
    const sanchayapatraTotal = parseFloat((spRows[0]?.total as string | null) ?? "0");

    const result = calculateBDTax(
      { grossIncome, totalInvestment, sanchayapatraTotal, location, taxPaid },
      config as unknown as TaxConfig,
    );

    return NextResponse.json({ fiscalYear, location, ...result });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error(e);
    return apiError("Internal server error", 500);
  }
}
