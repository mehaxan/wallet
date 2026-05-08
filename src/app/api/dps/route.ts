import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { dpsAccounts } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    const rows = await db.select().from(dpsAccounts)
      .where(eq(dpsAccounts.userId, session.sub))
      .orderBy(desc(dpsAccounts.createdAt));
    return NextResponse.json(rows);
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { bankName, accountNumber, monthlyAmount, interestRate, tenureMonths, startDate, note } = body;

    if (!bankName || !monthlyAmount || !interestRate || !tenureMonths || !startDate) {
      return apiError("bankName, monthlyAmount, interestRate, tenureMonths, startDate are required");
    }

    const start = new Date(startDate);
    const maturity = new Date(start);
    maturity.setMonth(maturity.getMonth() + Number(tenureMonths));
    const maturityDate = maturity.toISOString().slice(0, 10);

    const monthly = parseFloat(monthlyAmount);
    const rate = parseFloat(interestRate) / 100 / 12;
    const n = Number(tenureMonths);
    const maturityAmount = rate > 0
      ? monthly * ((Math.pow(1 + rate, n) - 1) / rate) * (1 + rate)
      : monthly * n;

    const [row] = await db.insert(dpsAccounts).values({
      userId: session.sub,
      bankName,
      accountNumber: accountNumber ?? null,
      monthlyAmount: String(monthly),
      interestRate: String(parseFloat(interestRate)),
      tenureMonths: n,
      startDate,
      maturityDate,
      maturityAmount: String(Math.round(maturityAmount)),
      totalDeposited: "0",
      note: note ?? null,
    }).returning();

    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
