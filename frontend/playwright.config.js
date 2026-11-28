import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./Tests",
  fullyParallel: true,
  workers: 2,
  timeout: 30000,
  outputDir: "./node_modules/.cache/playwright-results",
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5174 --strictPort",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: false,
  },
});
