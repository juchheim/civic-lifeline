import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    environmentMatchGlobs: [
      ["apps/web/components/**", "jsdom"],
      ["apps/web/lib/**", "jsdom"],
    ],
  },
  esbuild: {
    jsx: "automatic",
    jsxDev: true,
    loader: "tsx",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web"),
      "@types": path.resolve(__dirname, "packages/types/src"),
      "@utils": path.resolve(__dirname, "packages/utils/src"),
    },
  },
});
