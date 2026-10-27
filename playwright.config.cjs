const { defineConfig } = require("@playwright/test");
const crypto = require("node:crypto");
process.env.GYMWARS_E2E_KEY ||= crypto.randomBytes(32).toString("hex");
module.exports = defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.cjs",
  timeout: 90000,
  expect: { timeout: 10000 },
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  outputDir: "output/e2e/results",
  reporter: [
    ["list"],
    ["html", { outputFolder: "output/e2e/report", open: "never" }],
    ["json", { outputFile: "output/e2e/results.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:5298",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    reducedMotion: "reduce",
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: "desktop",
      testIgnore: "**/production.spec.cjs",
      use: { viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "mobile",
      testIgnore: ["**/production.spec.cjs", "**/advanced.spec.cjs"],
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "production",
      testMatch: "**/production.spec.cjs",
      use: {
        baseURL: "http://127.0.0.1:5299",
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: [
    {
      command: "node scripts/e2eServer.cjs",
      url: "http://127.0.0.1:5298/__e2e/ready",
      timeout: 120000,
      reuseExistingServer: false,
    },
    {
      command: "node scripts/e2eServer.cjs --production",
      url: "http://127.0.0.1:5299/__e2e/ready",
      timeout: 120000,
      reuseExistingServer: false,
    },
  ],
});
