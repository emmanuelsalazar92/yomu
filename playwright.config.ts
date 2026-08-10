import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 1,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3000", trace: "on-first-retry" },
  projects: [
    { name: "phone-390x844", use: { viewport: { width: 390, height: 844 } } },
    { name: "tablet-portrait-768x1024", use: { viewport: { width: 768, height: 1024 } } },
    { name: "tablet-landscape-1024x768", use: { viewport: { width: 1024, height: 768 } } },
    { name: "desktop-1440x900", use: { viewport: { width: 1440, height: 900 } } }
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120000
  }
});
