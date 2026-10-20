import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { withUser } from "@/db/with-user";
import {
  alterarAcompanhamento,
  alterarCriterio,
  criarCriterio,
  getMediaAvaliacoesConcedente,
  listAcompanhamentos,
  listAvaliacoes,
  listCriterios,
  registrarAcompanhamento,
  registrarAvaliacao,
} from "@/modules/acompanhamento/services/avaliacao-service";
import { closeOwnerDatabase, createMundoEstagio, createUsuario, grantPerfil, owner } from "./fixtures";
import { como, estagioAtivo } from "./estagio-helpers";

// RF042, RF043, RF014 (evaluation) and RF033 (follow-up), DER-LOGICO §4.5

afterAll(closeOwnerDatabase);

let administrador: { id: string };

beforeAll(async () => {
  administrador = await createUsuario();
  await grantPerfil(administrador.id, "ADMINISTRADOR");
  await criarCriterio(como(administrador), { codigo: `ASSIDUIDADE_${sufixo()}`, descricao: "Assiduidade e pontualidade", escalaMinima: 1, escalaMaxima: 5, ordem: 1 });
  await criarCriterio(como(administrador), { codigo: `TECNICA_${sufixo()}`, descricao: "Conhecimento técnico", escalaMinima: 0, escalaMaxima: 10, ordem: 2 });
});

function sufixo() {
  return randomUUID().slice(0, 8).toUpperCase();
}

/** Grades for every active criterion: the top of each scale, or the bottom. */
async function respostas(quem: { id: string }, extremo: "max" | "min" = "max") {
  const criterios = await listCriterios(como(quem));
  return criterios.map((criterio) => ({ criterioId: criterio.id, nota: extremo === "max" ? criterio.escalaMaxima : criterio.escalaMinima, comentario: null }));
}

const final = (itens: Awaited<ReturnType<typeof respostas>>) => ({ momento: "FINAL" as const, periodoInicio: null, periodoFim: null, observacoes: null, respostas: itens });

describe("critérios (RF042)", () => {
  it("only the administrator defines them; codes are unique", async () => {
    const mundo = await createMundoEstagio();
    for (const pessoa of [mundo.coordenador, mundo.supervisor]) {
      await expect(criarCriterio(como(pessoa), { codigo: `X_${sufixo()}`, descricao: "x", escalaMinima: 1, escalaMaxima: 5, ordem: 0 })).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
    }
    const codigo = `DUP_${sufixo()}`;
    const criado = await criarCriterio(como(administrador), { codigo, descricao: "Comunicação", escalaMinima: 1, escalaMaxima: 5, ordem: 3 });
    await expect(criarCriterio(como(administrador), { codigo, descricao: "y", escalaMinima: 1, escalaMaxima: 5, ordem: 0 })).rejects.toMatchObject({ code: "CODIGO_DUPLICADO" });
    await expect(alterarCriterio(como(administrador), criado.id, { escalaMinima: 5, escalaMaxima: 5 })).rejects.toMatchObject({ code: "ESCALA_INVALIDA" });
    await alterarCriterio(como(administrador), criado.id, { ativo: false });
  });

  it("an answered criterion keeps its meaning: deactivated, never rewritten", async () => {
    const criado = await criarCriterio(como(administrador), { codigo: `USO_${sufixo()}`, descricao: "Iniciativa", escalaMinima: 1, escalaMaxima: 5, ordem: 4 });
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    await registrarAvaliacao(como(mundo.supervisor), id, final(await respostas(mundo.supervisor)));
    await expect(alterarCriterio(como(administrador), criado.id, { escalaMaxima: 10 })).rejects.toMatchObject({ code: "CRITERIO_EM_USO" });
    await expect(alterarCriterio(como(administrador), criado.id, { ativo: false, ordem: 9 })).resolves.toMatchObject({ ativo: false });
  });
});

describe("avaliação de desempenho (RF042, RF043)", () => {
  it("the supervisor evaluates a period and the representative the end, each under its profile", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const periodica = await registrarAvaliacao(como(mundo.supervisor), id, {
      momento: "PERIODICA",
      periodoInicio: "2026-08-03",
      periodoFim: "2026-09-30",
      observacoes: "Boa evolução",
      respostas: await respostas(mundo.supervisor),
    });
    expect(periodica).toMatchObject({ avaliadorPerfil: "SUPERVISOR", momento: "PERIODICA" });
    const fim = await registrarAvaliacao(como(mundo.representante), id, final(await respostas(mundo.representante, "min")));
    expect(fim).toMatchObject({ avaliadorPerfil: "CONCEDENTE", periodoInicio: null });
    await expect(registrarAvaliacao(como(mundo.supervisor), id, final(await respostas(mundo.supervisor)))).rejects.toMatchObject({ code: "AVALIACAO_FINAL_EXISTENTE" });

    const lidas = await listAvaliacoes(como(mundo.aluno), id);
    expect(lidas.map((avaliacao) => [avaliacao.momento, avaliacao.media])).toEqual([
      ["FINAL", 0],
      ["PERIODICA", 10],
    ]);
  });

  it("requires a grade within the scale for every active criterion, listing the problems", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const todas = await respostas(mundo.supervisor);
    await expect(registrarAvaliacao(como(mundo.supervisor), id, final(todas.slice(1)))).rejects.toMatchObject({
      code: "AVALIACAO_INCOMPLETA",
      details: [expect.objectContaining({ code: "CRITERIO_AUSENTE" })],
    });
    await expect(registrarAvaliacao(como(mundo.supervisor), id, final([{ ...todas[0], nota: 1000 }, ...todas.slice(1)]))).rejects.toMatchObject({
      code: "AVALIACAO_INCOMPLETA",
      details: [expect.objectContaining({ code: "NOTA_FORA_DA_ESCALA" })],
    });
  });

  it("only the concedente's side evaluates, and periods are closed and inside the internship", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    for (const pessoa of [mundo.aluno, mundo.orientador, mundo.coordenador]) {
      await expect(registrarAvaliacao(como(pessoa), id, final(await respostas(pessoa)))).rejects.toMatchObject({ code: "AVALIACAO_RESTRITA_A_CONCEDENTE" });
    }
    const periodo = { momento: "PERIODICA" as const, observacoes: null, respostas: await respostas(mundo.supervisor) };
    await expect(registrarAvaliacao(como(mundo.supervisor), id, { ...periodo, periodoInicio: "2026-08-03", periodoFim: "2027-01-31" })).rejects.toMatchObject({
      code: "DATA_FUTURA",
    });
    await expect(registrarAvaliacao(como(mundo.supervisor), id, { ...periodo, periodoInicio: "2026-07-01", periodoFim: "2026-08-31" })).rejects.toMatchObject({
      code: "PERIODO_INVALIDO",
    });
  });

  it("grades enter only with their evaluation (database barrier)", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const avaliacao = await registrarAvaliacao(como(mundo.supervisor), id, final(await respostas(mundo.supervisor)));
    const novo = await criarCriterio(como(administrador), { codigo: `TARDIO_${sufixo()}`, descricao: "Criado depois", escalaMinima: 1, escalaMaxima: 5, ordem: 8 });
    try {
      await expect(
        withUser(como(mundo.supervisor), (tx) => tx.insert(schema.respostaAvaliacao).values({ avaliacaoId: avaliacao.id, criterioId: novo.id, nota: 3 })),
      ).rejects.toMatchObject({ cause: { message: expect.stringContaining("AVALIACAO_FECHADA") } });
    } finally {
      await alterarCriterio(como(administrador), novo.id, { ativo: false });
    }
  });

  it("is read by the internship's people, not by the administrator", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    await registrarAvaliacao(como(mundo.supervisor), id, final(await respostas(mundo.supervisor)));
    for (const pessoa of [mundo.aluno, mundo.orientador, mundo.coordenador, mundo.representante, mundo.supervisor]) {
      expect(await listAvaliacoes(como(pessoa), id)).toHaveLength(1);
    }
    await expect(listAvaliacoes(como(administrador), id)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
  });
});

describe("média de avaliações da concedente (RF014)", () => {
  it("averages the final evaluations of its internships on a 0 to 10 scale", async () => {
    const mundo = await createMundoEstagio();
    const primeiro = await estagioAtivo(mundo);
    await registrarAvaliacao(como(mundo.supervisor), primeiro, final(await respostas(mundo.supervisor, "max")));
    // A periodic evaluation does not count: one final per internship weighs the same
    await registrarAvaliacao(como(mundo.supervisor), primeiro, {
      momento: "PERIODICA",
      periodoInicio: "2026-08-03",
      periodoFim: "2026-08-31",
      observacoes: null,
      respostas: await respostas(mundo.supervisor, "min"),
    });

    const outroAluno = await createUsuario();
    await grantPerfil(outroAluno.id, "ESTUDANTE");
    expect(await getMediaAvaliacoesConcedente(como(mundo.representante), mundo.concedente.id)).toEqual({ media: 10, avaliacoes: 1 });
    expect(await getMediaAvaliacoesConcedente(como(outroAluno), mundo.concedente.id)).toEqual({ media: null, avaliacoes: 0 });
    expect(await getMediaAvaliacoesConcedente(como(administrador), mundo.concedente.id)).toEqual({ media: 10, avaliacoes: 1 });
  });
});

describe("acompanhamento (RF033, RN-11)", () => {
  const visita = { tipo: "VISITA" as const, dataOcorrencia: "2026-09-10", participantes: "Orientador, supervisor e estudante", observacoes: "Atividades conforme o plano" };

  it("the advisor records what already happened; advisor and coordination read", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const registro = await registrarAcompanhamento(como(mundo.orientador), id, visita);
    expect(registro).toMatchObject({ registradoPorUsuarioId: mundo.orientador.id, tipo: "VISITA" });
    await expect(registrarAcompanhamento(como(mundo.orientador), id, { ...visita, dataOcorrencia: "2027-03-01" })).rejects.toMatchObject({ code: "DATA_FUTURA" });
    await expect(registrarAcompanhamento(como(mundo.orientador), id, { ...visita, dataOcorrencia: "2026-07-01" })).rejects.toMatchObject({ code: "DATA_FORA_DO_ESTAGIO" });
    for (const pessoa of [mundo.supervisor, mundo.coordenador, mundo.aluno]) {
      await expect(registrarAcompanhamento(como(pessoa), id, visita)).rejects.toMatchObject({ code: "ACOMPANHAMENTO_RESTRITO_AO_ORIENTADOR" });
    }
    expect(await listAcompanhamentos(como(mundo.coordenador), id)).toHaveLength(1);
    for (const pessoa of [mundo.aluno, mundo.supervisor, mundo.representante]) {
      await expect(listAcompanhamentos(como(pessoa), id)).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
    }
  });

  it("only its author edits; the audit trail keeps the change without the notes", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const registro = await registrarAcompanhamento(como(mundo.orientador), id, { ...visita, observacoes: "Estudante relatou problema de saúde" });
    await expect(alterarAcompanhamento(como(mundo.coordenador), registro.id, { participantes: "x" })).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
    await expect(alterarAcompanhamento(como(mundo.orientador), registro.id, { tipo: "REUNIAO" })).resolves.toMatchObject({ tipo: "REUNIAO" });
    const trilha = await owner()
      .select()
      .from(schema.auditoria)
      .where(and(eq(schema.auditoria.tabela, "acompanhamento"), eq(schema.auditoria.registroId, registro.id)));
    expect(trilha.map((linha) => linha.operacao)).toEqual(["INSERT", "UPDATE"]);
    expect(JSON.stringify(trilha)).not.toContain("saúde");
  });
});
