import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

export default defineConfig({
  ...config,
  webServer: {
    ...config.webServer,
    command: "pnpm start",
  },
});
