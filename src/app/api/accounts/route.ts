import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    const rows = await db.select().from(accounts).where(eq(accounts.userId, session.sub)).orderBy(accounts.name);
    return NextResponse.json(rows);
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { name, type, currency = "BDT", balance = 0, isDefault = false } = await req.json();
    if (!name || !type) return apiError("name and type are required");
    if (!["cash", "bank", "mfs", "card", "other"].includes(type)) return apiError("Invalid account type");

    // If marking as default, unset others first
    if (isDefault) {
      await db.update(accounts).set({ isDefault: false }).where(eq(accounts.userId, session.sub));
    }

    const [row] = await db.insert(accounts)
      .values({ userId: session.sub, name, type, currency, balance: String(balance), isDefault })
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession();
    const { id, name, type, currency, balance, isDefault } = await req.json();
    if (!id) return apiError("id is required");

    const [existing] = await db.select({ id: accounts.id }).from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, session.sub)));
    if (!existing) return apiError("Account not found", 404);

    if (isDefault) {
      await db.update(accounts).set({ isDefault: false }).where(eq(accounts.userId, session.sub));
    }

    const updates: Partial<typeof accounts.$inferInsert> = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (currency !== undefined) updates.currency = currency;
    if (balance !== undefined) updates.balance = String(balance);
    if (isDefault !== undefined) updates.isDefault = isDefault;
    updates.updatedAt = new Date();

    const [row] = await db.update(accounts).set(updates)
      .where(and(eq(accounts.id, id), eq(accounts.userId, session.sub))).returning();
    return NextResponse.json(row);
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
