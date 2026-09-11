-- Runtime roles (RF003, RN-37). Created without login here; each environment enables
-- login with its own password (docker/postgres/init locally, ALTER ROLE on Neon).
-- Neither role may own objects or carry BYPASSRLS: scripts/db/apply-migrations.ts
-- aborts the migration if that ever happens.
do $$
begin
  if not exists (select from pg_roles where rolname = 'app_runtime') then
    create role app_runtime nologin nosuperuser nobypassrls nocreatedb nocreaterole;
  end if;
  if not exists (select from pg_roles where rolname = 'auth_runtime') then
    create role auth_runtime nologin nosuperuser nobypassrls nocreatedb nocreaterole;
  end if;
end
$$;

grant usage on schema public to app_runtime, auth_runtime;
