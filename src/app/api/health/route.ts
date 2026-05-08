import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { version } from "../../../../package.json";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus: "connected" | "unreachable" = "unreachable";
  let redisStatus: "connected" | "unavailable" | "unconfigured" = "unconfigured";

  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = "connected";
  } catch {
    // db unreachable
  }

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Redis } = await import("@upstash/redis");
      const r = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      await r.ping();
      redisStatus = "connected";
    } catch {
      redisStatus = "unavailable";
    }
  }

  const ok = dbStatus === "connected";
  return NextResponse.json(
    { status: ok ? "ok" : "degraded", service: "wallet", version, db: dbStatus, redis: redisStatus, timestamp: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  );
}

