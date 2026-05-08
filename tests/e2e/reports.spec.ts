/**
 * reports.spec.ts — Monthly reports page (uses saved auth state)
 */
import { test, expect } from "@playwright/test";

test.describe("Reports page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/reports");
    await expect(page).not.toHaveURL(/login/);
  });

  test("renders the reports heading", async ({ page }) => {
    await expect(page.locator("h1").first()).toContainText(/report/i);
  });

  test("shows month and year selectors", async ({ page }) => {
    const monthSelect = page.locator("select").first();
    const yearSelect  = page.locator("select").nth(1);
    await expect(monthSelect).toBeVisible();
    await expect(yearSelect).toBeVisible();
  });

  test("shows summary cards (income/expense)", async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    const body = await page.content();
    // Page should display the labels even if values are zero
    expect(body).toMatch(/income|expense|saving/i);
  });

  test("changing month/year triggers a reload without error", async ({ page }) => {
    const yearSelect = page.locator("select").nth(1);
    await yearSelect.selectOption("2025");
    const monthSelect = page.locator("select").first();
    await monthSelect.selectOption("5"); // May 2025 — has seed data
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL(/login/);
    const body = await page.content();
    expect(body).toMatch(/income|expense|saving|transaction/i);
  });

  test("CSV export button exists", async ({ page }) => {
    const csvBtn = page.locator("button", { hasText: /csv|export/i }).first();
    await expect(csvBtn).toBeVisible();
  });

  test("CSV download responds without error", async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 8000 }),
      page.locator("button", { hasText: /csv|export/i }).first().click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });
});
