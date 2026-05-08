import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await req.json();
    const { type, amount, date, note, categoryId, accountId, taxable } = body;

    const [existing] = await db.select({ id: transactions.id }).from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, session.sub)));
    if (!existing) return apiError("Transaction not found", 404);

    const updates: Partial<typeof transactions.$inferInsert> = {};
    if (type !== undefined) updates.type = type;
    if (amount !== undefined) updates.amount = String(amount);
    if (date !== undefined) updates.date = date;
    if (note !== undefined) updates.note = note || null;
    if (categoryId !== undefined) updates.categoryId = categoryId || null;
    if (accountId !== undefined) updates.accountId = accountId || null;
    if (taxable !== undefined) updates.taxable = taxable;
    updates.updatedAt = new Date();

    const [row] = await db.update(transactions).set(updates)
      .where(and(eq(transactions.id, id), eq(transactions.userId, session.sub)))
      .returning();

    return NextResponse.json(row);
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const [existing] = await db.select({ id: transactions.id }).from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, session.sub)));
    if (!existing) return apiError("Transaction not found", 404);

    await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, session.sub)));
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
