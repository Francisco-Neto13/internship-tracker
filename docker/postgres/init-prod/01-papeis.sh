#!/bin/sh
# Production bootstrap: same roles as docker/postgres/init (RF003, RN-37), with the generated
# passwords of the environment and without the test database. Runs once, when the data
# directory is created.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v migrator="$MIGRATOR_PASSWORD" -v app="$APP_RUNTIME_PASSWORD" -v auth="$AUTH_RUNTIME_PASSWORD" <<'SQL'
create role migrator login password :'migrator' createrole;
create role app_runtime login password :'app' nosuperuser nobypassrls nocreatedb nocreaterole;
create role auth_runtime login password :'auth' nosuperuser nobypassrls nocreatedb nocreaterole;
create database internship_tracker owner migrator;
SQL
