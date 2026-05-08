import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    const rows = await db.select().from(goals)
      .where(eq(goals.userId, session.sub))
      .orderBy(desc(goals.createdAt));
    return NextResponse.json(rows);
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { name, targetAmount, targetDate, currentAmount, icon } = await req.json();
    if (!name || !targetAmount) return apiError("name and targetAmount are required");

    const [row] = await db.insert(goals).values({
      userId: session.sub, name, icon: icon ?? null,
      targetAmount: String(parseFloat(targetAmount)),
      currentAmount: currentAmount ? String(parseFloat(currentAmount)) : "0",
      targetDate: targetDate ?? null,
    }).returning();

    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
