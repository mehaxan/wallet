import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { households, householdMembers, users } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** POST /api/households/invite — invite by email */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body    = await req.json() as { email: string; role?: "member" | "viewer" };

    if (!body.email) return apiError("email is required");

    // Get inviter's household
    const [inviter] = await db.select({ householdId: users.householdId }).from(users).where(eq(users.id, session.sub));
    if (!inviter?.householdId) return apiError("You are not in a household", 400);

    // Verify inviter is owner or member (not viewer)
    const [membership] = await db.select({ role: householdMembers.role })
      .from(householdMembers)
      .where(and(eq(householdMembers.householdId, inviter.householdId), eq(householdMembers.userId, session.sub)));
    if (!membership || membership.role === "viewer") return apiError("Insufficient permissions", 403);

    // Find invitee
    const [invitee] = await db.select({ id: users.id, householdId: users.householdId })
      .from(users).where(eq(users.email, body.email.toLowerCase()));
    if (!invitee) return apiError("User not found", 404);
    if (invitee.householdId) return apiError("User is already in a household", 409);

    // Add to household
    const role = body.role ?? "member";
    const [member] = await db.insert(householdMembers)
      .values({ householdId: inviter.householdId, userId: invitee.id, role })
      .onConflictDoNothing()
      .returning();

    await db.update(users).set({ householdId: inviter.householdId }).where(eq(users.id, invitee.id));

    return NextResponse.json({ message: "User added to household", member }, { status: 201 });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error(e);
    return apiError("Internal server error", 500);
  }
}
