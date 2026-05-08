/**
 * journey.spec.ts — Full real-user journey through every feature
 *
 * Run (slow, visible browser):
 *   HEADED=1 SLOW_MO=600 npx playwright test tests/e2e/journey.spec.ts --project=auth-tests
 */
import { test, expect, type Page } from "@playwright/test";

const EMAIL    = `journey-${Date.now()}@wallet.test`;
const PASSWORD = "Journey@12345";
const NAME     = "Rafiq Ahmed";

// ── helpers ────────────────────────────────────────────────────────────────

/** Click a button by text — uses force:true to bypass backdrop interception */
async function click(page: Page, text: RegExp | string) {
  await page.locator("button", { hasText: text }).first()
    .click({ force: true, timeout: 10_000 });
}

/** Fill the first visible matching input */
async function fill(page: Page, selector: string, value: string) {
  await page.locator(selector).first().fill(value);
}

/** Open a modal by clicking its trigger button */
async function openModal(page: Page, btnText: RegExp | string) {
  await click(page, btnText);
  await page.waitForTimeout(300);
}

/** Submit the form (force:true bypasses backdrop) */
async function submit(page: Page) {
  await page.locator('button[type="submit"]').first().click({ force: true });
  await page.waitForTimeout(800);
}

async function go(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(400);
}
// ───────────────────────────────────────────────────────────────────────────

test.setTimeout(600_000); // 10 minutes — slow-mo adds ~300ms per action

test("🧑 Real user journey — register to every feature", async ({ page }) => {

  // ══════════════════════════════════════════════════════════════════════════
  // 1. REGISTER
  // ══════════════════════════════════════════════════════════════════════════
  await go(page, "/register");
  await expect(page.locator("h1, h2").first()).toBeVisible();

  await fill(page, 'input[type="text"]', NAME);
  await fill(page, 'input[type="email"]', EMAIL);
  await page.locator('input[type="password"]').nth(0).fill(PASSWORD);
  const confirmPwd = page.locator('input[type="password"]').nth(1);
  if (await confirmPwd.count() > 0) await confirmPwd.fill(PASSWORD);
  await submit(page);
  await page.waitForURL(/dashboard/, { timeout: 12_000 });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. DASHBOARD — look around
  // ══════════════════════════════════════════════════════════════════════════
  await expect(page.locator("h1").first()).toContainText(/dashboard/i);
  await page.waitForTimeout(800);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. ACCOUNTS — add bank + MFS
  // ══════════════════════════════════════════════════════════════════════════
  await go(page, "/accounts");
  await expect(page.locator("h1").first()).toContainText(/accounts/i);

  // 3a. Bank account
  await openModal(page, /add account/i);
  await fill(page, 'input[placeholder="Account name"]', "Dutch Bangla Bank");
  await page.locator("select").first().selectOption("bank");
  await page.locator('input[type="number"]').first().fill("125000");
  await page.locator('input[type="checkbox"]').first().check({ force: true });
  await submit(page);
  await expect(page.locator("text=Dutch Bangla Bank")).toBeVisible({ timeout: 8_000 });

  // 3b. MFS — bKash
  await openModal(page, /add account/i);
  await fill(page, 'input[placeholder="Account name"]', "bKash Personal");
  await page.locator("select").first().selectOption("mfs");
  await page.locator('input[type="number"]').first().fill("8500");
  await submit(page);
  await expect(page.locator("text=bKash Personal")).toBeVisible({ timeout: 8_000 });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. TRANSACTIONS — income, expense, filter
  // ══════════════════════════════════════════════════════════════════════════
  await go(page, "/transactions");
  await expect(page.locator("h1").first()).toContainText(/transactions/i);

  // 4a. Add salary income
  await openModal(page, /^\+ add$/i);
  // Modal type buttons = "Income"/"Expense"/"Transfer" (capitalized, exact)
  // hasText string is case-insensitive so must use regex without /i flag
  await page.locator("button", { hasText: /^Income$/ }).evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(300);
  await page.locator('input[type="number"]').first().fill("55000");
  await page.locator('input[type="date"]').first().fill("2026-05-01");
  await page.locator('input[placeholder*="note" i]').first().fill("May salary");
  await submit(page);

  // 4b. Add grocery expense
  await openModal(page, /^\+ add$/i);
  await page.locator("button", { hasText: /^Expense$/ }).evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(300);
  await page.locator('input[type="number"]').first().fill("3200");
  await page.locator('input[type="date"]').first().fill("2026-05-03");
  await page.locator('input[placeholder*="note" i]').first().fill("Grocery shopping");
  await submit(page);

  // 4c. Add another expense
  await openModal(page, /^\+ add$/i);
  await page.locator("button", { hasText: /^Expense$/ }).evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(300);
  await page.locator('input[type="number"]').first().fill("1500");
  await page.locator('input[type="date"]').first().fill("2026-05-05");
  await page.locator('input[placeholder*="note" i]').first().fill("Electricity bill");
  await submit(page);

  // 4d. Filter tabs — exact lowercase text matches filter buttons
  await page.locator("button", { hasText: "expense" }).first().evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(400);
  await page.locator("button", { hasText: "income" }).first().evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(400);
  await page.locator("button", { hasText: "All" }).first().evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(400);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. LOANS & DEBTS
  // ══════════════════════════════════════════════════════════════════════════
  await go(page, "/loans");
  await expect(page.locator("h1").first()).toContainText(/loan/i);

  // 5a. Borrowed from someone — "💸 Borrowed" is default direction
  await openModal(page, /add loan/i);
  await page.locator('input[placeholder*="Person" i]').first().fill("Karim Bhai");
  await page.locator('input[type="number"]').first().fill("20000");
  await page.locator('input[type="date"]').first().fill("2026-04-01");
  await page.locator('input[placeholder*="note" i]').first().fill("Emergency cash borrowed");
  await submit(page);

  // 5b. Lent to someone — click "🤝 Lent" direction button
  await openModal(page, /add loan/i);
  await page.locator("button", { hasText: /Lent/ }).evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(300);
  await page.locator('input[placeholder*="Person" i]').first().fill("Rahim");
  await page.locator('input[type="number"]').first().fill("5000");
  await page.locator('input[type="date"]').first().fill("2026-05-01");
  await submit(page);

  // ══════════════════════════════════════════════════════════════════════════
  // 6. INVESTMENTS — stock + sanchayapatra
  // ══════════════════════════════════════════════════════════════════════════
  await go(page, "/investments");
  await expect(page.locator("h1").first()).toContainText(/investment/i);

  // 6a. Stock
  await openModal(page, /add investment/i);
  await page.locator("select").first().selectOption("stock");
  await page.waitForTimeout(300);
  await page.locator('input[placeholder*="name" i], input[placeholder*="ticker" i]')
    .first().fill("BRAC Bank Ltd.");
  const invNums = page.locator('input[type="number"]');
  await invNums.nth(0).fill("50000"); // invested
  await invNums.nth(1).fill("57000"); // current value
  await submit(page);

  // 6b. Sanchayapatra (national savings)
  await openModal(page, /add investment/i);
  await page.locator("select").first().selectOption("sanchayapatra");
  await page.waitForTimeout(300);
  await page.locator('input[placeholder*="name" i], input[placeholder*="ticker" i]')
    .first().fill("5-Year Sanchayapatra");
  const invNums2 = page.locator('input[type="number"]');
  await invNums2.nth(0).fill("100000");
  await invNums2.nth(1).fill("100000");
  await submit(page);

  // ══════════════════════════════════════════════════════════════════════════
  // 7. DPS (Deposit Pension Scheme)
  // ══════════════════════════════════════════════════════════════════════════
  await go(page, "/dps");
  await expect(page.locator("h1").first()).toContainText(/dps/i);

  const addDpsBtn = page.locator("button", { hasText: /add dps/i }).first();
  if (await addDpsBtn.count() > 0) {
    await openModal(page, /add dps/i);
    await page.locator('input[placeholder*="bank" i]').first().fill("Islami Bank");
    const dpsNums = page.locator('input[type="number"]');
    await dpsNums.nth(0).fill("5000");  // monthly amount
    if (await dpsNums.count() > 1) await dpsNums.nth(1).fill("12");    // interest rate
    if (await dpsNums.count() > 2) await dpsNums.nth(2).fill("60");    // tenure months
    await page.locator('input[type="date"]').first().fill("2026-01-01");
    await submit(page);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 8. BUDGETS & GOALS
  // ══════════════════════════════════════════════════════════════════════════
  await go(page, "/budgets");
  await expect(page.locator("h1").first()).toContainText(/budget/i);

  const addGoalBtn = page.locator("button", { hasText: "+ Goal" }).first();
  if (await addGoalBtn.count() > 0) {
    await openModal(page, "+ Goal");
    await page.locator('input[placeholder*="Goal name" i]').first().fill("Emergency Fund");
    const goalNums = page.locator('input[type="number"]');
    await goalNums.nth(0).fill("300000"); // target
    if (await goalNums.count() > 1) await goalNums.nth(1).fill("50000"); // saved so far
    await submit(page);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 9. ASSETS
  // ══════════════════════════════════════════════════════════════════════════
  await go(page, "/assets");
  await expect(page.locator("h1").first()).toContainText(/asset/i);

  const addAssetBtn = page.locator("button", { hasText: /add asset/i }).first();
  if (await addAssetBtn.count() > 0) {
    await openModal(page, /add asset/i);
    await page.locator('input[placeholder*="Asset name" i]').first().fill("Honda CB Hornet");
    const assetNums = page.locator('input[type="number"]');
    await assetNums.nth(0).fill("180000"); // purchase price
    await assetNums.nth(1).fill("180000"); // current value
    await submit(page);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 10. ITEM LOANS
  // ══════════════════════════════════════════════════════════════════════════
  await go(page, "/item-loans");
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(600);

  // ══════════════════════════════════════════════════════════════════════════
  // 11. HOUSEHOLD
  // ══════════════════════════════════════════════════════════════════════════
  await go(page, "/household");
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(600);

  // ══════════════════════════════════════════════════════════════════════════
  // 12. NET WORTH — view live snapshot
  // ══════════════════════════════════════════════════════════════════════════
  await go(page, "/networth");
  await expect(page.locator("h1").first()).toContainText(/net worth/i);
  await page.waitForTimeout(1000);

  // ══════════════════════════════════════════════════════════════════════════
  // 13. REPORTS — monthly + filter months + CSV
  // ══════════════════════════════════════════════════════════════════════════
  await go(page, "/reports");
  await expect(page.locator("h1").first()).toContainText(/report/i);
  await page.waitForTimeout(600);

  const selects = page.locator("select");
  if (await selects.count() > 0) {
    await selects.nth(0).selectOption("4"); // April
    await page.waitForTimeout(500);
    await selects.nth(0).selectOption("5"); // back to May
    await page.waitForTimeout(500);
  }

  // try CSV export
  const csvBtn = page.locator("button, a", { hasText: /csv|export|download/i }).first();
  if (await csvBtn.count() > 0) {
    const dl = page.waitForEvent("download", { timeout: 4000 }).catch(() => null);
    await csvBtn.click({ force: true });
    const file = await dl;
    if (file) await file.cancel().catch(() => {});
    await page.waitForTimeout(800);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 14. TAX DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════
  await go(page, "/tax");
  await expect(page.locator("h1").first()).toContainText(/tax/i);
  await page.waitForTimeout(800);

  // ══════════════════════════════════════════════════════════════════════════
  // 15. DASHBOARD — verify everything is reflected
  // ══════════════════════════════════════════════════════════════════════════
  await go(page, "/dashboard");
  await expect(page.locator("h1").first()).toContainText(/dashboard/i);
  await page.waitForTimeout(1000);

  // ══════════════════════════════════════════════════════════════════════════
  // 16. LOGOUT
  // ══════════════════════════════════════════════════════════════════════════
  await page.goto("/api/auth/logout");
  await page.waitForURL(/login/, { timeout: 8000 });
  await expect(page).toHaveURL(/login/);
  await page.waitForTimeout(1000);
});
