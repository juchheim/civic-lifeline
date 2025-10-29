import { defineConfig } from "@playwright/test";

export default defineConfig({
  webServer: {
    command: "pnpm --filter @web dev",
    port: 3000,
    reuseExistingServer: true,
  },
  use: { baseURL: "http://localhost:3000" },
});
