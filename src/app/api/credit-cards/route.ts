import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
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
  const digits = typeof value === "string" ? value.replace(/\D/g, "").slice(-4) : "";
  return digits || null;
}

export async function GET() {
  try {
    const session = await requireSession();
    const rows = await db
      .select()
      .from(creditCards)
      .where(eq(creditCards.userId, session.sub))
      .orderBy(desc(creditCards.createdAt));

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

    const bankName = getTrimmedString(body.bankName);
    const cardName = getTrimmedString(body.cardName);
    if (!bankName || !cardName || body.creditLimit === undefined || body.creditLimit === null || body.creditLimit === "") {
      return apiError("bankName, cardName, creditLimit are required");
    }

    const status = body.status ?? "active";
    if (!["active", "closed"].includes(status)) {
      return apiError("status must be 'active' or 'closed'");
    }

    const [row] = await db
      .insert(creditCards)
      .values({
        userId: session.sub,
        bankName,
        cardName,
        lastFour: parseLastFour(body.lastFour),
        creditLimit: parseAmount(body.creditLimit, "creditLimit", false),
        currentBalance: parseAmount(body.currentBalance ?? 0, "currentBalance"),
        statementDay: parseOptionalDay(body.statementDay, "statementDay"),
        dueDay: parseOptionalDay(body.dueDay, "dueDay"),
        interestRate: parseOptionalRate(body.interestRate),
        status,
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
