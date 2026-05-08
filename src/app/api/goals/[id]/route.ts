import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await req.json();
    const [ex] = await db.select().from(goals).where(and(eq(goals.id, id), eq(goals.userId, session.sub)));
    if (!ex) return apiError("Not found", 404);

    const upd: Partial<typeof goals.$inferInsert> = { updatedAt: new Date() };
    if (body.currentAmount !== undefined) upd.currentAmount = String(parseFloat(body.currentAmount));
    if (body.status !== undefined) upd.status = body.status;

    const [row] = await db.update(goals).set(upd)
      .where(and(eq(goals.id, id), eq(goals.userId, session.sub))).returning();
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
    const deleted = await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, session.sub))).returning();
    if (!deleted.length) return apiError("Not found", 404);
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
