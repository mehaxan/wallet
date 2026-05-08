import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { investments } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    const rows = await db.select().from(investments)
      .where(eq(investments.userId, session.sub))
      .orderBy(desc(investments.createdAt));
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
    const { type, name, investedAmount, currentValue, units, purchaseDate, maturityDate, interestRate, brokerName, isTaxRebateEligible, note } = body;

    if (!type || !name || !investedAmount || !currentValue || !purchaseDate) {
      return apiError("type, name, investedAmount, currentValue, purchaseDate are required");
    }

    const VALID_TYPES = ["stock", "mutual_fund", "bond", "sanchayapatra", "gold", "crypto", "fd", "other"];
    if (!VALID_TYPES.includes(type)) return apiError(`type must be one of: ${VALID_TYPES.join(", ")}`);

    const [row] = await db.insert(investments).values({
      userId: session.sub, type, name,
      investedAmount: String(parseFloat(investedAmount)),
      currentValue: String(parseFloat(currentValue)),
      units: units ? String(parseFloat(units)) : null,
      purchaseDate,
      maturityDate: maturityDate ?? null,
      interestRate: interestRate ? String(parseFloat(interestRate)) : null,
      brokerName: brokerName ?? null,
      isTaxRebateEligible: isTaxRebateEligible ?? false,
      note: note ?? null,
    }).returning();

    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
