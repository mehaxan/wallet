import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { investments } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await req.json();
    const [ex] = await db.select().from(investments).where(and(eq(investments.id, id), eq(investments.userId, session.sub)));
    if (!ex) return apiError("Not found", 404);

    const upd: Partial<typeof investments.$inferInsert> = { updatedAt: new Date() };
    if (body.currentValue !== undefined)      upd.currentValue      = String(parseFloat(body.currentValue));
    if (body.units !== undefined)             upd.units             = body.units ? String(parseFloat(body.units)) : null;
    if (body.isTaxRebateEligible !== undefined) upd.isTaxRebateEligible = body.isTaxRebateEligible;
    if (body.note !== undefined)              upd.note              = body.note;

    const [row] = await db.update(investments).set(upd)
      .where(and(eq(investments.id, id), eq(investments.userId, session.sub))).returning();
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
    const deleted = await db.delete(investments).where(and(eq(investments.id, id), eq(investments.userId, session.sub))).returning();
    if (!deleted.length) return apiError("Not found", 404);
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
