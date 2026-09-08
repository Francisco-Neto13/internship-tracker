import { sql } from "drizzle-orm";
import { db } from "./client";

export async function withUser<T>(
  userId: string,
  work: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return work(tx);
  });
}
