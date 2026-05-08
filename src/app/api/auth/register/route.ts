import { NextRequest, NextResponse } from "next/server";
import { eq, count } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // First registered user becomes admin
    const [{ total }] = await db.select({ total: count() }).from(users);
    const role = total === 0 ? "admin" : "member";

    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({ name: name.trim(), email: normalizedEmail, password: passwordHash, role })
      .returning();

    const token = await signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "admin" | "member",
      householdId: user.householdId,
    });

    const res = NextResponse.json({ ok: true }, { status: 201 });
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
