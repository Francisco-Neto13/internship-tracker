import { Client } from "pg";
import { applyMigrations } from "../../scripts/db/apply-migrations";

const URL_VARIABLES = ["DATABASE_URL", "DATABASE_AUTH_URL", "DATABASE_MIGRATION_URL"] as const;

// Rebuilds the test database from the versioned migrations before the db suite.
// Dropping schemas is destructive, hence the hard guard on the database name.
export default async function setup() {
  for (const variable of URL_VARIABLES) {
    const value = process.env[variable];
    if (!value) throw new Error(`${variable} is not set; start the database with docker compose`);
    const database = new URL(value).pathname.slice(1);
    if (!database.endsWith("_test")) {
      throw new Error(`${variable} points at "${database}"; db tests only run against a *_test database`);
    }
  }

  const connectionString = process.env.DATABASE_MIGRATION_URL!;
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(`
      drop schema if exists drizzle cascade;
      drop schema if exists app cascade;
      drop schema if exists public cascade;
      create schema public;
    `);
  } finally {
    await client.end();
  }

  await applyMigrations(connectionString);
}
