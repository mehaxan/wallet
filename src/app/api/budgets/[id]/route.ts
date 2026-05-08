import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { budgets } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const deleted = await db.delete(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, session.sub)))
      .returning();
    if (!deleted.length) return apiError("Not found", 404);
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
