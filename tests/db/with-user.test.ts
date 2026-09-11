import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getAppDatabase } from "@/db/client";
import { withUser } from "@/db/with-user";
import { createUsuario, identityOf } from "./fixtures";

describe("withUser (RN-37)", () => {
  it("exposes the identity to the database inside the transaction", async () => {
    const usuario = await createUsuario();

    const atual = await withUser(identityOf(usuario.id), async (tx) => {
      const { rows } = await tx.execute<{ id: string }>(sql`select app.usuario_atual_id() as id`);
      return rows[0].id;
    });

    expect(atual).toBe(usuario.id);
  });

  it("does not leak the identity to later queries on pooled connections", async () => {
    const usuario = await createUsuario();
    await withUser(identityOf(usuario.id), async () => undefined);

    // Several queries so the pool hands back the connection the transaction used
    for (let attempt = 0; attempt < 5; attempt++) {
      const { rows } = await getAppDatabase().execute<{ valor: string | null }>(
        sql`select nullif(current_setting('app.user_id', true), '') as valor`,
      );
      expect(rows[0].valor).toBeNull();
    }
  });

  it("rejects an identity whose user id is not a uuid", async () => {
    await expect(withUser(identityOf("' or 1=1 --"), async () => undefined)).rejects.toThrow(/valid user id/);
  });
});
