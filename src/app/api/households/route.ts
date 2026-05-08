import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { households, householdMembers, users } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** POST /api/households — create a household */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body    = await req.json() as { name: string };

    if (!body.name?.trim()) return apiError("name is required");

    // Check if already in a household
    const user = await db.select({ householdId: users.householdId }).from(users).where(eq(users.id, session.sub));
    if (user[0]?.householdId) return apiError("Already in a household", 409);

    const [hh] = await db.insert(households).values({ name: body.name.trim(), ownerId: session.sub }).returning();

    // Add owner as member
    await db.insert(householdMembers).values({ householdId: hh.id, userId: session.sub, role: "owner" });

    // Link user to household
    await db.update(users).set({ householdId: hh.id }).where(eq(users.id, session.sub));

    return NextResponse.json(hh, { status: 201 });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error(e);
    return apiError("Internal server error", 500);
  }
}

/** GET /api/households — get user's household info */
export async function GET(_req: NextRequest) {
  try {
    const session = await requireSession();
    const [user]  = await db.select({ householdId: users.householdId }).from(users).where(eq(users.id, session.sub));

    if (!user?.householdId) return NextResponse.json({ household: null, members: [] });

    const [hh] = await db.select().from(households).where(eq(households.id, user.householdId));

    const members = await db.select({
      id: householdMembers.id,
      userId: householdMembers.userId,
      role: householdMembers.role,
      joinedAt: householdMembers.joinedAt,
      email: users.email,
      name: users.name,
    })
      .from(householdMembers)
      .leftJoin(users, eq(householdMembers.userId, users.id))
      .where(eq(householdMembers.householdId, user.householdId));

    return NextResponse.json({ household: hh, members });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
