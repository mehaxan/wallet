import { NextRequest, NextResponse } from "next/server";

function clearCookieResponse(res: NextResponse) {
  res.cookies.set("token", "", { maxAge: 0, path: "/" });
  return res;
}

/** GET /api/auth/logout — clears cookie and redirects to /login */
export async function GET(req: NextRequest) {
  return clearCookieResponse(NextResponse.redirect(new URL("/login", req.url)));
}

/** POST /api/auth/logout — clears cookie (JSON response) */
export async function POST() {
  return clearCookieResponse(NextResponse.json({ ok: true }));
}
