import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { creditCards, emis } from "@/db/schema";
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

function parsePositiveInteger(value: unknown, fieldName: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer`);
  }
  return parsed;
}

function parseNonNegativeInteger(value: unknown, fieldName: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ValidationError(`${fieldName} must be a non-negative integer`);
  }
  return parsed;
}

function parseDateValue(value: unknown, fieldName: string): string {
  const text = getTrimmedString(value);
  if (!text || Number.isNaN(new Date(text).getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date`);
  }
  return text;
}

function parseOptionalRate(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new ValidationError("interestRate must be between 0 and 100");
  }
  return parsed.toFixed(2);
}

async function ensureCreditCardBelongsToUser(userId: string, creditCardId: unknown) {
  if (creditCardId === undefined) return undefined;
  if (creditCardId === null || creditCardId === "") return null;

  const cardId = getTrimmedString(creditCardId);
  const [card] = await db
    .select({ id: creditCards.id })
    .from(creditCards)
    .where(and(eq(creditCards.id, cardId), eq(creditCards.userId, userId)));

  if (!card) throw new ValidationError("Selected credit card not found");
  return cardId;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await req.json();

    const [existing] = await db
      .select()
      .from(emis)
      .where(and(eq(emis.id, id), eq(emis.userId, session.sub)));

    if (!existing) return apiError("Not found", 404);

    const updates: Partial<typeof emis.$inferInsert> = { updatedAt: new Date() };

    if (body.name !== undefined) {
      const name = getTrimmedString(body.name);
      if (!name) return apiError("name cannot be empty");
      updates.name = name;
    }

    if (body.lenderName !== undefined) updates.lenderName = getTrimmedString(body.lenderName) || null;
    if (body.principalAmount !== undefined) updates.principalAmount = parseAmount(body.principalAmount, "principalAmount", false);
    if (body.emiAmount !== undefined) updates.emiAmount = parseAmount(body.emiAmount, "emiAmount", false);
    if (body.startDate !== undefined) updates.startDate = parseDateValue(body.startDate, "startDate");
    if (body.interestRate !== undefined) updates.interestRate = parseOptionalRate(body.interestRate);
    if (body.note !== undefined) updates.note = getTrimmedString(body.note) || null;

    if (body.creditCardId !== undefined) {
      updates.creditCardId = await ensureCreditCardBelongsToUser(session.sub, body.creditCardId);
    }

    let totalInstallments = existing.totalInstallments;
    if (body.totalInstallments !== undefined) {
      totalInstallments = parsePositiveInteger(body.totalInstallments, "totalInstallments");
      updates.totalInstallments = totalInstallments;
    }

    let paidInstallments = existing.paidInstallments;
    if (body.paidInstallments !== undefined) {
      paidInstallments = parseNonNegativeInteger(body.paidInstallments, "paidInstallments");
    }

    if (body.incrementPaidInstallments !== undefined) {
      const incrementRaw = body.incrementPaidInstallments === true ? 1 : body.incrementPaidInstallments;
      const increment = parsePositiveInteger(incrementRaw, "incrementPaidInstallments");
      paidInstallments += increment;
    }

    if (paidInstallments > totalInstallments) {
      return apiError("paidInstallments cannot exceed totalInstallments");
    }
    if (body.paidInstallments !== undefined || body.incrementPaidInstallments !== undefined) {
      updates.paidInstallments = paidInstallments;
    }

    let status = existing.status;
    if (body.status !== undefined) {
      if (!["active", "completed", "cancelled"].includes(body.status)) {
        return apiError("status must be 'active', 'completed', or 'cancelled'");
      }
      status = body.status;
    }
    if (paidInstallments >= totalInstallments) status = "completed";
    updates.status = status;

    const [row] = await db
      .update(emis)
      .set(updates)
      .where(and(eq(emis.id, id), eq(emis.userId, session.sub)))
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
      .delete(emis)
      .where(and(eq(emis.id, id), eq(emis.userId, session.sub)))
      .returning();

    if (!deleted.length) return apiError("Not found", 404);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if ((error as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
