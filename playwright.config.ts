import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 1,
  timeout: 30_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3003",
    headless: process.env.HEADED !== "1",
    slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: "**/global-setup.spec.ts",
    },
    {
      name: "chromium",
      testMatch: ["**/navigation.spec.ts", "**/accounts.spec.ts", "**/transactions.spec.ts", "**/reports.spec.ts", "**/api.spec.ts"],
      use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
    {
      name: "auth-tests",
      testMatch: ["**/auth.spec.ts", "**/journey.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
