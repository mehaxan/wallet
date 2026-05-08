import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { creditCards } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

class ValidationError extends Error {}

function getTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseAmount(value: unknown, fieldName: string, allowZero = true): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (!allowZero && parsed === 0)) {
    throw new ValidationError(`${fieldName} must be a valid amount`);
  }
  return parsed.toFixed(2);
}

function parseOptionalDay(value: unknown, fieldName: string): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) {
    throw new ValidationError(`${fieldName} must be between 1 and 31`);
  }
  return parsed;
}

function parseOptionalRate(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new ValidationError("interestRate must be between 0 and 100");
  }
  return parsed.toFixed(2);
}

function parseLastFour(value: unknown): string | null {
  if (value === null || value === "") return null;
  const digits = typeof value === "string" ? value.replace(/\D/g, "").slice(-4) : "";
  return digits || null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await req.json();

    const [existing] = await db
      .select()
      .from(creditCards)
      .where(and(eq(creditCards.id, id), eq(creditCards.userId, session.sub)));

    if (!existing) return apiError("Not found", 404);

    const updates: Partial<typeof creditCards.$inferInsert> = { updatedAt: new Date() };

    if (body.bankName !== undefined) {
      const bankName = getTrimmedString(body.bankName);
      if (!bankName) return apiError("bankName cannot be empty");
      updates.bankName = bankName;
    }

    if (body.cardName !== undefined) {
      const cardName = getTrimmedString(body.cardName);
      if (!cardName) return apiError("cardName cannot be empty");
      updates.cardName = cardName;
    }

    if (body.lastFour !== undefined) updates.lastFour = parseLastFour(body.lastFour);
    if (body.creditLimit !== undefined) updates.creditLimit = parseAmount(body.creditLimit, "creditLimit", false);
    if (body.currentBalance !== undefined) updates.currentBalance = parseAmount(body.currentBalance, "currentBalance");
    if (body.statementDay !== undefined) updates.statementDay = parseOptionalDay(body.statementDay, "statementDay");
    if (body.dueDay !== undefined) updates.dueDay = parseOptionalDay(body.dueDay, "dueDay");
    if (body.interestRate !== undefined) updates.interestRate = parseOptionalRate(body.interestRate);

    if (body.status !== undefined) {
      if (!["active", "closed"].includes(body.status)) return apiError("status must be 'active' or 'closed'");
      updates.status = body.status;
    }

    if (body.note !== undefined) updates.note = getTrimmedString(body.note) || null;

    const [row] = await db
      .update(creditCards)
      .set(updates)
      .where(and(eq(creditCards.id, id), eq(creditCards.userId, session.sub)))
      .returning();

    return NextResponse.json(row);
  } catch (error: unknown) {
    if ((error as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    if (error instanceof ValidationError) return apiError(error.message);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const deleted = await db
      .delete(creditCards)
      .where(and(eq(creditCards.id, id), eq(creditCards.userId, session.sub)))
      .returning();

    if (!deleted.length) return apiError("Not found", 404);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if ((error as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
