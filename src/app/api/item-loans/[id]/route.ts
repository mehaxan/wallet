import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { itemLoans } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id }  = await params;
    const body    = await req.json() as { returnedAt?: string };

    const returnedAt = body.returnedAt ? new Date(body.returnedAt) : new Date();

    const [row] = await db.update(itemLoans)
      .set({ returnedAt })
      .where(and(eq(itemLoans.id, id), eq(itemLoans.userId, session.sub)))
      .returning();

    if (!row) return apiError("Not found", 404);
    return NextResponse.json(row);
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id }  = await params;

    const [row] = await db.delete(itemLoans)
      .where(and(eq(itemLoans.id, id), eq(itemLoans.userId, session.sub)))
      .returning({ id: itemLoans.id });

    if (!row) return apiError("Not found", 404);
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
