import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getAppDatabase, getAuthDatabase } from "@/db/client";
import { createAccessScenario, owner } from "./fixtures";

// Structural guarantees behind "RLS sem excecao (testado)". A new table, role or function
// that breaks one of these fails here before any policy-specific test runs.
describe("row level security invariants (RF003, RN-37)", () => {
  it("connects each pool with its own runtime role", async () => {
    const app = await getAppDatabase().execute<{ role: string }>(sql`select current_user as role`);
    const auth = await getAuthDatabase().execute<{ role: string }>(sql`select current_user as role`);

    expect(app.rows[0].role).toBe("app_runtime");
    expect(auth.rows[0].role).toBe("auth_runtime");
  });

  it("keeps runtime roles unable to bypass RLS", async () => {
    const { rows } = await owner().execute<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }>(sql`
      select rolname, rolsuper, rolbypassrls from pg_roles where rolname in ('app_runtime', 'auth_runtime')
    `);

    expect(rows).toHaveLength(2);
    for (const role of rows) {
      expect(role, role.rolname).toMatchObject({ rolsuper: false, rolbypassrls: false });
    }
  });

  it("never lets a runtime role own a table or function", async () => {
    const { rows } = await owner().execute<{ objeto: string }>(sql`
      select c.relname as objeto
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname in ('public', 'app')
         and pg_get_userbyid(c.relowner) in ('app_runtime', 'auth_runtime')
      union all
      select p.proname
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname in ('public', 'app')
         and pg_get_userbyid(p.proowner) in ('app_runtime', 'auth_runtime')
    `);

    expect(rows).toEqual([]);
  });

  it("enables RLS on every table in the public schema", async () => {
    const { rows } = await owner().execute<{ tabela: string }>(sql`
      select c.relname as tabela
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
    `);

    expect(rows.map((row) => row.tabela)).toEqual([]);
  });

  it("gives app_runtime no privilege on auth tables", async () => {
    const { rows } = await owner().execute<{ tabela: string; privilegio: string }>(sql`
      select table_name as tabela, privilege_type as privilegio
        from information_schema.role_table_grants
       where grantee = 'app_runtime'
         and table_name in ('sessao', 'conta', 'verificacao', 'limite_requisicao')
    `);

    expect(rows).toEqual([]);
  });

  it("gives runtime roles no DELETE or TRUNCATE on domain tables (nothing relevant is deleted)", async () => {
    const { rows } = await owner().execute<{ tabela: string; privilegio: string }>(sql`
      select table_name as tabela, privilege_type as privilegio
        from information_schema.role_table_grants
       where grantee = 'app_runtime' and privilege_type in ('DELETE', 'TRUNCATE')
    `);

    expect(rows).toEqual([]);
  });

  it("pins search_path on every security definer function", async () => {
    const { rows } = await owner().execute<{ funcao: string }>(sql`
      select p.proname as funcao
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname in ('public', 'app')
         and p.prosecdef
         and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')
    `);

    expect(rows).toEqual([]);
  });

  it("returns zero rows to a query that escapes withUser", async () => {
    await createAccessScenario();

    const estudantes = await getAppDatabase().execute<{ total: number }>(sql`select count(*)::int as total from estudante`);
    const cursos = await getAppDatabase().execute<{ total: number }>(sql`select count(*)::int as total from curso`);

    expect(estudantes.rows[0].total).toBe(0);
    expect(cursos.rows[0].total).toBe(0);
  });

  it("denies app_runtime any access to session tokens and password hashes", async () => {
    await expect(getAppDatabase().execute(sql`select * from sessao`)).rejects.toThrow();
    await expect(getAppDatabase().execute(sql`select * from conta`)).rejects.toThrow();
  });
});
