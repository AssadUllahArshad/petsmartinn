import { existsSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
process.env.TEST_ADMIN_EMAIL ??= process.env.SEED_ADMIN_EMAIL;
process.env.TEST_ADMIN_PASSWORD ??= process.env.SEED_ADMIN_PASSWORD;
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  // These workflows share one seeded database and mutate its catalog.
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
    headless: true,
    channel:
      process.env.PLAYWRIGHT_CHANNEL ||
      (existsSync("/Applications/Google Chrome.app") ? "chrome" : undefined),
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
  reporter: "list",
});
