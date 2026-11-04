import { and, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { withUser } from "@/db/with-user";
import {
  cadastrarAtividade,
  complementarAtividade,
  decidirAtividade,
  getAtividade,
  listAtividades,
  listAtividadesPagina,
  listFilaAnalise,
  listFilaAnalisePagina,
  reenviarAtividade,
} from "@/modules/atividades/services/atividade-service";
import {
  closeOwnerDatabase,
  createCategoriaComLimite,
  createComprovanteDoEstudante,
  createCurso,
  createEstudante,
  createUsuario,
  grantPerfil,
  owner,
} from "./fixtures";
import { como } from "./estagio-helpers";

// RF048 to RF055 (DER-LOGICO §4.6, §5.10): registration with proof, duplicates, analysis with
// the category limit and the course total, complementation with history, and visibility.

afterAll(closeOwnerDatabase);

async function cenario(options: { limiteCategoriaHoras?: number; totalCursoHoras?: number } = {}) {
  const curso = await createCurso();
  if (options.totalCursoHoras !== undefined) {
    await owner().update(schema.curso).set({ cargaAtividadesComplementaresMinutos: options.totalCursoHoras * 60 }).where(eq(schema.curso.id, curso.id));
  }
  const coordenador = await createUsuario();
  await grantPerfil(coordenador.id, "COORDENACAO", { cursoId: curso.id });
  const aluno = await createUsuario();
  await grantPerfil(aluno.id, "ESTUDANTE");
  const estudante = await createEstudante(aluno.id, curso.id);
  const categoria = await createCategoriaComLimite(curso.id, (options.limiteCategoriaHoras ?? 60) * 60);
  return { curso, coordenador, aluno, estudante, categoria };
}

type Cenario = Awaited<ReturnType<typeof cenario>>;
let sequencia = 0;

async function cadastrar(c: Cenario, horas: number, ajustes: { documentoIds?: string[]; descricao?: string } = {}) {
  const documentoIds = ajustes.documentoIds ?? [(await createComprovanteDoEstudante(c.estudante.id, c.aluno.id)).id];
  return cadastrarAtividade(como(c.aluno), {
    categoriaId: c.categoria.id,
    descricao: ajustes.descricao ?? `Curso de extensão ${++sequencia}`,
    instituicaoPromotora: "UFAL",
    dataInicio: "2026-05-04",
    dataFim: "2026-05-29",
    horasDeclaradasMinutos: horas * 60,
    documentoIds,
    origemEstagioId: null,
  });
}

describe("paginação no servidor (RNF-11)", () => {
  it("pages the queue oldest first with a preview, and the student's list without repeating", async () => {
    const c = await cenario();
    const primeira = await cadastrar(c, 10);
    const segunda = await cadastrar(c, 20);
    const terceira = await cadastrar(c, 30);

    const paginaDe = (page: number) => listAtividadesPagina(como(c.aluno), { estudanteId: c.estudante.id }, { page, limit: 2 });
    const [umaPagina, outraPagina] = [await paginaDe(1), await paginaDe(2)];
    expect(umaPagina.total).toBe(3);
    expect(umaPagina.items).toHaveLength(2);
    expect(outraPagina.items).toHaveLength(1);
    expect([...umaPagina.items, ...outraPagina.items].map((item) => item.id).sort()).toEqual([primeira.id, segunda.id, terceira.id].sort());

    // Filtered by the scenario's course coordinator, who reads only this queue
    const fila = await listFilaAnalisePagina(como(c.coordenador), { page: 1, limit: 2 });
    expect(fila.total).toBe(3);
    expect(fila.items.map((item) => item.atividade.id)).toEqual([primeira.id, segunda.id]);
    expect(fila.items[0].previa).toMatchObject({ aproveitadosMinutos: 600 });
    expect((await listFilaAnalisePagina(como(c.coordenador), { page: 2, limit: 2 })).items.map((item) => item.atividade.id)).toEqual([terceira.id]);
  });

  it("a page stays inside what RLS shows", async () => {
    const c = await cenario();
    await cadastrar(c, 10);
    const outro = await cenario();
    expect(await listFilaAnalisePagina(como(outro.coordenador), { page: 1, limit: 10 })).toEqual({ items: [], total: 0 });
    expect(await listAtividadesPagina(como(outro.aluno), { estudanteId: c.estudante.id }, { page: 1, limit: 10 })).toEqual({ items: [], total: 0 });
  });
});

describe("cadastro (RF049, RF050, RF053)", () => {
  it("the student registers with proof; the activity goes straight to analysis", async () => {
    const c = await cenario();
    const atividade = await cadastrar(c, 20);
    expect(atividade).toMatchObject({ situacao: "EM_ANALISE", horasDeclaradasMinutos: 1200, horasAproveitadasMinutos: null, estudanteId: c.estudante.id });
    const { comprovantes } = await getAtividade(como(c.aluno), atividade.id);
    expect(comprovantes).toHaveLength(1);
    expect((await listFilaAnalise(como(c.coordenador))).map((item) => item.atividade.id)).toContain(atividade.id);
  });

  it("requires a proof, a finished activity and a category the course counts", async () => {
    const c = await cenario();
    await expect(cadastrar(c, 10, { documentoIds: [] })).rejects.toMatchObject({ code: "COMPROVANTE_OBRIGATORIO" });
    const documento = await createComprovanteDoEstudante(c.estudante.id, c.aluno.id);
    const base = { categoriaId: c.categoria.id, descricao: "Monitoria", instituicaoPromotora: "UFAL", horasDeclaradasMinutos: 600, documentoIds: [documento.id], origemEstagioId: null };
    await expect(cadastrarAtividade(como(c.aluno), { ...base, dataInicio: "2026-10-01", dataFim: "2027-01-10" })).rejects.toMatchObject({ code: "ATIVIDADE_FUTURA" });
    const outroCurso = await createCurso();
    const alheia = await createCategoriaComLimite(outroCurso.id, 600);
    await expect(cadastrarAtividade(como(c.aluno), { ...base, categoriaId: alheia.id, dataInicio: "2026-05-01", dataFim: "2026-05-02" })).rejects.toMatchObject({
      code: "CATEGORIA_FORA_DO_CURSO",
    });
  });

  it("the database refuses an activity without proof (checked at commit)", async () => {
    const c = await cenario();
    await expect(
      withUser(como(c.aluno), (tx) =>
        tx.insert(schema.atividadeComplementar).values({
          estudanteId: c.estudante.id,
          categoriaId: c.categoria.id,
          descricao: "Sem comprovante",
          instituicaoPromotora: "UFAL",
          dataInicio: "2026-05-01",
          dataFim: "2026-05-02",
          horasDeclaradasMinutos: 60,
          registradaPorUsuarioId: c.aluno.id,
        }),
      ),
    ).rejects.toMatchObject({ cause: { message: expect.stringContaining("COMPROVANTE_OBRIGATORIO") } });
  });

  it("only the student registers its own activity", async () => {
    const c = await cenario();
    const documento = await createComprovanteDoEstudante(c.estudante.id, c.aluno.id);
    await expect(
      cadastrarAtividade(como(c.coordenador), {
        categoriaId: c.categoria.id,
        descricao: "x",
        instituicaoPromotora: "x",
        dataInicio: "2026-05-01",
        dataFim: "2026-05-02",
        horasDeclaradasMinutos: 60,
        documentoIds: [documento.id],
        origemEstagioId: null,
      }),
    ).rejects.toMatchObject({ code: "CADASTRO_RESTRITO_AO_ESTUDANTE" });
  });
});

describe("duplicidade (RF052)", () => {
  it("the same file is refused, pointing at the activity that used it", async () => {
    const c = await cenario();
    const sha = "ab".repeat(32);
    const primeira = await cadastrar(c, 10, { documentoIds: [(await createComprovanteDoEstudante(c.estudante.id, c.aluno.id, sha)).id] });
    const copia = await createComprovanteDoEstudante(c.estudante.id, c.aluno.id, sha);
    await expect(cadastrar(c, 10, { documentoIds: [copia.id] })).rejects.toMatchObject({
      code: "COMPROVANTE_DUPLICADO",
      details: [expect.objectContaining({ issue: primeira.id })],
    });
  });

  it("the same activity twice is refused", async () => {
    const c = await cenario();
    await cadastrar(c, 10, { descricao: "Semana de Tecnologia" });
    await expect(cadastrar(c, 10, { descricao: "semana de tecnologia" })).rejects.toMatchObject({ code: "ATIVIDADE_DUPLICADA" });
  });
});

describe("análise e limites (RF051, RF054, RN-23)", () => {
  it("counts within the category limit and reports the excess with its reason", async () => {
    const c = await cenario({ limiteCategoriaHoras: 30 });
    const primeira = await cadastrar(c, 20);
    const segunda = await cadastrar(c, 20);
    const [previaPrimeira] = (await listFilaAnalise(como(c.coordenador))).filter((item) => item.atividade.id === primeira.id);
    expect(previaPrimeira.previa).toEqual({ aproveitadosMinutos: 1200, excedentesMinutos: 0, limitadoPor: null });

    await decidirAtividade(como(c.coordenador), primeira.id, "APROVADA", null);
    const [previaSegunda] = (await listFilaAnalise(como(c.coordenador))).filter((item) => item.atividade.id === segunda.id);
    expect(previaSegunda.previa).toMatchObject({ aproveitadosMinutos: 600, excedentesMinutos: 600, limitadoPor: "CATEGORIA" });

    const { analise, atividade } = await decidirAtividade(como(c.coordenador), segunda.id, "APROVADA", null);
    expect(analise).toMatchObject({ horasAproveitadasMinutos: 600, minutosExcedentes: 600, analisadoPorUsuarioId: c.coordenador.id });
    expect(analise.motivoExcedente).toContain(c.categoria.nome);
    expect(atividade).toMatchObject({ situacao: "APROVADA", horasAproveitadasMinutos: 600 });
  });

  it("counts within the course total", async () => {
    const c = await cenario({ limiteCategoriaHoras: 100, totalCursoHoras: 25 });
    const atividade = await cadastrar(c, 40);
    const { analise } = await decidirAtividade(como(c.coordenador), atividade.id, "APROVADA", null);
    expect(analise).toMatchObject({ horasAproveitadasMinutos: 1500, minutosExcedentes: 900 });
    expect(analise.motivoExcedente).toContain("Carga total");
  });

  it("two approvals at once cannot pass the limit together", async () => {
    const c = await cenario({ limiteCategoriaHoras: 30 });
    const a = await cadastrar(c, 20);
    const b = await cadastrar(c, 20);
    await Promise.all([decidirAtividade(como(c.coordenador), a.id, "APROVADA", null), decidirAtividade(como(c.coordenador), b.id, "APROVADA", null)]);
    const aprovadas = await listAtividades(como(c.aluno), { situacao: "APROVADA" });
    expect(aprovadas.reduce((total, item) => total + (item.horasAproveitadasMinutos ?? 0), 0)).toBe(1800);
  });

  it("a refusal needs a reason, is final and frees the proof for a new activity", async () => {
    const c = await cenario();
    const sha = "cd".repeat(32);
    const atividade = await cadastrar(c, 10, { documentoIds: [(await createComprovanteDoEstudante(c.estudante.id, c.aluno.id, sha)).id] });
    await expect(decidirAtividade(como(c.coordenador), atividade.id, "RECUSADA", " ")).rejects.toMatchObject({ code: "MOTIVO_OBRIGATORIO" });
    await decidirAtividade(como(c.coordenador), atividade.id, "RECUSADA", "Certificado sem carga horária");
    await expect(decidirAtividade(como(c.coordenador), atividade.id, "APROVADA", null)).rejects.toMatchObject({ code: "ATIVIDADE_NAO_ANALISAVEL" });
    await expect(reenviarAtividade(como(c.aluno), atividade.id)).rejects.toMatchObject({ code: "TRANSICAO_ATIVIDADE_INVALIDA" });
    // No appeal: a new activity, with the same file, is accepted
    const nova = await cadastrar(c, 10, { documentoIds: [(await createComprovanteDoEstudante(c.estudante.id, c.aluno.id, sha)).id] });
    expect(nova.situacao).toBe("EM_ANALISE");
  });

  it("only the coordination of the student's course analyzes", async () => {
    const c = await cenario();
    const atividade = await cadastrar(c, 10);
    await expect(decidirAtividade(como(c.aluno), atividade.id, "APROVADA", null)).rejects.toMatchObject({ code: "ANALISE_RESTRITA_A_COORDENACAO" });
    const outro = await cenario();
    await expect(decidirAtividade(como(outro.coordenador), atividade.id, "APROVADA", null)).rejects.toMatchObject({ code: "ATIVIDADE_NAO_ENCONTRADA" });
  });
});

describe("complementação (RF055)", () => {
  it("a returned activity is corrected, gets new proof and goes back to analysis with its history", async () => {
    const c = await cenario();
    const atividade = await cadastrar(c, 20);
    await decidirAtividade(como(c.coordenador), atividade.id, "DEVOLVIDA", "Envie o certificado com a carga horária");
    const { comprovantes } = await getAtividade(como(c.aluno), atividade.id);
    const novo = await createComprovanteDoEstudante(c.estudante.id, c.aluno.id);
    await complementarAtividade(como(c.aluno), atividade.id, {
      dados: { horasDeclaradasMinutos: 900 },
      adicionarDocumentoIds: [novo.id],
      retirarComprovanteIds: [comprovantes[0].id],
    });
    await expect(reenviarAtividade(como(c.aluno), atividade.id)).resolves.toMatchObject({ situacao: "EM_ANALISE", horasDeclaradasMinutos: 900 });
    await decidirAtividade(como(c.coordenador), atividade.id, "APROVADA", null);

    const detalhe = await getAtividade(como(c.coordenador), atividade.id);
    expect(detalhe.analises.map((analise) => analise.decisao)).toEqual(["APROVADA", "DEVOLVIDA"]);
    expect(detalhe.comprovantes.map((comprovante) => comprovante.valido)).toEqual([false, true]);
  });

  it("an activity in analysis does not change, and resending needs a valid proof", async () => {
    const c = await cenario();
    const atividade = await cadastrar(c, 20);
    await expect(complementarAtividade(como(c.aluno), atividade.id, { dados: { descricao: "outra" }, adicionarDocumentoIds: [], retirarComprovanteIds: [] })).rejects.toMatchObject({
      code: "ATIVIDADE_IMUTAVEL",
    });
    await expect(
      withUser(como(c.aluno), (tx) => tx.update(schema.atividadeComplementar).set({ descricao: "outra" }).where(eq(schema.atividadeComplementar.id, atividade.id))),
    ).rejects.toMatchObject({ cause: { message: expect.stringContaining("ATIVIDADE_IMUTAVEL") } });

    await decidirAtividade(como(c.coordenador), atividade.id, "DEVOLVIDA", "Falta o certificado");
    const { comprovantes } = await getAtividade(como(c.aluno), atividade.id);
    await complementarAtividade(como(c.aluno), atividade.id, { dados: {}, adicionarDocumentoIds: [], retirarComprovanteIds: [comprovantes[0].id] });
    await expect(reenviarAtividade(como(c.aluno), atividade.id)).rejects.toMatchObject({ code: "COMPROVANTE_OBRIGATORIO" });
  });
});

describe("visibilidade e auditoria (RN-37)", () => {
  it("the student and the coordination of the course read; others and the administrator do not", async () => {
    const c = await cenario();
    const atividade = await cadastrar(c, 10);
    const outro = await cenario();
    const administrador = await createUsuario();
    await grantPerfil(administrador.id, "ADMINISTRADOR");
    expect((await listAtividades(como(c.aluno), {})).map((item) => item.id)).toContain(atividade.id);
    expect((await listAtividades(como(c.coordenador), {})).map((item) => item.id)).toContain(atividade.id);
    for (const pessoa of [outro.aluno, outro.coordenador, administrador]) {
      expect((await listAtividades(como(pessoa), {})).map((item) => item.id)).not.toContain(atividade.id);
    }

    const { comprovantes } = await getAtividade(como(c.aluno), atividade.id);
    const pode = (usuarioId: string) =>
      withUser(como({ id: usuarioId }), async (tx) => {
        const { rows } = await tx.execute<{ pode: boolean }>(sql`select app.pode_baixar_documento(${comprovantes[0].documentoId}::uuid) as pode`);
        return rows[0].pode;
      });
    expect([await pode(c.aluno.id), await pode(c.coordenador.id), await pode(outro.coordenador.id), await pode(administrador.id)]).toEqual([true, true, false, false]);
  });

  it("the trail keeps the analyses with author and masks the reason", async () => {
    const c = await cenario();
    const atividade = await cadastrar(c, 10);
    await decidirAtividade(como(c.coordenador), atividade.id, "DEVOLVIDA", "Certificado ilegível do hospital");
    const trilha = await owner().select().from(schema.auditoria).where(and(eq(schema.auditoria.tabela, "analise_atividade")));
    const linha = trilha.find((item) => (item.dadosNovos as { atividade_id: string }).atividade_id === atividade.id)!;
    expect(linha.usuarioId).toBe(c.coordenador.id);
    expect((linha.dadosNovos as { motivo: string }).motivo).toBe("[omitido]");
  });
});
