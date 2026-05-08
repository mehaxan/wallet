import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
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

export async function GET() {
  try {
    const session = await requireSession();
    const rows = await db
      .select({
        id: emis.id,
        userId: emis.userId,
        name: emis.name,
        lenderName: emis.lenderName,
        principalAmount: emis.principalAmount,
        emiAmount: emis.emiAmount,
        totalInstallments: emis.totalInstallments,
        paidInstallments: emis.paidInstallments,
        startDate: emis.startDate,
        interestRate: emis.interestRate,
        creditCardId: emis.creditCardId,
        creditCardName: creditCards.cardName,
        creditCardBankName: creditCards.bankName,
        status: emis.status,
        note: emis.note,
        createdAt: emis.createdAt,
        updatedAt: emis.updatedAt,
      })
      .from(emis)
      .leftJoin(creditCards, eq(emis.creditCardId, creditCards.id))
      .where(eq(emis.userId, session.sub))
      .orderBy(desc(emis.createdAt));

    return NextResponse.json(rows);
  } catch (error: unknown) {
    if ((error as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();

    const name = getTrimmedString(body.name);
    if (!name) return apiError("name, principalAmount, emiAmount, totalInstallments, startDate are required");
    if (body.principalAmount === undefined || body.principalAmount === null || body.principalAmount === "") {
      return apiError("name, principalAmount, emiAmount, totalInstallments, startDate are required");
    }
    if (body.emiAmount === undefined || body.emiAmount === null || body.emiAmount === "") {
      return apiError("name, principalAmount, emiAmount, totalInstallments, startDate are required");
    }
    if (body.totalInstallments === undefined || body.totalInstallments === null || body.totalInstallments === "") {
      return apiError("name, principalAmount, emiAmount, totalInstallments, startDate are required");
    }
    if (!body.startDate) {
      return apiError("name, principalAmount, emiAmount, totalInstallments, startDate are required");
    }

    const totalInstallments = parsePositiveInteger(body.totalInstallments, "totalInstallments");
    const paidInstallments = parseNonNegativeInteger(body.paidInstallments ?? 0, "paidInstallments");
    if (paidInstallments > totalInstallments) {
      return apiError("paidInstallments cannot exceed totalInstallments");
    }

    const requestedStatus = body.status ?? "active";
    if (!["active", "completed", "cancelled"].includes(requestedStatus)) {
      return apiError("status must be 'active', 'completed', or 'cancelled'");
    }

    const [row] = await db
      .insert(emis)
      .values({
        userId: session.sub,
        name,
        lenderName: getTrimmedString(body.lenderName) || null,
        principalAmount: parseAmount(body.principalAmount, "principalAmount", false),
        emiAmount: parseAmount(body.emiAmount, "emiAmount", false),
        totalInstallments,
        paidInstallments,
        startDate: parseDateValue(body.startDate, "startDate"),
        interestRate: parseOptionalRate(body.interestRate),
        creditCardId: await ensureCreditCardBelongsToUser(session.sub, body.creditCardId),
        status: paidInstallments >= totalInstallments ? "completed" : requestedStatus,
        note: getTrimmedString(body.note) || null,
      })
      .returning();

    return NextResponse.json(row, { status: 201 });
  } catch (error: unknown) {
    if ((error as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    if (error instanceof ValidationError) return apiError(error.message);
    return apiError("Internal server error", 500);
  }
}
