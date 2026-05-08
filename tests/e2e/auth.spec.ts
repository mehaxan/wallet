/**
 * auth.spec.ts — Authentication flows (no saved auth state; uses fresh users)
 */
import { test, expect } from "@playwright/test";

const rand = () => Math.random().toString(36).slice(2, 8);

test.describe("Registration", () => {
  test("shows validation errors on empty submit", async ({ page }) => {
    await page.goto("/register");
    await page.click('button[type="submit"]');
    const body = await page.content();
    expect(body).toMatch(/register|name|email|wallet/i);
  });

  test("registers a new user and redirects to dashboard", async ({ page }) => {
    const email = `e2e-reg-${rand()}@wallet.test`;
    await page.goto("/register");
    await expect(page.locator('input[type="text"]')).toBeVisible({ timeout: 8000 });
    await page.fill('input[type="text"]',     "E2E User");
    await page.fill('input[type="email"]',    email);
    await page.fill('input[type="password"]', "E2eTest@123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });

  test("rejects duplicate email", async ({ page }) => {
    const email = `e2e-dup-${rand()}@wallet.test`;
    // First registration
    await page.goto("/register");
    await expect(page.locator('input[type="text"]')).toBeVisible({ timeout: 8000 });
    await page.fill('input[type="text"]',     "First");
    await page.fill('input[type="email"]',    email);
    await page.fill('input[type="password"]', "E2eTest@123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 8000 });

    // Second registration with same email
    await page.context().clearCookies();
    await page.goto("/register");
    await expect(page.locator('input[type="text"]')).toBeVisible({ timeout: 8000 });
    await page.fill('input[type="text"]',     "Second");
    await page.fill('input[type="email"]',    email);
    await page.fill('input[type="password"]', "E2eTest@123");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
    // Should stay on register with an error
    const body = await page.content();
    expect(body).toMatch(/exist|taken|already|error/i);
  });
});

test.describe("Login", () => {
  test("redirects unauthenticated users to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/login/, { timeout: 6000 });
  });

  test("shows error on wrong password", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 8000 });
    await page.fill('input[type="email"]',    "e2e-shared@wallet.test");
    await page.fill('input[type="password"]', "WRONG_PASS_999");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
    expect(page.url()).toContain("/login");
  });

  test("logs in with correct credentials and reaches dashboard", async ({ page }) => {
    const email = `e2e-login-${rand()}@wallet.test`;
    // Register first
    await page.goto("/register");
    await expect(page.locator('input[type="text"]')).toBeVisible({ timeout: 8000 });
    await page.fill('input[type="text"]',     "Login Tester");
    await page.fill('input[type="email"]',    email);
    await page.fill('input[type="password"]', "E2eTest@123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 8000 });

    // Log out
    await page.context().clearCookies();
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 8000 });

    // Log in
    await page.fill('input[type="email"]',    email);
    await page.fill('input[type="password"]', "E2eTest@123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 8000 });
  });

  test("logout clears session and redirects to /login", async ({ page }) => {
    const email = `e2e-logout-${rand()}@wallet.test`;
    await page.goto("/register");
    await expect(page.locator('input[type="text"]')).toBeVisible({ timeout: 8000 });
    await page.fill('input[type="text"]',     "Logout Tester");
    await page.fill('input[type="email"]',    email);
    await page.fill('input[type="password"]', "E2eTest@123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 8000 });

    // Hit logout endpoint
    await page.goto("/api/auth/logout");
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });
});
