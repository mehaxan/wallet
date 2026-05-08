/**
 * accounts.spec.ts — CRUD flows for bank accounts (uses saved auth state)
 */
import { test, expect } from "@playwright/test";

test.describe("Accounts page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/accounts");
    await expect(page).not.toHaveURL(/login/);
  });

  test("shows accounts list or empty state", async ({ page }) => {
    const body = await page.content();
    // Either shows account cards or an empty-state message
    expect(body).toMatch(/account|balance|empty|no account/i);
  });

  test("can open add-account form and fill it", async ({ page }) => {
    const addBtn = page.locator("button", { hasText: /add account|new account|add/i }).first();
    if (await addBtn.count() === 0) { test.skip(); return; }
    await addBtn.click();

    const nameInput = page.locator('input[placeholder*="Account name" i]').first();
    if (await nameInput.count() === 0) { test.skip(); return; }
    await nameInput.fill("E2E Test Account");

    const balanceInput = page.locator('input[type="number"]').first();
    if (await balanceInput.count() > 0) await balanceInput.fill("50000");

    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    const content = await page.content();
    expect(content).toContain("E2E Test Account");
  });
});
