import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { loans } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    const rows = await db.select().from(loans)
      .where(eq(loans.userId, session.sub))
      .orderBy(desc(loans.createdAt));
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
    const { direction, personName, amount, interestRate, startDate, dueDate, emi, note } = body;

    if (!direction || !personName || !amount || !startDate) {
      return apiError("direction, personName, amount, startDate are required");
    }
    if (!["taken", "given"].includes(direction)) {
      return apiError("direction must be 'taken' or 'given'");
    }

    // Auto-compute EMI if not provided and rate + tenure available
    let computedEmi = emi ?? null;
    if (!emi && interestRate && dueDate) {
      const months = Math.round((new Date(dueDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
      if (months > 0) {
        const r = parseFloat(interestRate) / 100 / 12;
        const p = parseFloat(amount);
        computedEmi = r > 0
          ? String(Math.round(p * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1)))
          : String(Math.round(p / months));
      }
    }

    const [row] = await db.insert(loans).values({
      userId: session.sub,
      direction,
      personName,
      amount: String(parseFloat(amount)),
      interestRate: interestRate ? String(parseFloat(interestRate)) : null,
      startDate,
      dueDate: dueDate ?? null,
      emi: computedEmi,
      paidAmount: "0",
      note: note ?? null,
    }).returning();

    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
