import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { dpsAccounts } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await req.json();

    const [existing] = await db.select().from(dpsAccounts)
      .where(and(eq(dpsAccounts.id, id), eq(dpsAccounts.userId, session.sub)));
    if (!existing) return apiError("Not found", 404);

    const allowed: Partial<typeof dpsAccounts.$inferInsert> = {};
    if (body.status)             allowed.status         = body.status;
    if (body.totalDeposited)     allowed.totalDeposited = body.totalDeposited;
    if (body.note !== undefined) allowed.note           = body.note;
    allowed.updatedAt = new Date();

    const [row] = await db.update(dpsAccounts).set(allowed)
      .where(and(eq(dpsAccounts.id, id), eq(dpsAccounts.userId, session.sub)))
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

    const deleted = await db.delete(dpsAccounts)
      .where(and(eq(dpsAccounts.id, id), eq(dpsAccounts.userId, session.sub)))
      .returning();
    if (!deleted.length) return apiError("Not found", 404);
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
