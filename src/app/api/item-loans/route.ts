import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { itemLoans } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const url     = new URL(req.url);
    const status  = url.searchParams.get("status"); // "active" | "returned"

    let rows;
    if (status === "active") {
      rows = await db.select().from(itemLoans)
        .where(and(eq(itemLoans.userId, session.sub), isNull(itemLoans.returnedAt)))
        .orderBy(desc(itemLoans.date));
    } else if (status === "returned") {
      rows = await db.select().from(itemLoans)
        .where(and(eq(itemLoans.userId, session.sub)))
        .orderBy(desc(itemLoans.date));
    } else {
      rows = await db.select().from(itemLoans)
        .where(eq(itemLoans.userId, session.sub))
        .orderBy(desc(itemLoans.date));
    }

    return NextResponse.json(rows);
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body    = await req.json() as { itemName: string; personName: string; direction: "lent" | "borrowed"; date: string; expectedReturnDate?: string; note?: string };

    if (!body.itemName || !body.personName || !body.direction || !body.date) {
      return apiError("itemName, personName, direction, date are required");
    }

    const [row] = await db.insert(itemLoans).values({
      userId: session.sub,
      itemName: body.itemName,
      personName: body.personName,
      direction: body.direction,
      date: body.date,
      expectedReturnDate: body.expectedReturnDate ?? null,
      note: body.note ?? null,
    }).returning();

    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
