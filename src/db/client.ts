import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Import restricted by lint: only src/db/with-user.ts (app pool) and src/lib/auth.ts
// (auth pool) may reach these. Everything else goes through withUser (RF003, RN-37).

export type Database = NodePgDatabase<typeof schema> & { $client: Pool };

type PoolName = "app" | "auth";

const ENV_BY_POOL: Record<PoolName, string> = {
  app: "DATABASE_URL",
  auth: "DATABASE_AUTH_URL",
};

// Survives hot reload in development, where modules are re-evaluated on every change
const globalForDb = globalThis as unknown as { databases?: Partial<Record<PoolName, Database>> };
const databases = (globalForDb.databases ??= {});

function getDatabase(name: PoolName): Database {
  const existing = databases[name];
  if (existing) return existing;

  const variable = ENV_BY_POOL[name];
  const connectionString = process.env[variable];
  // Without this check pg silently falls back to PG* variables and the OS user
  if (!connectionString) {
    throw new Error(`${variable} is not set (see .env.example)`);
  }

  const database = drizzle({ client: new Pool({ connectionString, max: 10 }), schema });
  databases[name] = database;
  return database;
}

/** Connection as app_runtime. Subject to RLS; use only through withUser. */
export function getAppDatabase(): Database {
  return getDatabase("app");
}

/** Connection as auth_runtime. Reaches auth tables only; use only from src/lib/auth.ts. */
export function getAuthDatabase(): Database {
  return getDatabase("auth");
}

export async function closeDatabases(): Promise<void> {
  const open = Object.values(databases);
  for (const key of Object.keys(databases) as PoolName[]) delete databases[key];
  await Promise.all(open.map((database) => database.$client.end()));
}
