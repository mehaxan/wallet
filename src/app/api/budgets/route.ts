import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { budgets, categories } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const url = new URL(req.url);
    const month = parseInt(url.searchParams.get("month") ?? String(new Date().getMonth() + 1));
    const year  = parseInt(url.searchParams.get("year")  ?? String(new Date().getFullYear()));

    const rows = await db
      .select({ budget: budgets, category: categories })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .where(and(eq(budgets.userId, session.sub), eq(budgets.month, month), eq(budgets.year, year)));

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
    const { categoryId, amount, month, year } = body;

    if (!amount || !month || !year) return apiError("amount, month, year are required");

    const [row] = await db.insert(budgets).values({
      userId: session.sub,
      categoryId: categoryId ?? null,
      amount: String(parseFloat(amount)),
      month: parseInt(month),
      year: parseInt(year),
    }).onConflictDoUpdate({
      target: [budgets.userId, budgets.categoryId, budgets.month, budgets.year],
      set: { amount: String(parseFloat(amount)) },
    }).returning();

    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
