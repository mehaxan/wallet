import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { transactions, categories, accounts } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = req.nextUrl;
    const type = searchParams.get("type");
    const categoryId = searchParams.get("categoryId");
    const accountId = searchParams.get("accountId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const conditions = [eq(transactions.userId, session.sub)];
    if (type) conditions.push(eq(transactions.type, type as "income" | "expense" | "transfer"));
    if (categoryId) conditions.push(eq(transactions.categoryId, categoryId));
    if (accountId) conditions.push(eq(transactions.accountId, accountId));
    if (from) conditions.push(gte(transactions.date, from));
    if (to) conditions.push(lte(transactions.date, to));

    const rows = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        date: transactions.date,
        note: transactions.note,
        taxable: transactions.taxable,
        createdAt: transactions.createdAt,
        category: { id: categories.id, name: categories.name, icon: categories.icon, color: categories.color },
        account: { id: accounts.id, name: accounts.name, type: accounts.type },
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(...conditions));

    return NextResponse.json({ data: rows, total: Number(count), limit, offset });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { type, amount, date, note, categoryId, accountId, taxable = true } = body;

    if (!type || !amount || !date) return apiError("type, amount, and date are required");
    if (!["income", "expense", "transfer"].includes(type)) return apiError("Invalid type");
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return apiError("Amount must be positive");

    const [row] = await db
      .insert(transactions)
      .values({ userId: session.sub, type, amount: String(amount), date, note: note || null, categoryId: categoryId || null, accountId: accountId || null, taxable })
      .returning();

    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
