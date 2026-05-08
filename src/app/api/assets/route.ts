import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    const rows = await db.select().from(assets)
      .where(eq(assets.userId, session.sub))
      .orderBy(desc(assets.createdAt));
    return NextResponse.json(rows);
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { type, name, purchasePrice, currentValue, purchaseDate, depreciationMethod, note } = body;

    if (!type || !name || !purchasePrice || !currentValue || !purchaseDate) {
      return apiError("type, name, purchasePrice, currentValue, purchaseDate are required");
    }

    const [row] = await db.insert(assets).values({
      userId: session.sub, type, name,
      purchasePrice: String(parseFloat(purchasePrice)),
      currentValue: String(parseFloat(currentValue)),
      purchaseDate,
      depreciationMethod: depreciationMethod ?? "none",
      note: note ?? null,
    }).returning();

    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
