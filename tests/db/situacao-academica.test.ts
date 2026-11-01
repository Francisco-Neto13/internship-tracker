import { and, desc, eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { auditoria, estudante } from "@/db/schema";
import { type SituacaoAcademica, transicaoPermitida } from "@/modules/academico/domain/situacao-academica";
import { updateEstudanteDados } from "@/modules/academico/services/estudante-service";
import { createAccessScenario, createEstudante, createUsuario, identityOf, owner } from "./fixtures";

type Scenario = Awaited<ReturnType<typeof createAccessScenario>>;

const TODAS: SituacaoAcademica[] = ["MATRICULADO", "TRANCADO", "FORMADO", "DESLIGADO"];

async function novoEstudante(cursoId: string) {
  const pessoa = await createUsuario();
  return createEstudante(pessoa.id, cursoId);
}

/** Moves a fresh student to `situacao` through allowed steps only (the trigger is on for the owner too). */
async function estudanteEm(cursoId: string, situacao: SituacaoAcademica) {
  const alvo = await novoEstudante(cursoId);
  if (situacao !== "MATRICULADO") {
    await owner().update(estudante).set({ situacaoAcademica: situacao }).where(eq(estudante.id, alvo.id));
  }
  return alvo;
}

describe("academic situation transitions through the service (RF005)", () => {
  let s: Scenario;

  beforeAll(async () => {
    s = await createAccessScenario();
  });

  it("lets coordination lock and unlock an enrolment, with the author in the audit trail", async () => {
    const alvo = await novoEstudante(s.cursoA.id);

    await updateEstudanteDados(identityOf(s.coordenadorA.id), alvo.id, { situacaoAcademica: "TRANCADO" });
    const reaberto = await updateEstudanteDados(identityOf(s.coordenadorA.id), alvo.id, { situacaoAcademica: "MATRICULADO" });

    expect(reaberto.situacaoAcademica).toBe("MATRICULADO");
    const [registro] = await owner()
      .select()
      .from(auditoria)
      .where(and(eq(auditoria.tabela, "estudante"), eq(auditoria.registroId, alvo.id)))
      .orderBy(desc(auditoria.id))
      .limit(1);
    expect(registro).toMatchObject({ usuarioId: s.coordenadorA.id, camposAlterados: expect.arrayContaining(["situacao_academica"]) });
  });

  it("refuses to graduate a locked enrolment and leaves the row untouched", async () => {
    const alvo = await estudanteEm(s.cursoA.id, "TRANCADO");

    await expect(
      updateEstudanteDados(identityOf(s.administrador.id), alvo.id, { situacaoAcademica: "FORMADO", periodo: 8 }),
    ).rejects.toMatchObject({ code: "TRANSICAO_SITUACAO_INVALIDA", kind: "CONFLICT" });

    const [row] = await owner().select().from(estudante).where(eq(estudante.id, alvo.id));
    expect(row).toMatchObject({ situacaoAcademica: "TRANCADO", periodo: alvo.periodo });
  });

  it("keeps FORMADO and DESLIGADO final, even for the administrator", async () => {
    for (const final of ["FORMADO", "DESLIGADO"] as const) {
      const alvo = await estudanteEm(s.cursoA.id, final);
      await expect(
        updateEstudanteDados(identityOf(s.administrador.id), alvo.id, { situacaoAcademica: "MATRICULADO" }),
      ).rejects.toMatchObject({ code: "TRANSICAO_SITUACAO_INVALIDA" });
    }
  });

  it("still edits other fields of a student in a final situation", async () => {
    const alvo = await estudanteEm(s.cursoA.id, "FORMADO");

    const atualizado = await updateEstudanteDados(identityOf(s.administrador.id), alvo.id, { periodo: 10 });
    expect(atualizado).toMatchObject({ periodo: 10, situacaoAcademica: "FORMADO" });
  });
});

describe("academic situation trigger, the second barrier (RF005)", () => {
  let cursoId: string;

  beforeAll(async () => {
    cursoId = (await createAccessScenario()).cursoA.id;
  });

  it("matches the domain table for every pair of situations", async () => {
    const divergencias: string[] = [];

    for (const de of TODAS) {
      for (const para of TODAS) {
        const alvo = await estudanteEm(cursoId, de);
        const aceito = await owner()
          .update(estudante)
          .set({ situacaoAcademica: para })
          .where(eq(estudante.id, alvo.id))
          .then(
            () => true,
            () => false,
          );
        if (aceito !== transicaoPermitida(de, para)) divergencias.push(`${de}>${para}: banco ${aceito ? "aceitou" : "recusou"}`);
      }
    }

    expect(divergencias).toEqual([]);
  });

  it("refuses a new record that does not start as MATRICULADO, even from the owner", async () => {
    const pessoa = await createUsuario();

    await expect(
      owner().execute(sql`
        insert into estudante (usuario_id, curso_id, matricula, periodo, situacao_academica)
        values (${pessoa.id}, ${cursoId}, ${`M-${pessoa.id.slice(0, 8)}`}, 1, 'FORMADO')
      `),
    ).rejects.toMatchObject({ cause: expect.objectContaining({ message: expect.stringMatching(/^TRANSICAO_SITUACAO_INVALIDA:/) }) });
  });
});
