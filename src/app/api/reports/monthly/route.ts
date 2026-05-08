import { NextRequest, NextResponse } from "next/server";
import { eq, and, gte, lte, sum, sql } from "drizzle-orm";
import { db } from "@/db";
import { transactions, categories, accounts } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/monthly?month=5&year=2026
 * Returns income, expense, savings, category breakdown, account-wise,
 * plus a simple CSV export when ?format=csv
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const uid = session.sub;

    const url    = new URL(req.url);
    const now    = new Date();
    const month  = parseInt(url.searchParams.get("month") ?? String(now.getMonth() + 1));
    const year   = parseInt(url.searchParams.get("year")  ?? String(now.getFullYear()));
    const format = url.searchParams.get("format") ?? "json";

    // Date bounds
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay   = new Date(year, month, 0).getDate();
    const endDate   = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

    const [incomeRow, expenseRow, txnsByCategory, allTxns] = await Promise.all([
      db.select({ total: sum(transactions.amount) })
        .from(transactions)
        .where(and(eq(transactions.userId, uid), eq(transactions.type, "income"), gte(transactions.date, startDate), lte(transactions.date, endDate))),

      db.select({ total: sum(transactions.amount) })
        .from(transactions)
        .where(and(eq(transactions.userId, uid), eq(transactions.type, "expense"), gte(transactions.date, startDate), lte(transactions.date, endDate))),

      // Category breakdown
      db.select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        type: transactions.type,
        total: sum(transactions.amount),
      })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(and(eq(transactions.userId, uid), gte(transactions.date, startDate), lte(transactions.date, endDate)))
        .groupBy(transactions.categoryId, categories.name, transactions.type),

      // All transactions for CSV
      db.select({
        date: transactions.date,
        type: transactions.type,
        amount: transactions.amount,
        note: transactions.note,
        categoryName: categories.name,
        accountName: accounts.name,
      })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(eq(transactions.userId, uid), gte(transactions.date, startDate), lte(transactions.date, endDate)))
        .orderBy(transactions.date),
    ]);

    const totalIncome  = parseFloat((incomeRow[0]?.total  as string | null) ?? "0");
    const totalExpense = parseFloat((expenseRow[0]?.total as string | null) ?? "0");
    const netSavings   = totalIncome - totalExpense;
    const savingsRate  = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    const categoryBreakdown = txnsByCategory.map(r => ({
      categoryName: r.categoryName ?? "Uncategorised",
      type: r.type,
      total: parseFloat(r.total as string ?? "0"),
    }));

    if (format === "csv") {
      const header = "Date,Type,Amount,Category,Account,Note\n";
      const rows   = allTxns.map(t =>
        `${t.date},${t.type},${t.amount},${t.categoryName ?? ""},${t.accountName ?? ""},${(t.note ?? "").replace(/,/g, " ")}`
      ).join("\n");
      return new NextResponse(header + rows, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="report-${year}-${month}.csv"`,
        },
      });
    }

    return NextResponse.json({
      month, year, startDate, endDate,
      totalIncome, totalExpense, netSavings, savingsRate,
      categoryBreakdown,
      transactions: allTxns,
    });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error(e);
    return apiError("Internal server error", 500);
  }
}
