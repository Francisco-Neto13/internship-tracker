import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const MODULES = [
  "acesso",
  "academico",
  "concedentes",
  "estagios",
  "acompanhamento",
  "atividades",
  "integralizacao",
  "administracao",
];

// RF003, RN-37: a query outside withUser runs without identity. Only the database
// layer and the auth library may reach the connection pools.
const DATABASE_CLIENT = {
  group: ["@/db/client", "**/db/client"],
  message: "Use withUser from @/db/with-user; direct pool access skips the identity RLS depends on.",
};

const PG_DRIVER = {
  name: "pg",
  message: "Database access goes through @/db/with-user.",
};

function restrictedImports(extraPatterns = []) {
  return ["error", { paths: [PG_DRIVER], patterns: [DATABASE_CLIENT, ...extraPatterns] }];
}

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": restrictedImports() },
  },
  // AGENTS.md: modules talk through services, never through another module's repositories
  ...MODULES.map((module) => ({
    files: [`src/modules/${module}/**/*.{ts,tsx}`],
    rules: {
      "no-restricted-imports": restrictedImports([
        {
          group: MODULES.filter((other) => other !== module).map((other) => `@/modules/${other}/repositories/**`),
          message: "Import the other module's services instead of its repositories.",
        },
      ]),
    },
  })),
  {
    files: ["src/db/**/*.ts", "src/lib/auth.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "drizzle/migrations/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
