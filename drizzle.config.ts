import { defineConfig } from "drizzle-kit";

// Generates table migrations only. Roles, RLS policies, functions and triggers live in
// drizzle/sql and are applied by scripts/db/migrate.ts. Never run `drizzle-kit push`:
// it knows nothing about those objects.
export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_MIGRATION_URL ?? "",
  },
});
