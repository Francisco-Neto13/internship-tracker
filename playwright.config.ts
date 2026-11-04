import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const HIBP_STUB_PORT = 3999;
const isCI = Boolean(process.env.CI);

// Requires a migrated and seeded database (npm run db:migrate && npm run db:seed).
// CI runs the production build; locally an already running dev server is reused.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // Tests do not wait for movement; e2e/movimento.spec.ts turns it on where motion is the subject
    contextOptions: { reducedMotion: "reduce" },
  },
  // RNF-13: the other browsers run on demand (E2E_NAVEGADORES=1); the CI stays on Chromium
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ...(process.env.E2E_NAVEGADORES
      ? [
          { name: "firefox", use: { ...devices["Desktop Firefox"] } },
          { name: "webkit", use: { ...devices["Desktop Safari"] } },
          { name: "edge", use: { ...devices["Desktop Edge"], channel: "msedge" } },
        ]
      : []),
  ],
  webServer: [
    // Have I Been Pwned stand-in: the pipeline never depends on the real service (RF002)
    {
      command: `node e2e/support/hibp-stub.mjs`,
      url: `http://127.0.0.1:${HIBP_STUB_PORT}/health`,
      reuseExistingServer: !isCI,
      env: { HIBP_STUB_PORT: String(HIBP_STUB_PORT) },
    },
    {
      command: isCI ? "npm run start" : "npm run dev",
      url: `http://localhost:${PORT}/login`,
      reuseExistingServer: !isCI,
      timeout: 180_000,
      env: { HIBP_RANGE_URL: `http://127.0.0.1:${HIBP_STUB_PORT}/range/` },
    },
  ],
});
