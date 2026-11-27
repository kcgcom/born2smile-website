import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

export default defineConfig({
  ...config,
  timeout: 30_000,
  expect: { ...config.expect, timeout: 5_000 },
  webServer: {
    ...config.webServer,
    command: "pnpm start",
    env: { SITE_CONFIG_DATA_SOURCE: "snapshot" },
    reuseExistingServer: false,
  },
});
