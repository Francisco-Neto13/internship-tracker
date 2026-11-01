import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { withUser } from "@/db/with-user";
import { criarCriterio, listCriterios, registrarAvaliacao } from "@/modules/acompanhamento/services/avaliacao-service";
import { homologarFrequencia, registrarFrequencia } from "@/modules/acompanhamento/services/frequencia-service";
import { decidirRelatorio, enviarRelatorio, listRelatorios } from "@/modules/acompanhamento/services/relatorio-service";
import { cadastrarAtividade, decidirAtividade } from "@/modules/atividades/services/atividade-service";
import { getIntegralizacao, getMinhaIntegralizacao, reapurar } from "@/modules/integralizacao/services/integralizacao-service";
import { closeOwnerDatabase, createCategoriaComLimite, createComprovanteDoEstudante, createMundoEstagio, createUsuario, grantPerfil, owner } from "./fixtures";
import { como, estagioAtivo, type Mundo } from "./estagio-helpers";

// RF056, RF057, RN-23, RN-24, RN-35, RN-36 (DER-LOGICO §5.9, §5.10): each event stores a new
// assessment from the one calculation; the internship side counts only mandatory internships.

afterAll(closeOwnerDatabase);

let administrador: { id: string };
beforeAll(async () => {
  administrador = await createUsuario();
  await grantPerfil(administrador.id, "ADMINISTRADOR");
  await criarCriterio(como(administrador), { codigo: `INTEGRAL_${randomUUID().slice(0, 8).toUpperCase()}`, descricao: "Organização", escalaMinima: 1, escalaMaxima: 5, ordem: 1 });
});

async function aprovada(mundo: Mundo, categoriaId: string, horas: number, origemEstagioId: string | null = null) {
  const documento = await createComprovanteDoEstudante(mundo.estudante.id, mundo.aluno.id);
  const atividade = await cadastrarAtividade(como(mundo.aluno), {
    categoriaId,
    descricao: `Atividade ${randomUUID().slice(0, 6)}`,
    instituicaoPromotora: "UFAL",
    dataInicio: "2026-08-03",
    dataFim: "2026-08-04",
    horasDeclaradasMinutos: horas * 60,
    documentoIds: [documento.id],
    origemEstagioId,
  });
  await decidirAtividade(como(mundo.coordenador), atividade.id, "APROVADA", null);
  return atividade;
}

/** Two homologated days, final report approved (if mandatory), final evaluation, concluded. */
async function concluir(mundo: Mundo, id: string, obrigatorio: boolean) {
  for (const data of ["2026-08-03", "2026-08-04"]) await registrarFrequencia(como(mundo.aluno), id, { data, duracaoMinutos: 360, observacao: null });
  await homologarFrequencia(como(mundo.supervisor), id, { periodoInicio: "2026-08-03", periodoFim: "2026-08-04", observacao: null });
  if (obrigatorio) {
    const final = (await listRelatorios(como(mundo.aluno), id)).find((relatorio) => relatorio.tipo === "FINAL")!;
    await enviarRelatorio(como(mundo.aluno), final.id, { conteudo: "Relatório final", documentoIds: [] });
    await decidirRelatorio(como(mundo.orientador), final.id, "APROVADO", null);
  }
  const criterios = await listCriterios(como(mundo.supervisor));
  await registrarAvaliacao(como(mundo.supervisor), id, {
    momento: "FINAL",
    periodoInicio: null,
    periodoFim: null,
    observacoes: null,
    respostas: criterios.map((criterio) => ({ criterioId: criterio.id, nota: criterio.escalaMaxima, comentario: null })),
  });
  await withUser(como(mundo.coordenador), (tx) => tx.update(schema.estagio).set({ situacao: "CONCLUIDO", encerradoEm: new Date() }).where(eq(schema.estagio.id, id)));
}

/** A course that requires 12 h of mandatory internship and 50 h of activities. */
async function mundoComExigencias() {
  const mundo = await createMundoEstagio();
  await owner()
    .update(schema.curso)
    .set({ cargaMinimaEstagioMinutos: 12 * 60, cargaAtividadesComplementaresMinutos: 50 * 60 })
    .where(eq(schema.curso.id, mundo.curso.id));
  return mundo;
}

describe("apuração (RF056, RN-23, RN-35)", () => {
  it("each approval stores an assessment: categories within their limit and the total within the course", async () => {
    const mundo = await mundoComExigencias();
    const ensino = await createCategoriaComLimite(mundo.curso.id, 30 * 60);
    const extensao = await createCategoriaComLimite(mundo.curso.id, 40 * 60);
    await aprovada(mundo, ensino.id, 20);
    let atual = await getIntegralizacao(como(mundo.aluno), mundo.estudante.id);
    expect(atual).toMatchObject({ gatilho: "ATIVIDADE_APROVADA", apuracao: { atividadesAproveitadoMinutos: 20 * 60 } });

    await aprovada(mundo, extensao.id, 40);
    atual = await getIntegralizacao(como(mundo.coordenador), mundo.estudante.id);
    // The course requires 50 h: the approval of the 40 h activity counted only the 30 h left (RN-23)
    expect(atual.apuracao.atividadesAproveitadoMinutos).toBe(50 * 60);
    expect(atual.progresso.atividades).toMatchObject({ situacao: "CUMPRIDO", pendenteMinutos: 0 });
    expect(atual.categorias.map((categoria) => [categoria.categoriaId, categoria.aproveitadoMinutos]).sort()).toEqual(
      [
        [ensino.id, 20 * 60],
        [extensao.id, 30 * 60],
      ].sort(),
    );
    expect(atual.progresso.situacaoGeral).toBe("PENDENTE");
  });

  it("a reduced category limit re-assesses the course's students (EXIGENCIA_ALTERADA)", async () => {
    const mundo = await mundoComExigencias();
    const ensino = await createCategoriaComLimite(mundo.curso.id, 30 * 60);
    await aprovada(mundo, ensino.id, 25);
    await owner().update(schema.exigenciaCategoria).set({ limiteMinutos: 10 * 60 }).where(eq(schema.exigenciaCategoria.categoriaId, ensino.id));
    const atual = await getIntegralizacao(como(mundo.aluno), mundo.estudante.id);
    expect(atual).toMatchObject({ gatilho: "EXIGENCIA_ALTERADA", apuracao: { atividadesAproveitadoMinutos: 10 * 60 } });
    expect(atual.categorias[0]).toMatchObject({ limiteMinutos: 600, aproveitadoMinutos: 600 });
  });

  it("a concluded mandatory internship fills the internship side (ESTAGIO_CONCLUIDO)", async () => {
    const mundo = await mundoComExigencias();
    const id = await estagioAtivo(mundo);
    await concluir(mundo, id, true);
    const atual = await getIntegralizacao(como(mundo.aluno), mundo.estudante.id);
    expect(atual).toMatchObject({ gatilho: "ESTAGIO_CONCLUIDO", apuracao: { estagioExigidoMinutos: 720, estagioConcluidoMinutos: 720 } });
    expect(atual.progresso.estagio).toEqual({ situacao: "CUMPRIDO", pendenteMinutos: 0 });
  });

  it("a non-mandatory internship counted as activity stays out of the internship side (RN-36, barrier 4)", async () => {
    const mundo = await mundoComExigencias();
    const destino = await createCategoriaComLimite(mundo.curso.id, 50 * 60, { admiteEstagioNaoObrigatorio: true });
    const id = await estagioAtivo(mundo, { tipo: "NAO_OBRIGATORIO", bolsaValor: "1000.00", auxilioTransporteValor: "150.00" });
    await concluir(mundo, id, false);
    await aprovada(mundo, destino.id, 12, id);
    const atual = await getIntegralizacao(como(mundo.aluno), mundo.estudante.id);
    expect(atual.apuracao).toMatchObject({ estagioConcluidoMinutos: 0, atividadesAproveitadoMinutos: 720 });
  });

  it("internships of a previous course do not count in the current one (D7)", async () => {
    const mundo = await mundoComExigencias();
    const id = await estagioAtivo(mundo);
    await concluir(mundo, id, true);
    const [novoCurso] = await owner()
      .insert(schema.curso)
      .values({ codigo: `NOVO-${randomUUID().slice(0, 6)}`, nome: "Curso novo", cargaMinimaEstagioMinutos: 600, cargaAtividadesComplementaresMinutos: 0 })
      .returning();
    await owner().update(schema.estudante).set({ cursoId: novoCurso.id }).where(eq(schema.estudante.id, mundo.estudante.id));
    const atual = await reapurar(como(mundo.aluno), mundo.estudante.id);
    expect(atual).toMatchObject({ gatilho: "MANUAL", apuracao: { estagioExigidoMinutos: 600, estagioConcluidoMinutos: 0 } });
  });

  it("is deterministic: the same data give the same numbers", async () => {
    const mundo = await mundoComExigencias();
    const ensino = await createCategoriaComLimite(mundo.curso.id, 30 * 60);
    await aprovada(mundo, ensino.id, 15);
    const primeira = await reapurar(como(mundo.aluno), mundo.estudante.id);
    const segunda = await reapurar(como(mundo.coordenador), mundo.estudante.id);
    expect(segunda.apuracao).toEqual(primeira.apuracao);
    expect(segunda.apuracoes).toBe(primeira.apuracoes + 1);
  });
});

describe("consulta e acesso (RF057, RN-24, RN-37)", () => {
  it("without any event the progress is calculated on the spot, with nothing stored", async () => {
    // Untouched course (400 h of internship, 200 h of activities, no category): no event happened
    const mundo = await createMundoEstagio();
    const [antes] = await owner().select({ id: schema.apuracaoIntegralizacao.id }).from(schema.apuracaoIntegralizacao).where(eq(schema.apuracaoIntegralizacao.estudanteId, mundo.estudante.id));
    expect(antes?.id).toBeUndefined();
    const atual = await getMinhaIntegralizacao(como(mundo.aluno));
    expect(atual).toMatchObject({ apuradoEm: null, apuracoes: 0, progresso: { estagio: { pendenteMinutos: 400 * 60 }, atividades: { pendenteMinutos: 200 * 60 } } });
    expect(atual.progresso.atividades.categoriasPendentes).toEqual([]);
  });

  it("the student and the coordination of its course read; others and the administrator do not", async () => {
    const mundo = await mundoComExigencias();
    const outro = await createMundoEstagio();
    for (const pessoa of [outro.aluno, outro.coordenador, mundo.supervisor, administrador]) {
      await expect(getIntegralizacao(como(pessoa), mundo.estudante.id)).rejects.toMatchObject({ code: "ESTUDANTE_NAO_ENCONTRADO" });
      await expect(reapurar(como(pessoa), mundo.estudante.id)).rejects.toMatchObject({ code: "ESTUDANTE_NAO_ENCONTRADO" });
    }
    await expect(getIntegralizacao(como(mundo.coordenador), mundo.estudante.id)).resolves.toMatchObject({ estudanteId: mundo.estudante.id });
  });

  it("assessments are immutable and nobody inserts them by hand", async () => {
    const mundo = await mundoComExigencias();
    await reapurar(como(mundo.aluno), mundo.estudante.id);
    const [linha] = await owner().select().from(schema.apuracaoIntegralizacao).where(eq(schema.apuracaoIntegralizacao.estudanteId, mundo.estudante.id));
    await expect(owner().update(schema.apuracaoIntegralizacao).set({ atividadesAproveitadoMinutos: 0 }).where(eq(schema.apuracaoIntegralizacao.id, linha.id))).rejects.toMatchObject({
      cause: { message: expect.stringContaining("REGISTRO_IMUTAVEL") },
    });
    await expect(
      withUser(como(mundo.aluno), (tx) => tx.insert(schema.apuracaoIntegralizacao).values({ ...linha, id: randomUUID() })),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
  });
});
