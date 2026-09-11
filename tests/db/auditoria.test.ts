import { and, desc, eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { auditoria, estudante } from "@/db/schema";
import { withUser } from "@/db/with-user";
import { createEstudante } from "@/modules/academico/services/estudante-service";
import { createAccessScenario, createUsuario, identityOf, owner } from "./fixtures";

type Scenario = Awaited<ReturnType<typeof createAccessScenario>>;

async function trailOf(registroId: string) {
  return owner()
    .select()
    .from(auditoria)
    .where(and(eq(auditoria.tabela, "estudante"), eq(auditoria.registroId, registroId)))
    .orderBy(desc(auditoria.id));
}

describe("audit trail written by trigger (RF065, RN-28)", () => {
  let s: Scenario;

  beforeAll(async () => {
    s = await createAccessScenario();
  });

  it("records the author and the new data of an insert", async () => {
    const novo = await createUsuario();
    const created = await createEstudante(identityOf(s.coordenadorA.id), {
      usuarioId: novo.id,
      cursoId: s.cursoA.id,
      matricula: `AUD-${novo.id.slice(0, 8)}`,
      periodo: 2,
    });

    const [entry] = await trailOf(created.id);

    expect(entry).toMatchObject({ operacao: "INSERT", usuarioId: s.coordenadorA.id, dadosAnteriores: null });
    expect(entry.dadosNovos).toMatchObject({ matricula: created.matricula, curso_id: s.cursoA.id });
  });

  it("records which fields an update changed", async () => {
    await withUser(identityOf(s.administrador.id), (tx) =>
      tx.update(estudante).set({ periodo: 5 }).where(eq(estudante.id, s.estudanteB.id)),
    );

    const [entry] = await trailOf(s.estudanteB.id);

    expect(entry.operacao).toBe("UPDATE");
    expect(entry.usuarioId).toBe(s.administrador.id);
    expect(entry.camposAlterados).toEqual(["atualizado_em", "periodo"]);
  });

  it("records operations made outside the application with no author", async () => {
    const [entry] = await trailOf(s.estudanteA.id);

    expect(entry).toMatchObject({ operacao: "INSERT", usuarioId: null });
  });

  it("blocks update, delete and truncate on the trail, even for the owner", async () => {
    await expect(owner().execute(sql`update auditoria set tabela = 'x'`)).rejects.toThrow();
    await expect(owner().execute(sql`delete from auditoria`)).rejects.toThrow();
    await expect(owner().execute(sql`truncate auditoria`)).rejects.toThrow();
  });

  it("does not let application code write to the trail directly", async () => {
    await expect(
      withUser(identityOf(s.administrador.id), (tx) =>
        tx.execute(sql`insert into auditoria (tabela, registro_id, operacao) values ('estudante', 'x', 'INSERT')`),
      ),
    ).rejects.toThrow();
  });

  it("lets only the administrator read the trail", async () => {
    const count = (userId: string) =>
      withUser(identityOf(userId), async (tx) => {
        const { rows } = await tx.execute<{ total: number }>(sql`select count(*)::int as total from auditoria`);
        return rows[0].total;
      });

    expect(await count(s.administrador.id)).toBeGreaterThan(0);
    expect(await count(s.coordenadorA.id)).toBe(0);
    expect(await count(s.alunoA.id)).toBe(0);
  });
});
