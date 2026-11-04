import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { withUser } from "@/db/with-user";
import { getCargaHoraria, registrarFrequencia } from "@/modules/acompanhamento/services/frequencia-service";
import { listRelatorios } from "@/modules/acompanhamento/services/relatorio-service";
import { listAfastamentos, listPeriodosAfastamento, registrarAfastamento, substituirAfastamento, type NovoAfastamento } from "@/modules/estagios/services/afastamento-service";
import { getEstagioDetalhado } from "@/modules/estagios/services/estagio-service";
import { listNotificacoes } from "@/shared/notificacoes/notificacao-service";
import { closeOwnerDatabase, createDocumentoDoEstagio, createMundoEstagio, owner } from "./fixtures";
import { como, estagioAtivo, type Mundo } from "./estagio-helpers";

// RF030, RF059, RF060, RN-25 (DER §4.4, D1): a leave extends the planned end by the same
// calendar days, up to the 2-year cap at the concedente; its days take no hours.

afterAll(closeOwnerDatabase);

async function atestado(mundo: Mundo, estagioId: string) {
  return createDocumentoDoEstagio(estagioId, "ATESTADO_AFASTAMENTO", mundo.coordenador.id);
}

async function afastamento(mundo: Mundo, estagioId: string, ajustes: Partial<NovoAfastamento> = {}): Promise<NovoAfastamento> {
  const documento = await atestado(mundo, estagioId);
  return { tipo: "ATESTADO_MEDICO", descricao: "CID reservado", dataInicio: "2026-09-07", dataFim: "2026-09-16", documentoId: documento.id, ...ajustes };
}

const dataFimPrevista = async (id: string) =>
  (await owner().select({ data: schema.estagio.dataFimPrevista }).from(schema.estagio).where(eq(schema.estagio.id, id)))[0].data;

describe("registro (RF059, RF060)", () => {
  it("the coordination registers it and the planned end moves by the same calendar days", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const registrado = await registrarAfastamento(como(mundo.coordenador), id, await afastamento(mundo, id));
    expect(registrado).toMatchObject({
      diasCorridos: 10,
      diasExtensao: 10,
      dataFimPrevistaAnterior: "2027-07-30",
      dataFimPrevistaNova: "2027-08-09",
      situacao: "VALIDO",
      registradoPorUsuarioId: mundo.coordenador.id,
    });
    expect(await dataFimPrevista(id)).toBe("2027-08-09");
    expect((await getEstagioDetalhado(como(mundo.aluno), id)).estagio.dataFimPrevista).toBe("2027-08-09");
    // The final report follows the new planned end (RF036)
    const final = (await listRelatorios(como(mundo.aluno), id)).find((relatorio) => relatorio.tipo === "FINAL")!;
    expect(final.periodoFim).toBe("2027-08-09");
  });

  it("student, advisor and coordination read the row; supervisor and concedente only the dates", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    await registrarAfastamento(como(mundo.coordenador), id, await afastamento(mundo, id));
    for (const pessoa of [mundo.aluno, mundo.orientador, mundo.coordenador]) {
      expect(await listAfastamentos(como(pessoa), id), pessoa.email).toHaveLength(1);
    }
    for (const pessoa of [mundo.supervisor, mundo.representante]) {
      expect(await listAfastamentos(como(pessoa), id), pessoa.email).toEqual([]);
      expect(await listPeriodosAfastamento(como(pessoa), id), pessoa.email).toEqual([{ dataInicio: "2026-09-07", dataFim: "2026-09-16" }]);
    }
  });

  it("the description is masked in the audit trail (RN-38)", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const registrado = await registrarAfastamento(como(mundo.coordenador), id, await afastamento(mundo, id));
    const trilha = await owner().select().from(schema.auditoria).where(eq(schema.auditoria.tabela, "afastamento"));
    const linha = trilha.find((item) => (item.dadosNovos as { id: string }).id === registrado.id)!;
    expect(linha.usuarioId).toBe(mundo.coordenador.id);
    expect((linha.dadosNovos as { descricao: string }).descricao).toBe("[omitido]");
  });

  it("days inside the leave take no hours and are not expected work (RF030)", async () => {
    const mundo = await createMundoEstagio();
    // Above what the period can reach: with the usual 400 h, the expected hours stop at the total
    // as the calendar advances and the difference shrinks (RF028)
    const id = await estagioAtivo(mundo, { cargaTotalMinutos: 2000 * 60 });
    const antes = await getCargaHoraria(como(mundo.orientador), id);
    await registrarAfastamento(como(mundo.coordenador), id, await afastamento(mundo, id));
    await expect(registrarFrequencia(como(mundo.aluno), id, { data: "2026-09-08", duracaoMinutos: 360, observacao: null })).rejects.toMatchObject({
      code: "DIA_EM_AFASTAMENTO",
    });
    // 2026-09-07 to 2026-09-16: 8 business days of 6 h each are no longer expected
    const depois = await getCargaHoraria(como(mundo.orientador), id);
    expect(antes.divergencia.minutosPrevistos - depois.divergencia.minutosPrevistos).toBe(8 * 360);
    expect((await getCargaHoraria(como(mundo.supervisor), id)).divergencia.minutosPrevistos).toBe(depois.divergencia.minutosPrevistos);
  });

  it("the cap at the concedente cuts the extension and the coordination is told", async () => {
    const mundo = await createMundoEstagio();
    // Start 2026-08-03: the 2-year cap is 2028-08-02, eight days after the planned end
    const id = await estagioAtivo(mundo, { dataFimPactuada: "2028-07-25" });
    const registrado = await registrarAfastamento(como(mundo.coordenador), id, await afastamento(mundo, id));
    expect(registrado).toMatchObject({ diasCorridos: 10, diasExtensao: 8, dataFimPrevistaNova: "2028-08-02" });
    const { itens } = await listNotificacoes(como(mundo.coordenador), { apenasNaoLidas: false, limite: 50 });
    expect(itens.map((item) => item.tipo)).toContain("DURACAO_MAXIMA_ATINGIDA");
    // Once at the cap, a new leave extends nothing
    const outro = await registrarAfastamento(como(mundo.coordenador), id, await afastamento(mundo, id, { dataInicio: "2026-10-05", dataFim: "2026-10-09" }));
    expect(outro).toMatchObject({ diasExtensao: 0, dataFimPrevistaNova: "2028-08-02" });
  });
});

describe("guardas (RF059, RF030)", () => {
  // Each one stops at the first barrier it meets: the sensitive certificate it cannot read,
  // the internship it cannot lock, or the trigger
  it("only the coordination of the course registers it", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const dados = await afastamento(mundo, id);
    for (const pessoa of [mundo.aluno, mundo.orientador, mundo.supervisor]) {
      await expect(registrarAfastamento(como(pessoa), id, dados), pessoa.email).rejects.toMatchObject({ code: expect.stringMatching(/ACESSO_NEGADO|AFASTAMENTO_RESTRITO|ESTAGIO_NAO_ENCONTRADO|DOCUMENTO_INVALIDO/) });
    }
    expect(await dataFimPrevista(id)).toBe("2027-07-30");
  });

  it("refuses days with hours in force, periods outside the internship, overlaps and other documents", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    await registrarFrequencia(como(mundo.aluno), id, { data: "2026-09-08", duracaoMinutos: 360, observacao: null });
    await expect(registrarAfastamento(como(mundo.coordenador), id, await afastamento(mundo, id))).rejects.toMatchObject({ code: "AFASTAMENTO_COM_LANCAMENTOS" });
    await expect(
      registrarAfastamento(como(mundo.coordenador), id, await afastamento(mundo, id, { dataInicio: "2026-07-20", dataFim: "2026-08-05" })),
    ).rejects.toMatchObject({ code: "AFASTAMENTO_FORA_DO_PERIODO" });

    await registrarAfastamento(como(mundo.coordenador), id, await afastamento(mundo, id, { dataInicio: "2026-10-05", dataFim: "2026-10-09" }));
    await expect(
      registrarAfastamento(como(mundo.coordenador), id, await afastamento(mundo, id, { dataInicio: "2026-10-09", dataFim: "2026-10-12" })),
    ).rejects.toMatchObject({ code: "AFASTAMENTO_SOBREPOSTO" });

    const tce = await createDocumentoDoEstagio(id, "TCE", mundo.coordenador.id);
    await expect(
      registrarAfastamento(como(mundo.coordenador), id, await afastamento(mundo, id, { dataInicio: "2026-11-09", dataFim: "2026-11-10", documentoId: tce.id })),
    ).rejects.toMatchObject({ code: "DOCUMENTO_INVALIDO" });
    expect(await dataFimPrevista(id)).toBe("2027-08-04");
  });
});

describe("correção (RN-28)", () => {
  it("a new row replaces the previous one and recomputes the extension from the original end", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const original = await registrarAfastamento(como(mundo.coordenador), id, await afastamento(mundo, id));
    const corrigido = await substituirAfastamento(
      como(mundo.coordenador),
      original.id,
      await afastamento(mundo, id, { dataInicio: "2026-09-07", dataFim: "2026-09-11" }),
      "Atestado retificado",
    );
    expect(corrigido).toMatchObject({ diasExtensao: 5, dataFimPrevistaAnterior: "2027-07-30", dataFimPrevistaNova: "2027-08-04", substituiAfastamentoId: original.id });
    expect(await dataFimPrevista(id)).toBe("2027-08-04");
    const linhas = await listAfastamentos(como(mundo.coordenador), id);
    expect(linhas.map((linha) => linha.situacao).sort()).toEqual(["SUBSTITUIDO", "VALIDO"]);
    // A day freed by the correction takes hours again
    await expect(registrarFrequencia(como(mundo.aluno), id, { data: "2026-09-14", duracaoMinutos: 360, observacao: null })).resolves.toMatchObject({ estagioId: id });

    await expect(
      substituirAfastamento(como(mundo.coordenador), original.id, await afastamento(mundo, id, { dataInicio: "2026-09-21", dataFim: "2026-09-22" }), "De novo"),
    ).rejects.toMatchObject({ code: expect.stringMatching(/SUBSTITUICAO_AFASTAMENTO_INVALIDA|AFASTAMENTO_JA_SUBSTITUIDO/) });
  });

  it("the row is immutable and a replaced one needs its substitute", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    const registrado = await registrarAfastamento(como(mundo.coordenador), id, await afastamento(mundo, id));
    await expect(owner().update(schema.afastamento).set({ dataFim: "2026-09-20" }).where(eq(schema.afastamento.id, registrado.id))).rejects.toMatchObject({
      cause: { message: expect.stringContaining("REGISTRO_IMUTAVEL") },
    });
    await expect(owner().update(schema.afastamento).set({ situacao: "SUBSTITUIDO" }).where(eq(schema.afastamento.id, registrado.id))).rejects.toMatchObject({
      cause: { message: expect.stringContaining("SUBSTITUICAO_AFASTAMENTO_INVALIDA") },
    });
    // app_runtime has no UPDATE on the table
    await expect(
      withUser(como(mundo.coordenador), (tx) => tx.update(schema.afastamento).set({ situacao: "SUBSTITUIDO" }).where(eq(schema.afastamento.id, registrado.id))),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
  });
});
