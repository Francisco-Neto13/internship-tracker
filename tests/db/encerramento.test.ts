import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { withUser } from "@/db/with-user";
import { criarCriterio, listCriterios, registrarAvaliacao } from "@/modules/acompanhamento/services/avaliacao-service";
import { homologarFrequencia, registrarFrequencia } from "@/modules/acompanhamento/services/frequencia-service";
import { criarAditivo } from "@/modules/estagios/services/aditivo-service";
import { concluirEstagio, getRescisao, rescindirEstagio, type NovaRescisao } from "@/modules/estagios/services/encerramento-service";
import { listNotificacoes } from "@/shared/notificacoes/notificacao-service";
import { closeOwnerDatabase, createDocumentoDoEstagio, createMundoEstagio, createUsuario, grantPerfil, owner } from "./fixtures";
import { como, estagioAtivo, type Mundo } from "./estagio-helpers";

// RF045, RF063, RF064, RN-27 (DER §5.2, §5.12): the conclusion and the rescission of an active
// internship, each in one transaction, closing the pending amendment and the responsibles.

afterAll(closeOwnerDatabase);

beforeAll(async () => {
  const administrador = await createUsuario();
  await grantPerfil(administrador.id, "ADMINISTRADOR");
  await criarCriterio(como(administrador), { codigo: `ENCERRAMENTO_${randomUUID().slice(0, 8).toUpperCase()}`, descricao: "Pontualidade", escalaMinima: 1, escalaMaxima: 5, ordem: 1 });
});

/** A non-mandatory internship: only the final evaluation stands between it and the conclusion. */
const naoObrigatorio = (mundo: Mundo) => estagioAtivo(mundo, { tipo: "NAO_OBRIGATORIO", bolsaValor: "1200.00", auxilioTransporteValor: "200.00" });

async function avaliacaoFinal(mundo: Mundo, id: string) {
  const criterios = await listCriterios(como(mundo.supervisor));
  await registrarAvaliacao(como(mundo.supervisor), id, {
    momento: "FINAL",
    periodoInicio: null,
    periodoFim: null,
    observacoes: null,
    respostas: criterios.map((criterio) => ({ criterioId: criterio.id, nota: criterio.escalaMaxima, comentario: null })),
  });
}

const responsaveis = (id: string) => owner().select().from(schema.responsavelEstagio).where(eq(schema.responsavelEstagio.estagioId, id));
const frequencias = (id: string) => owner().select().from(schema.registroFrequencia).where(eq(schema.registroFrequencia.estagioId, id));
const rescisao = (ajustes: Partial<NovaRescisao> = {}): NovaRescisao => ({
  dataRescisao: "2026-08-05",
  solicitante: "ESTUDANTE",
  motivo: "Aprovação em processo seletivo de efetivação",
  documentoId: null,
  ...ajustes,
});

describe("conclusão (RF045)", () => {
  it("is refused with every impediment, then concludes and closes what was open", async () => {
    const mundo = await createMundoEstagio();
    const id = await naoObrigatorio(mundo);
    await expect(concluirEstagio(como(mundo.coordenador), id)).rejects.toMatchObject({
      code: "CONCLUSAO_BLOQUEADA",
      details: [expect.objectContaining({ code: "AVALIACAO_PENDENTE" })],
    });
    await avaliacaoFinal(mundo, id);
    const aditivo = await criarAditivo(como(mundo.coordenador), id, { tipo: "PRORROGACAO", justificativa: "Projeto estendido", novaDataFimPactuada: "2027-12-30" });

    const concluido = await concluirEstagio(como(mundo.coordenador), id);
    expect(concluido).toMatchObject({ situacao: "CONCLUIDO", encerradoEm: expect.any(Date) });
    const [pendente] = await owner().select().from(schema.aditivo).where(eq(schema.aditivo.id, aditivo.id));
    expect(pendente.situacao).toBe("CANCELADO");
    const hoje = (await owner().execute<{ hoje: string }>(sql`select app.hoje()::text as hoje`)).rows[0].hoje;
    for (const responsavel of await responsaveis(id)) expect(responsavel.vigenciaFim).toBe(hoje);
    // Advisor and student are told before the advisor leaves
    for (const pessoa of [mundo.aluno, mundo.orientador]) {
      const { itens } = await listNotificacoes(como(pessoa), { apenasNaoLidas: false, limite: 50 });
      expect(itens.some((item) => item.tipo === "MUDANCA_SITUACAO" && item.mensagem.includes("CONCLUIDO")), pessoa.email).toBe(true);
    }
    await expect(concluirEstagio(como(mundo.coordenador), id)).rejects.toMatchObject({ code: "ESTAGIO_NAO_ATIVO" });
  });

  it("only the coordination concludes", async () => {
    const mundo = await createMundoEstagio();
    const id = await naoObrigatorio(mundo);
    await avaliacaoFinal(mundo, id);
    for (const pessoa of [mundo.aluno, mundo.orientador, mundo.supervisor, mundo.representante]) {
      await expect(concluirEstagio(como(pessoa), id), pessoa.email).rejects.toMatchObject({ code: expect.stringMatching(/ACESSO_NEGADO|ESTAGIO_NAO_ENCONTRADO/) });
    }
  });
});

describe("rescisão (RF063, RF064)", () => {
  it("consolidates the hours up to the date, cancels the later entries and ends the internship", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    for (const data of ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06"]) {
      await registrarFrequencia(como(mundo.aluno), id, { data, duracaoMinutos: 300, observacao: null });
    }
    await homologarFrequencia(como(mundo.supervisor), id, { periodoInicio: "2026-08-03", periodoFim: "2026-08-04", observacao: null });

    const registrada = await rescindirEstagio(como(mundo.coordenador), id, rescisao());
    expect(registrada).toMatchObject({ minutosCumpridosConsolidados: 900, minutosHomologadosConsolidados: 600, decididoPorUsuarioId: mundo.coordenador.id });
    const [estagio] = await owner().select().from(schema.estagio).where(eq(schema.estagio.id, id));
    expect(estagio).toMatchObject({ situacao: "RESCINDIDO", encerradoEm: expect.any(Date) });
    const depois = (await frequencias(id)).find((registro) => registro.data === "2026-08-06")!;
    expect(depois).toMatchObject({ situacao: "CANCELADO", justificativaCancelamento: expect.stringContaining("05/08/2026") });
    for (const responsavel of await responsaveis(id)) expect(responsavel.vigenciaFim).toBe("2026-08-05");
    // The student keeps reading it; the advisor's access ended with the internship
    await expect(getRescisao(como(mundo.aluno), id)).resolves.toMatchObject({ motivo: rescisao().motivo });
    await expect(getRescisao(como(mundo.orientador), id)).rejects.toMatchObject({ code: "RESCISAO_NAO_ENCONTRADA" });
    // The integralization was recomputed in the same transaction (DER §5.10)
    const apuracoes = await owner()
      .select()
      .from(schema.apuracaoIntegralizacao)
      .where(and(eq(schema.apuracaoIntegralizacao.estudanteId, mundo.estudante.id), eq(schema.apuracaoIntegralizacao.gatilho, "ESTAGIO_RESCINDIDO")));
    expect(apuracoes).toHaveLength(1);

    await expect(rescindirEstagio(como(mundo.coordenador), id, rescisao())).rejects.toMatchObject({ code: "ESTAGIO_NAO_ATIVO" });
  });

  it("refuses others than the coordination, dates out of range, later homologated days and other documents", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    for (const pessoa of [mundo.aluno, mundo.orientador, mundo.representante]) {
      await expect(rescindirEstagio(como(pessoa), id, rescisao()), pessoa.email).rejects.toMatchObject({
        code: expect.stringMatching(/ACESSO_NEGADO|RESCISAO_RESTRITA|ESTAGIO_NAO_ENCONTRADO/),
      });
    }
    await expect(rescindirEstagio(como(mundo.coordenador), id, rescisao({ dataRescisao: "2026-07-31" }))).rejects.toMatchObject({ code: "RESCISAO_DATA_INVALIDA" });
    await expect(rescindirEstagio(como(mundo.coordenador), id, rescisao({ dataRescisao: "2099-01-01" }))).rejects.toMatchObject({ code: "RESCISAO_DATA_INVALIDA" });

    await registrarFrequencia(como(mundo.aluno), id, { data: "2026-08-10", duracaoMinutos: 300, observacao: null });
    await homologarFrequencia(como(mundo.supervisor), id, { periodoInicio: "2026-08-10", periodoFim: "2026-08-10", observacao: null });
    await expect(rescindirEstagio(como(mundo.coordenador), id, rescisao())).rejects.toMatchObject({ code: "RESCISAO_COM_HOMOLOGADOS_POSTERIORES" });

    const tce = await createDocumentoDoEstagio(id, "TCE", mundo.coordenador.id);
    await expect(rescindirEstagio(como(mundo.coordenador), id, rescisao({ dataRescisao: "2026-08-10", documentoId: tce.id }))).rejects.toMatchObject({
      code: "DOCUMENTO_INVALIDO",
    });
    const termo = await createDocumentoDoEstagio(id, "RESCISAO", mundo.coordenador.id);
    await expect(rescindirEstagio(como(mundo.coordenador), id, rescisao({ dataRescisao: "2026-08-10", documentoId: termo.id }))).resolves.toMatchObject({
      documentoId: termo.id,
      minutosHomologadosConsolidados: 300,
    });
  });

  it("the internship becomes RESCINDIDO only through a rescisao row, which never changes", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    await expect(
      withUser(como(mundo.coordenador), (tx) => tx.update(schema.estagio).set({ situacao: "RESCINDIDO", encerradoEm: new Date() }).where(eq(schema.estagio.id, id))),
    ).rejects.toMatchObject({ cause: { message: expect.stringContaining("RESCISAO_SEM_REGISTRO") } });
    const registrada = await rescindirEstagio(como(mundo.coordenador), id, rescisao());
    await expect(owner().update(schema.rescisao).set({ motivo: "outro" }).where(eq(schema.rescisao.id, registrada.id))).rejects.toMatchObject({
      cause: { message: expect.stringContaining("REGISTRO_IMUTAVEL") },
    });
  });
});
