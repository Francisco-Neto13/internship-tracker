-- Policies and runtime grants are declarative: drop everything, then the files that
-- follow recreate the intended state inside the same transaction. A policy or grant
-- removed from a file disappears from the database on the next migration.
do $$
declare
  r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end
$$;

revoke all on all tables in schema public from app_runtime, auth_runtime;
revoke all on all sequences in schema public from app_runtime, auth_runtime;
