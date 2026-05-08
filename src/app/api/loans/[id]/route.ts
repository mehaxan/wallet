import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { loans } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await req.json();

    const [existing] = await db.select().from(loans)
      .where(and(eq(loans.id, id), eq(loans.userId, session.sub)));
    if (!existing) return apiError("Not found", 404);

    const allowed: Partial<typeof loans.$inferInsert> = { updatedAt: new Date() };
    if (body.status     !== undefined) allowed.status     = body.status;
    if (body.paidAmount !== undefined) allowed.paidAmount = body.paidAmount;
    if (body.note       !== undefined) allowed.note       = body.note;
    if (body.dueDate    !== undefined) allowed.dueDate    = body.dueDate;

    const [row] = await db.update(loans).set(allowed)
      .where(and(eq(loans.id, id), eq(loans.userId, session.sub)))
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
    const deleted = await db.delete(loans)
      .where(and(eq(loans.id, id), eq(loans.userId, session.sub)))
      .returning();
    if (!deleted.length) return apiError("Not found", 404);
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
