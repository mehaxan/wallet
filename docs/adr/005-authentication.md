# ADR-005: Authentication

**Status:** Accepted  
**Pattern:** Identical to fundy (mehaxan/fundy)

## Decision

**Custom JWT with jose + httpOnly cookie — no NextAuth**

Same exact implementation as fundy:

```typescript
// src/lib/auth.ts — jose JWT
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export interface SessionPayload {
  sub: string;       // user UUID
  email: string;
  name: string;
  role: "owner" | "admin" | "member";
  householdId?: string;
}
```

## Flow

1. `POST /api/auth/login` → verify password → `signToken()` → set httpOnly cookie `token`
2. Every request hits `middleware.ts` → `jwtVerify()` → pass or 401/redirect
3. Server components/routes call `requireSession()` → reads cookie → returns payload

## Middleware (same as fundy)

```typescript
// middleware.ts
const PUBLIC = ["/login", "/register", "/api/auth/login", "/api/auth/register"];

export async function middleware(req: NextRequest) {
  if (PUBLIC.some(p => req.nextUrl.pathname.startsWith(p))) return NextResponse.next();
  
  const token = req.cookies.get("token")?.value;
  if (!token) { /* redirect to login */ }
  
  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch { /* clear cookie + redirect */ }
}
```

## Why Not NextAuth?

Fundy doesn't use it and works fine. Custom jose is:
- Simpler (no config files, providers, callbacks)
- Edge-compatible
- Already proven on Railway via fundy
