import { NextRequest, NextResponse } from "next/server";
import { eq, and, sum, count, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { transactions, accounts, loans, dpsAccounts, investments, assets, goals } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const uid = session.sub;

    const [
      incomeRow,
      expenseRow,
      accountsRows,
      recentTxns,
      loansRow,
      dpsRow,
      investRow,
      assetsRow,
      goalsRows,
    ] = await Promise.all([
      // Total income
      db.select({ total: sum(transactions.amount) })
        .from(transactions)
        .where(and(eq(transactions.userId, uid), eq(transactions.type, "income"))),
      // Total expenses
      db.select({ total: sum(transactions.amount) })
        .from(transactions)
        .where(and(eq(transactions.userId, uid), eq(transactions.type, "expense"))),
      // Account balances
      db.select({ id: accounts.id, name: accounts.name, balance: accounts.balance, currency: accounts.currency })
        .from(accounts)
        .where(eq(accounts.userId, uid)),
      // Recent 5 transactions
      db.select({
        id: transactions.id,
        note: transactions.note,
        amount: transactions.amount,
        type: transactions.type,
        date: transactions.date,
      })
        .from(transactions)
        .where(eq(transactions.userId, uid))
        .orderBy(desc(transactions.date))
        .limit(5),
      // Total loans outstanding (taken)
      db.select({ total: sum(loans.amount) })
        .from(loans)
        .where(and(eq(loans.userId, uid), eq(loans.direction, "taken"), eq(loans.status, "active"))),
      // DPS monthly commitment
      db.select({ total: sum(dpsAccounts.monthlyAmount) })
        .from(dpsAccounts)
        .where(and(eq(dpsAccounts.userId, uid), eq(dpsAccounts.status, "active"))),
      // Investment portfolio value
      db.select({ total: sum(investments.currentValue) })
        .from(investments)
        .where(eq(investments.userId, uid)),
      // Asset value
      db.select({ total: sum(assets.currentValue) })
        .from(assets)
        .where(eq(assets.userId, uid)),
      // Goals
      db.select({ currentAmount: goals.currentAmount, targetAmount: goals.targetAmount })
        .from(goals)
        .where(and(eq(goals.userId, uid), eq(goals.status, "active")))
        .limit(5),
    ]);

    const totalIncome   = parseFloat((incomeRow[0]?.total as string | null) ?? "0");
    const totalExpense  = parseFloat((expenseRow[0]?.total as string | null) ?? "0");
    const totalLoans    = parseFloat((loansRow[0]?.total as string | null) ?? "0");
    const totalDps      = parseFloat((dpsRow[0]?.total as string | null) ?? "0");
    const investValue   = parseFloat((investRow[0]?.total as string | null) ?? "0");
    const assetValue    = parseFloat((assetsRow[0]?.total as string | null) ?? "0");
    const totalBalance  = accountsRows.reduce((s, a) => s + parseFloat(a.balance as string), 0);
    const netWorth      = totalBalance + investValue + assetValue - totalLoans;
    const savingsRate   = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

    const goalsProgress = goalsRows.map(g => ({
      current: parseFloat(g.currentAmount as string),
      target:  parseFloat(g.targetAmount as string),
      pct: parseFloat(g.targetAmount as string) > 0
        ? Math.round((parseFloat(g.currentAmount as string) / parseFloat(g.targetAmount as string)) * 100)
        : 0,
    }));

    return NextResponse.json({
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      savingsRate,
      netWorth,
      totalBalance,
      investValue,
      assetValue,
      totalLoans,
      dpsMonthlySaving: totalDps,
      accounts: accountsRows,
      recentTransactions: recentTxns.map(t => ({ ...t, description: t.note })),
      goalsProgress,
    });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error(e);
    return apiError("Internal server error", 500);
  }
}
