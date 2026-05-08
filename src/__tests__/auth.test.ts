import { describe, it, expect } from "vitest";
import { signToken, verifyToken, hashPassword, comparePassword } from "@/lib/auth";

describe("auth — signToken / verifyToken", () => {
  it("round-trips a payload through sign → verify", async () => {
    const payload = { sub: "abc-123", email: "a@b.com", name: "Alice", role: "admin" as const, householdId: null };
    const token = await signToken(payload);
    expect(typeof token).toBe("string");
    const result = await verifyToken(token);
    expect(result?.sub).toBe("abc-123");
    expect(result?.email).toBe("a@b.com");
    expect(result?.role).toBe("admin");
  });

  it("returns null for an invalid token", async () => {
    expect(await verifyToken("not.a.jwt")).toBeNull();
  });

  it("returns null for a tampered token", async () => {
    const payload = { sub: "x", email: "x@x.com", name: "X", role: "member" as const, householdId: null };
    const token = await signToken(payload);
    const tampered = token.slice(0, -4) + "XXXX";
    expect(await verifyToken(tampered)).toBeNull();
  });
});

describe("auth — hashPassword / comparePassword", () => {
  it("hashes a password and verifies the correct one", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).not.toBe("secret123");
    expect(await comparePassword("secret123", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct");
    expect(await comparePassword("wrong", hash)).toBe(false);
  });
});
