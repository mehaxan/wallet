/**
 * global-setup.spec.ts
 * Registers a shared test user and saves auth state for the full test suite.
 * Runs once (via "setup" project) before all other tests.
 */
import { test as setup, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const AUTH_FILE = path.join(__dirname, ".auth/user.json");
export const TEST_EMAIL = "e2e-shared@wallet.test";
export const TEST_PASS  = "E2eTest@123";
export const TEST_NAME  = "E2E Tester";

setup("register and log in shared test user", async ({ page }) => {
  // Try login first (user may already exist from a previous run)
  await page.goto("/login");
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  await page.fill('input[type="email"]',    TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASS);
  await page.click('button[type="submit"]');

  // Wait specifically for /dashboard redirect (not /login — that's the current page)
  await page.waitForURL(/dashboard/, { timeout: 8000 }).catch(() => {});

  if (!page.url().includes("/dashboard")) {
    // Not registered yet → register
    await page.goto("/register");
    await expect(page.locator('input[type="text"]')).toBeVisible({ timeout: 10000 });
    await page.fill('input[type="text"]',     TEST_NAME);
    await page.fill('input[type="email"]',    TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASS);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 12000 });
  }

  // Must be on dashboard
  await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });

  // Save storage state (cookies)
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
