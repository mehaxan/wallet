/**
 * api.spec.ts — Key API endpoints (uses saved auth state via cookies)
 */
import { test, expect } from "@playwright/test";

async function api(page: import("@playwright/test").Page, method: string, path: string, body?: object) {
  return page.evaluate(
    async ({ method, path, body, base }) => {
      const res = await fetch(`${base}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
        credentials: "include",
      });
      return { status: res.status, data: await res.json().catch(() => null) };
    },
    { method, path, body, base: "http://localhost:3003" }
  );
}

test.describe("API health and data endpoints", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a protected page so cookies are active in this context
    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/login/);
  });

  test("GET /api/health returns connected status", async ({ page }) => {
    const { status, data } = await api(page, "GET", "/api/health");
    expect(status).toBe(200);
    expect(data.status).toBe("ok");
  });

  test("GET /api/accounts returns an array", async ({ page }) => {
    const { status, data } = await api(page, "GET", "/api/accounts");
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/transactions returns an array", async ({ page }) => {
    const { status, data } = await api(page, "GET", "/api/transactions");
    expect(status).toBe(200);
    // transactions returns paginated: { data: [], total, limit, offset }
    expect(Array.isArray(data.data ?? data)).toBe(true);
  });

  test("GET /api/loans returns an array", async ({ page }) => {
    const { status, data } = await api(page, "GET", "/api/loans");
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/investments returns an array", async ({ page }) => {
    const { status, data } = await api(page, "GET", "/api/investments");
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/assets returns an array", async ({ page }) => {
    const { status, data } = await api(page, "GET", "/api/assets");
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/budgets returns an array", async ({ page }) => {
    const { status, data } = await api(page, "GET", "/api/budgets");
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/goals returns an array", async ({ page }) => {
    const { status, data } = await api(page, "GET", "/api/goals");
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/networth returns snapshots", async ({ page }) => {
    const { status, data } = await api(page, "GET", "/api/networth");
    expect(status).toBe(200);
    expect(data).toHaveProperty("snapshots");
    expect(Array.isArray(data.snapshots)).toBe(true);
  });

  test("GET /api/tax/summary returns tax data or not-configured", async ({ page }) => {
    const { status, data } = await api(page, "GET", "/api/tax/summary");
    // Either configured (200 with taxableIncome) or not configured yet (200/400 with error)
    expect([200, 400, 404]).toContain(status);
    if (status === 200 && !data.error) {
      expect(data).toHaveProperty("taxableIncome");
    }
  });

  test("GET /api/reports/monthly returns monthly report", async ({ page }) => {
    const { status, data } = await api(page, "GET", "/api/reports/monthly?month=5&year=2025");
    expect(status).toBe(200);
    expect(data).toHaveProperty("totalIncome");
    expect(data).toHaveProperty("totalExpense");
    expect(data).toHaveProperty("savingsRate");
  });

  test("POST /api/accounts creates an account", async ({ page }) => {
    const { status, data } = await api(page, "POST", "/api/accounts", {
      name:    "E2E API Account",
      type:    "bank",      // valid types: cash | bank | mfs | card | other
      balance: 1000,
    });
    expect(status).toBe(201);
    expect(data.name).toBe("E2E API Account");
  });

  test("POST /api/loans creates a loan entry", async ({ page }) => {
    const { status, data } = await api(page, "POST", "/api/loans", {
      personName: "E2E Person",
      amount:     5000,
      direction:  "given",
      startDate:  "2025-01-01",
      note:       "e2e test",
    });
    expect([200, 201]).toContain(status);
    const name = data?.personName ?? data?.[0]?.personName ?? data?.person_name;
    expect(name).toMatch(/E2E Person/);
  });

  test("POST /api/goals creates a goal", async ({ page }) => {
    const { status, data } = await api(page, "POST", "/api/goals", {
      name:          "E2E Goal",
      targetAmount:  100000,
      currentAmount: 0,
      deadline:      "2027-01-01",
    });
    expect([200, 201]).toContain(status);
  });

  test("unauthenticated request to /api/accounts returns 401", async () => {
    // Use Node.js native fetch — zero cookies, zero storageState
    const res = await fetch("http://localhost:3003/api/accounts");
    expect(res.status).toBe(401);
  });
});
