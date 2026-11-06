import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:4174", acceptDownloads: true },
  // Tests always build the production export fresh and serve it on their own port (4174), so they can
  // never run against a stale build or collide with a preview server on 4173.
  webServer: {
    command: "npm run build && npx serve out -l 4174 --no-clipboard",
    url: "http://localhost:4174",
    reuseExistingServer: false,
    timeout: 240_000,
  },
  projects: [
    { name: "chromium", testIgnore: /mobile\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", testIgnore: /mobile\.spec\.ts/, use: { ...devices["Desktop Safari"] } },
    // A phone-sized WebKit, for layout and tap-target checks only.
    { name: "mobile-webkit", testMatch: /mobile\.spec\.ts/, use: { ...devices["iPhone 13"] } },
  ],
});
