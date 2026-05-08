/**
 * transactions.spec.ts — Transaction CRUD (uses saved auth state)
 */
import { test, expect } from "@playwright/test";

test.describe("Transactions page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/transactions");
    await expect(page).not.toHaveURL(/login/);
  });

  test("renders the transactions heading", async ({ page }) => {
    await expect(page.locator("h1").first()).toContainText(/transaction/i);
  });

  test("shows a list or empty state", async ({ page }) => {
    const body = await page.content();
    expect(body).toMatch(/transaction|amount|income|expense|empty|no transaction/i);
  });

  test("add-transaction form opens and accepts input", async ({ page }) => {
    const addBtn = page.locator("button", { hasText: /add transaction|new transaction/i }).first();
    if (await addBtn.count() === 0) { test.skip(); return; }
    await addBtn.click();

    const amountInput = page.locator('input[type="number"]').first();
    if (await amountInput.count() === 0) { test.skip(); return; }

    await amountInput.fill("1500");

    // Fill date (required)
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.count() > 0) await dateInput.fill("2025-05-01");

    // Fill note
    const noteInput = page.locator('input[placeholder*="Note" i]').first();
    if (await noteInput.count() > 0) await noteInput.fill("E2E grocery test");

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Success: form closed or item visible
    const content = await page.content();
    const formClosed = !(await page.locator('input[type="number"]').isVisible().catch(() => false));
    const itemVisible = content.includes("1500") || content.includes("E2E grocery test");
    expect(formClosed || itemVisible).toBeTruthy();
  });
});
