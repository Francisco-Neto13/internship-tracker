import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

const ROOT = path.resolve(__dirname, "../..");
const MIGRATIONS_DIR = path.join(ROOT, "drizzle/migrations");

// Order matters: policies reference roles and functions; triggers reference functions
const SQL_STAGES = ["roles", "functions", "policies", "triggers"] as const;

export async function applyMigrations(connectionString: string, log: (line: string) => void = () => {}) {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_DIR });
    log("table migrations applied");

    await client.query("begin");
    for (const stage of SQL_STAGES) {
      const dir = path.join(ROOT, "drizzle/sql", stage);
      const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort();
      for (const file of files) {
        await client.query(await readFile(path.join(dir, file), "utf8"));
        log(`applied drizzle/sql/${stage}/${file}`);
      }
    }
    await assertRuntimeRolesCannotBypassRls(client);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

// RLS is silently skipped for superusers, BYPASSRLS roles and table owners (RF003).
// Refuse to finish a migration that leaves a runtime role in any of those states.
async function assertRuntimeRolesCannotBypassRls(client: Client) {
  const { rows } = await client.query<{ rolname: string; reason: string }>(`
    select r.rolname, 'superuser or bypassrls' as reason
      from pg_roles r
     where r.rolname in ('app_runtime', 'auth_runtime') and (r.rolsuper or r.rolbypassrls)
    union all
    select c.relowner::regrole::text, 'owns table ' || c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('public', 'app')
       and c.relowner::regrole::text in ('app_runtime', 'auth_runtime')
  `);

  if (rows.length > 0) {
    const detail = rows.map((row) => `${row.rolname}: ${row.reason}`).join("; ");
    throw new Error(`Runtime role would bypass row level security: ${detail}`);
  }
}
