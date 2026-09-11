import { applyMigrations } from "./apply-migrations";

const connectionString = process.env.DATABASE_MIGRATION_URL;

if (!connectionString) {
  console.error("DATABASE_MIGRATION_URL is not set (see .env.example)");
  process.exit(1);
}

applyMigrations(connectionString, (line) => console.log(line))
  .then(() => console.log("database is up to date"))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
