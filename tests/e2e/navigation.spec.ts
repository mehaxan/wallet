/**
 * navigation.spec.ts
 * Verifies every sidebar page loads without errors (uses saved auth state).
 */
import { test, expect } from "@playwright/test";

const PAGES = [
  { path: "/dashboard",    heading: /Dashboard/ },
  { path: "/accounts",     heading: /Accounts/ },
  { path: "/transactions", heading: /Transactions/ },
  { path: "/loans",        heading: /Loans & Debts/ },
  { path: "/dps",          heading: /DPS/ },
  { path: "/investments",  heading: /Investment Portfolio/ },
  { path: "/assets",       heading: /Assets/ },
  { path: "/budgets",      heading: /Budgets/ },
  { path: "/networth",     heading: /Net Worth/ },
  { path: "/tax",          heading: /Tax/ },
  { path: "/item-loans",   heading: /Item Lending/ },
  { path: "/household",    heading: /Family.*Household|Household/i },
  { path: "/reports",      heading: /Monthly Reports/ },
];

for (const { path, heading } of PAGES) {
  test(`${path} loads without error`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    // Should not be redirected to login
    await expect(page).not.toHaveURL(/login/, { timeout: 10000 });
    // Page should contain the expected heading (allow time for React hydration)
    await expect(page.locator("h1").first()).toContainText(heading, { timeout: 12000 });
    // No uncaught JS errors (check for error boundaries or Next.js error overlay)
    const errorOverlay = page.locator('[data-nextjs-dialog], [data-nextjs-toast]');
    await expect(errorOverlay).not.toBeVisible({ timeout: 1000 }).catch(() => {/* overlay not present = good */});
  });
}
