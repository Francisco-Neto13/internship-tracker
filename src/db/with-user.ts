import { sql } from "drizzle-orm";
import { isValidUserId, type Identity } from "@/lib/identity";
import { getAppDatabase, type Database } from "./client";

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Runs `work` in a transaction where RLS policies see `identity` (RF003, RN-37).
 *
 * set_config(..., true) scopes the value to this transaction, which is mandatory
 * because the Neon pooler hands the same connection to other requests afterwards.
 */
export async function withUser<T>(identity: Identity, work: (tx: Transaction) => Promise<T>): Promise<T> {
  // Guards against a forged Identity: app.usuario_atual_id() casts the value to uuid
  if (!isValidUserId(identity.userId)) {
    throw new Error("withUser received an identity without a valid user id");
  }

  return getAppDatabase().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${identity.userId}, true)`);
    return work(tx);
  });
}
