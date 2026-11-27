import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

export default defineConfig({
  ...config,
  webServer: {
    ...config.webServer,
    command: "pnpm start",
    env: { SITE_CONFIG_DATA_SOURCE: "snapshot" },
    reuseExistingServer: false,
  },
});
