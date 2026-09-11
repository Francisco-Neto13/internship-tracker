-- Local and CI bootstrap. Mirrors the role layout expected in Neon (RF003, RN-37):
--   migrator      owns every object, runs migrations; not a superuser, like neondb_owner
--   app_runtime   domain code; never owner, never BYPASSRLS, so RLS always applies
--   auth_runtime  auth library only; reaches the auth tables and nothing else
-- Passwords here are for localhost only. Production roles get generated passwords.

create role migrator login password 'migrator' createrole;
create role app_runtime login password 'app_runtime' nosuperuser nobypassrls nocreatedb nocreaterole;
create role auth_runtime login password 'auth_runtime' nosuperuser nobypassrls nocreatedb nocreaterole;

create database internship_tracker owner migrator;
create database internship_tracker_test owner migrator;
