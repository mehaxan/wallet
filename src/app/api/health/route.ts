import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok", service: "wallet", timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { status: "error", service: "wallet", db: "unreachable" },
      { status: 503 },
    );
  }
}
