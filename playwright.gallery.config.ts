import { defineConfig, devices } from "@playwright/test";

// The component gallery is not in the production export, so its tests have their own build and port.
// Run with `npm run test:gallery`. `npm test` (the production export) never sees these.
export default defineConfig({
  testDir: "./tests-gallery",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:4175" },
  webServer: {
    command: "GALLERY=1 npm run build && npx serve out -l 4175 --no-clipboard -c ../serve.json",
    url: "http://localhost:4175/gallery",
    reuseExistingServer: false,
    timeout: 240_000,
  },
  projects: [
    { name: "chromium", testIgnore: /mobile/, use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", testIgnore: /mobile/, use: { ...devices["Desktop Safari"] } },
    // A phone-sized WebKit, for layout and tap-target checks only.
    { name: "mobile-webkit", testMatch: /mobile/, use: { ...devices["iPhone 13"] } },
  ],
});
