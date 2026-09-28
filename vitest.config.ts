import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["__tests__/**/*.test.{ts,tsx}", "tests/hiring/**/*.spec.ts", "lib/**/__tests__/**/*.test.ts"],
    exclude: [
      "lib/marketplace/__tests__/checkout-p6.test.ts",
      "lib/marketplace/__tests__/integration-credentials.test.ts",
      "lib/marketplace/__tests__/shopify-adapter.test.ts",
      "lib/workflows/__tests__/workflow-permissions.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["lib/services/**/*.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@tourify/api-contracts": path.resolve(__dirname, "packages/api-contracts/src/index.ts"),
      "server-only": path.resolve(__dirname, "scripts/test/server-only.ts"),
    },
  },
})
