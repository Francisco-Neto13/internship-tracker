import path from "node:path";
import { defineConfig } from "vitest/config";

// Test database settings. Variables already set (CI, shell) take precedence, and the
// db global setup refuses to run unless every URL points at a *_test database.
process.loadEnvFile(path.resolve(import.meta.dirname, ".env.test"));

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          environment: "node",
          include: ["tests/db/**/*.test.ts"],
          globalSetup: ["tests/db/global-setup.ts"],
          setupFiles: ["tests/db/setup.ts"],
          // One database, shared fixtures: files run one after another
          fileParallelism: false,
          hookTimeout: 60_000,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
