import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc, sum, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  netWorthSnapshots,
  accounts,
  loans,
  investments,
  assets,
  dpsAccounts,
} from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** GET /api/networth — returns all snapshots + current computed net worth */
export async function GET(_req: NextRequest) {
  try {
    const session = await requireSession();
    const uid = session.sub;

    const snapshots = await db
      .select()
      .from(netWorthSnapshots)
      .where(eq(netWorthSnapshots.userId, uid))
      .orderBy(asc(netWorthSnapshots.year), asc(netWorthSnapshots.month));

    // Current live net worth
    const [accountBal, loanBal, investVal, assetVal, dpsDep] = await Promise.all([
      db.select({ total: sum(accounts.balance) }).from(accounts).where(eq(accounts.userId, uid)),
      db.select({ total: sum(loans.amount) }).from(loans).where(and(eq(loans.userId, uid), eq(loans.direction, "taken"), eq(loans.status, "active"))),
      db.select({ total: sum(investments.currentValue) }).from(investments).where(eq(investments.userId, uid)),
      db.select({ total: sum(assets.currentValue) }).from(assets).where(eq(assets.userId, uid)),
      db.select({ total: sum(dpsAccounts.totalDeposited) }).from(dpsAccounts).where(and(eq(dpsAccounts.userId, uid), eq(dpsAccounts.status, "active"))),
    ]);

    const f = (r: { total: string | null }[]) => parseFloat(r[0]?.total ?? "0");
    const totalAssets      = f(accountBal) + f(investVal) + f(assetVal) + f(dpsDep);
    const totalLiabilities = f(loanBal);
    const netWorth         = totalAssets - totalLiabilities;

    return NextResponse.json({ snapshots, current: { totalAssets, totalLiabilities, netWorth } });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
