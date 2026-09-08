import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

export const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }));
