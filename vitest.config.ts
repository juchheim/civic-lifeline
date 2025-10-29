import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@types": path.resolve(__dirname, "packages/types/src"),
      "@utils": path.resolve(__dirname, "packages/utils/src"),
    },
  },
});
