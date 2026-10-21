import { and, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { withUser } from "@/db/with-user";
import { PARAMETROS_PADRAO } from "@/modules/academico/domain/parametros";
import {
  ajustarFrequencia,
  analisarDivergencia,
  cancelarFrequencia,
  getCargaHoraria,
  homologarFrequencia,
  listDivergencias,
  listEstagiosDivergentes,
  listFrequencias,
  registrarFrequencia,
} from "@/modules/acompanhamento/services/frequencia-service";
import { closeOwnerDatabase, createMundoEstagio, createUsuario, grantPerfil, owner } from "./fixtures";
import { como, estagioAtivo, prepararEstagio } from "./estagio-helpers";

// RF023 to RF030 (DER-LOGICO §4.5, §5.3, D2, D3, D4): each rule observed through the service
// and, where a direct path could skip the service, through the database barrier.

afterAll(closeOwnerDatabase);

const dia = (data: string, horas = 6) => ({ data, duracaoMinutos: horas * 60, observacao: null });

async function mundoAtivo() {
  const mundo = await createMundoEstagio();
  const id = await estagioAtivo(mundo);
  return { mundo, id };
}

describe("registro de frequência (RF023, RF024, RF025)", () => {
  it("records entry and exit minus the break, with the legal limits applied", async () => {
    const { mundo, id } = await mundoAtivo();
    const registro = await registrarFrequencia(como(mundo.aluno), id, {
      data: "2026-08-03",
      horario: { horaEntrada: "08:00", horaSaida: "15:00", intervaloMinutos: 60 },
      observacao: "Primeiro dia",
    });
    expect(registro).toMatchObject({
      duracaoMinutos: 360,
      situacao: "REGISTRADO",
      excedeuLimite: false,
      limiteDiarioAplicadoMinutos: PARAMETROS_PADRAO.limiteDiarioObrigatorioMinutos,
      limiteSemanalAplicadoMinutos: PARAMETROS_PADRAO.limiteSemanalMinutos,
      registradoPorUsuarioId: mundo.aluno.id,
    });
  });

  it("blocks a day over 6 hours and a week over 30 hours (Lei 11.788/2008, art. 10)", async () => {
    const { mundo, id } = await mundoAtivo();
    await expect(registrarFrequencia(como(mundo.aluno), id, dia("2026-08-03", 6.5))).rejects.toMatchObject({
      code: "LIMITE_JORNADA_EXCEDIDO",
      details: [expect.objectContaining({ code: "LIMITE_DIARIO" })],
    });
    for (const data of ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07"]) {
      await registrarFrequencia(como(mundo.aluno), id, dia(data));
    }
    await expect(registrarFrequencia(como(mundo.aluno), id, dia("2026-08-08", 1))).rejects.toMatchObject({
      code: "LIMITE_JORNADA_EXCEDIDO",
      details: [expect.objectContaining({ code: "LIMITE_SEMANAL" })],
    });
    // D4: the next ISO week starts on Monday with a clean sum
    await expect(registrarFrequencia(como(mundo.aluno), id, dia("2026-08-10"))).resolves.toMatchObject({ situacao: "REGISTRADO" });
  });

  it("refuses dates outside the internship, in the future, and a second entry for the day", async () => {
    const { mundo, id } = await mundoAtivo();
    await expect(registrarFrequencia(como(mundo.aluno), id, dia("2026-08-02"))).rejects.toMatchObject({ code: "DATA_FORA_DO_ESTAGIO" });
    await expect(registrarFrequencia(como(mundo.aluno), id, dia("2027-01-04"))).rejects.toMatchObject({ code: "DATA_FUTURA" });
    await registrarFrequencia(como(mundo.aluno), id, dia("2026-08-04", 4));
    await expect(registrarFrequencia(como(mundo.aluno), id, dia("2026-08-04", 1))).rejects.toMatchObject({ code: "FREQUENCIA_DUPLICADA" });
  });

  it("only an ATIVO internship takes entries", async () => {
    const mundo = await createMundoEstagio();
    const id = await prepararEstagio(mundo, [], { dataInicio: "2026-08-03", dataFimPactuada: "2027-07-30" });
    await expect(registrarFrequencia(como(mundo.aluno), id, dia("2026-08-03"))).rejects.toMatchObject({ code: "ESTAGIO_NAO_ATIVO" });
  });

  it("only the student records; others read by link, the administrator and strangers do not", async () => {
    const { mundo, id } = await mundoAtivo();
    await registrarFrequencia(como(mundo.aluno), id, dia("2026-08-03"));
    await expect(registrarFrequencia(como(mundo.supervisor), id, dia("2026-08-04"))).rejects.toMatchObject({ code: "LANCAMENTO_RESTRITO_AO_ESTUDANTE" });
    await expect(registrarFrequencia(como(mundo.coordenador), id, dia("2026-08-04"))).rejects.toMatchObject({ code: "LANCAMENTO_RESTRITO_AO_ESTUDANTE" });

    for (const leitor of [mundo.aluno, mundo.supervisor, mundo.orientador, mundo.coordenador, mundo.representante]) {
      expect(await listFrequencias(como(leitor), id, {})).toHaveLength(1);
    }
    const administrador = await createUsuario();
    await grantPerfil(administrador.id, "ADMINISTRADOR");
    await expect(listFrequencias(como(administrador), id, {})).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
    const outro = await createMundoEstagio();
    await expect(listFrequencias(como(outro.aluno), id, {})).rejects.toMatchObject({ code: "ESTAGIO_NAO_ENCONTRADO" });
    await expect(listFrequencias(como(outro.supervisor), id, {})).rejects.toMatchObject({ code: "ESTAGIO_NAO_ENCONTRADO" });
  });

  it("serializes concurrent entries, so two days cannot pass the weekly limit together", async () => {
    const { mundo, id } = await mundoAtivo();
    for (const data of ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06"]) {
      await registrarFrequencia(como(mundo.aluno), id, dia(data));
    }
    const resultados = await Promise.allSettled([
      registrarFrequencia(como(mundo.aluno), id, dia("2026-08-07")),
      registrarFrequencia(como(mundo.aluno), id, dia("2026-08-08")),
    ]);
    expect(resultados.filter((resultado) => resultado.status === "fulfilled")).toHaveLength(1);
    expect(resultados.find((resultado) => resultado.status === "rejected")).toMatchObject({ reason: { code: "LIMITE_JORNADA_EXCEDIDO" } });
  });

  it("the database barrier flags instead of refusing when the institution does not block", async () => {
    const mundo = await createMundoEstagio();
    const id = await estagioAtivo(mundo);
    // Owner transaction, rolled back: a non-retroactive parameter could not be created through the app
    await owner()
      .transaction(async (tx) => {
        const [autor] = await tx.select().from(schema.usuario).limit(1);
        await tx.insert(schema.parametroInstitucional).values({ vigenciaInicio: "2026-08-02", bloquearExcedente: false, definidoPorUsuarioId: autor.id });
        const [registro] = await tx
          .insert(schema.registroFrequencia)
          .values({ estagioId: id, data: "2026-08-03", duracaoMinutos: 420, registradoPorUsuarioId: mundo.aluno.id, limiteDiarioAplicadoMinutos: 1, limiteSemanalAplicadoMinutos: 1 })
          .returning();
        expect(registro).toMatchObject({ situacao: "SINALIZADO", excedeuLimite: true, limiteDiarioAplicadoMinutos: 360 });
        expect(registro.parametroInstitucionalId).not.toBeNull();
        tx.rollback();
      })
      .catch((error: unknown) => {
        if (!(error instanceof Error) || !error.message.includes("Rollback")) throw error;
      });
  });

  it("the legal defaults of the database match the domain constants", async () => {
    const { rows } = await owner().execute<Record<string, unknown>>(sql`select * from app.parametros_em('1900-01-01'::date)`);
    expect(rows[0]).toMatchObject({
      parametro_id: null,
      limite_diario_obrigatorio_minutos: PARAMETROS_PADRAO.limiteDiarioObrigatorioMinutos,
      limite_diario_nao_obrigatorio_minutos: PARAMETROS_PADRAO.limiteDiarioNaoObrigatorioMinutos,
      limite_semanal_minutos: PARAMETROS_PADRAO.limiteSemanalMinutos,
      bloquear_excedente: PARAMETROS_PADRAO.bloquearExcedente,
    });
    expect(Number(rows[0].tolerancia_divergencia_percentual)).toBe(PARAMETROS_PADRAO.toleranciaDivergenciaPercentual);
  });
});

describe("ajuste e cancelamento (RF029)", () => {
  it("a correction is a new row for the day; the previous one is kept as SUBSTITUIDO", async () => {
    const { mundo, id } = await mundoAtivo();
    const original = await registrarFrequencia(como(mundo.aluno), id, dia("2026-08-03", 4));
    const novo = await ajustarFrequencia(como(mundo.aluno), original.id, { duracaoMinutos: 300, observacao: null, justificativa: "Esqueci uma hora" });
    expect(novo).toMatchObject({ data: "2026-08-03", duracaoMinutos: 300, substituiRegistroId: original.id, justificativaAjuste: "Esqueci uma hora" });
    const linhas = await listFrequencias(como(mundo.aluno), id, {});
    expect(linhas.map((linha) => linha.situacao).sort()).toEqual(["REGISTRADO", "SUBSTITUIDO"]);
    await expect(ajustarFrequencia(como(mundo.aluno), original.id, { duracaoMinutos: 60, observacao: null, justificativa: "x" })).rejects.toMatchObject({
      code: "LANCAMENTO_JA_AJUSTADO",
    });
  });

  it("the replaced day leaves the weekly sum, so a full week can be corrected", async () => {
    const { mundo, id } = await mundoAtivo();
    const dias = [];
    for (const data of ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07"]) {
      dias.push(await registrarFrequencia(como(mundo.aluno), id, dia(data)));
    }
    await expect(ajustarFrequencia(como(mundo.aluno), dias[0].id, { duracaoMinutos: 330, observacao: null, justificativa: "Saí mais cedo" })).resolves.toMatchObject({
      duracaoMinutos: 330,
    });
  });

  it("cancels with the reason and frees the day", async () => {
    const { mundo, id } = await mundoAtivo();
    const registro = await registrarFrequencia(como(mundo.aluno), id, dia("2026-08-03"));
    await expect(cancelarFrequencia(como(mundo.aluno), registro.id, "Dia lançado por engano")).resolves.toMatchObject({
      situacao: "CANCELADO",
      justificativaCancelamento: "Dia lançado por engano",
    });
    await expect(registrarFrequencia(como(mundo.aluno), id, dia("2026-08-03", 5))).resolves.toMatchObject({ situacao: "REGISTRADO" });
  });

  it("the supervisor neither corrects nor cancels", async () => {
    const { mundo, id } = await mundoAtivo();
    const registro = await registrarFrequencia(como(mundo.aluno), id, dia("2026-08-03"));
    await expect(cancelarFrequencia(como(mundo.supervisor), registro.id, "x")).rejects.toMatchObject({ code: "AJUSTE_RESTRITO" });
    await expect(ajustarFrequencia(como(mundo.supervisor), registro.id, { duracaoMinutos: 60, observacao: null, justificativa: "x" })).rejects.toMatchObject({
      code: "AJUSTE_RESTRITO",
    });
  });

  it("content never changes and a replaced entry needs its correction (database barrier)", async () => {
    const { mundo, id } = await mundoAtivo();
    const registro = await registrarFrequencia(como(mundo.aluno), id, dia("2026-08-03"));
    await expect(
      owner().update(schema.registroFrequencia).set({ duracaoMinutos: 60 }).where(eq(schema.registroFrequencia.id, registro.id)),
    ).rejects.toMatchObject({ cause: { message: expect.stringContaining("REGISTRO_IMUTAVEL") } });
    await expect(
      withUser(como(mundo.aluno), (tx) =>
        tx.update(schema.registroFrequencia).set({ situacao: "SUBSTITUIDO" }).where(eq(schema.registroFrequencia.id, registro.id)),
      ),
    ).rejects.toMatchObject({ cause: { message: expect.stringContaining("AJUSTE_SEM_SUBSTITUTO") } });
  });
});

describe("homologação (RF027, §9.1 P5)", () => {
  async function semanaLancada() {
    const { mundo, id } = await mundoAtivo();
    for (const data of ["2026-08-03", "2026-08-04", "2026-08-05"]) {
      await registrarFrequencia(como(mundo.aluno), id, dia(data, 5));
    }
    return { mundo, id };
  }

  it("the supervisor homologates the waiting entries of a period, with opinion and total", async () => {
    const { mundo, id } = await semanaLancada();
    const { homologacao, lancamentos } = await homologarFrequencia(como(mundo.supervisor), id, {
      periodoInicio: "2026-08-03",
      periodoFim: "2026-08-04",
      observacao: "Conferido com o ponto",
    });
    expect(lancamentos).toBe(2);
    expect(homologacao).toMatchObject({ minutosHomologados: 600, homologadoPorUsuarioId: mundo.supervisor.id, observacao: "Conferido com o ponto" });
    const linhas = await listFrequencias(como(mundo.aluno), id, { situacao: "HOMOLOGADO" });
    expect(linhas.every((linha) => linha.homologacaoId === homologacao.id)).toBe(true);
    await expect(
      homologarFrequencia(como(mundo.supervisor), id, { periodoInicio: "2026-08-03", periodoFim: "2026-08-04", observacao: null }),
    ).rejects.toMatchObject({ code: "NADA_A_HOMOLOGAR" });
  });

  it("only the supervisor of the internship homologates", async () => {
    const { mundo, id } = await semanaLancada();
    const periodo = { periodoInicio: "2026-08-03", periodoFim: "2026-08-05", observacao: null };
    for (const pessoa of [mundo.aluno, mundo.orientador, mundo.coordenador, mundo.representante]) {
      await expect(homologarFrequencia(como(pessoa), id, periodo)).rejects.toMatchObject({ code: "HOMOLOGACAO_RESTRITA_AO_SUPERVISOR" });
    }
    await expect(homologarFrequencia(como(mundo.supervisor), id, { ...periodo, periodoFim: "2027-01-04" })).rejects.toMatchObject({
      code: "DATA_FUTURA",
    });
  });

  it("a homologated entry is closed to the student; the coordination replaces it and it waits again", async () => {
    const { mundo, id } = await semanaLancada();
    await homologarFrequencia(como(mundo.supervisor), id, { periodoInicio: "2026-08-03", periodoFim: "2026-08-03", observacao: null });
    const [homologado] = await listFrequencias(como(mundo.aluno), id, { situacao: "HOMOLOGADO" });
    await expect(ajustarFrequencia(como(mundo.aluno), homologado.id, { duracaoMinutos: 60, observacao: null, justificativa: "x" })).rejects.toMatchObject({
      code: "LANCAMENTO_HOMOLOGADO",
    });
    await expect(cancelarFrequencia(como(mundo.coordenador), homologado.id, "x")).rejects.toMatchObject({ code: "LANCAMENTO_HOMOLOGADO" });

    const novo = await ajustarFrequencia(como(mundo.coordenador), homologado.id, {
      duracaoMinutos: 240,
      observacao: null,
      justificativa: "Ponto corrigido pela concedente",
    });
    expect(novo).toMatchObject({ situacao: "REGISTRADO", homologacaoId: null, registradoPorUsuarioId: mundo.coordenador.id });
    const [substituido] = await listFrequencias(como(mundo.aluno), id, { situacao: "SUBSTITUIDO" });
    expect(substituido.homologacaoId).toBe(homologado.homologacaoId);
  });

  it("the homologated total must match the entries it marks (checked at commit)", async () => {
    const { mundo, id } = await semanaLancada();
    await expect(
      withUser(como(mundo.supervisor), (tx) =>
        tx.insert(schema.homologacaoFrequencia).values({
          estagioId: id,
          periodoInicio: "2026-08-03",
          periodoFim: "2026-08-05",
          minutosHomologados: 900,
          homologadoPorUsuarioId: mundo.supervisor.id,
        }),
      ),
    ).rejects.toMatchObject({ cause: { message: expect.stringContaining("HOMOLOGACAO_INCONSISTENTE") } });
  });
});

describe("carga horária e divergência (RF026, RF028)", () => {
  it("only homologated hours count toward balance and completion", async () => {
    const { mundo, id } = await mundoAtivo();
    for (const data of ["2026-08-03", "2026-08-04"]) await registrarFrequencia(como(mundo.aluno), id, dia(data));
    await homologarFrequencia(como(mundo.supervisor), id, { periodoInicio: "2026-08-03", periodoFim: "2026-08-03", observacao: null });
    const { resumo } = await getCargaHoraria(como(mundo.orientador), id);
    expect(resumo).toMatchObject({
      minutosCumpridos: 720,
      minutosHomologados: 360,
      minutosPendentes: 360,
      cargaTotalMinutos: 400 * 60,
      saldoMinutos: 400 * 60 - 360,
      percentualConclusao: 1.5,
    });
  });

  it("opens a case for the advisor after a write that reveals the divergence; the advisor closes it", async () => {
    // Since 2026-08-03 at 30 h a week, a single day of 6 h is far below the expected hours
    const { mundo, id } = await mundoAtivo();
    await registrarFrequencia(como(mundo.aluno), id, dia("2026-08-03"));
    const { divergencia, divergenciaAbertaId } = await getCargaHoraria(como(mundo.aluno), id);
    expect(divergencia).toMatchObject({ avaliada: true, divergente: true, minutosCumpridos: 360 });
    expect(divergenciaAbertaId).not.toBeNull();

    for (const leitor of [mundo.aluno, mundo.orientador, mundo.coordenador]) {
      expect(await listDivergencias(como(leitor), id)).toHaveLength(1);
    }
    expect(await listDivergencias(como(mundo.supervisor), id)).toHaveLength(0);

    await expect(analisarDivergencia(como(mundo.aluno), divergenciaAbertaId!, "ok")).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
    await expect(analisarDivergencia(como(mundo.orientador), divergenciaAbertaId!, "Estudante em período de provas")).resolves.toMatchObject({
      situacao: "ANALISADA",
      analisadaPorUsuarioId: mundo.orientador.id,
    });
    await expect(analisarDivergencia(como(mundo.orientador), divergenciaAbertaId!, "de novo")).rejects.toMatchObject({ code: "DIVERGENCIA_JA_ANALISADA" });

    // A new write while still divergent opens a new case; the analyzed one is kept
    await registrarFrequencia(como(mundo.aluno), id, dia("2026-08-04"));
    const casos = await listDivergencias(como(mundo.orientador), id);
    expect(casos.map((caso) => caso.situacao).sort()).toEqual(["ABERTA", "ANALISADA"]);
  });

  it("lists the diverging internships of the advisor, calculated on the spot", async () => {
    const { mundo, id } = await mundoAtivo();
    expect((await listEstagiosDivergentes(como(mundo.orientador))).map((item) => item.estagio.id)).toContain(id);
    expect((await listEstagiosDivergentes(como(mundo.coordenador))).map((item) => item.estagio.id)).toContain(id);
    const outro = await createMundoEstagio();
    expect((await listEstagiosDivergentes(como(outro.orientador))).map((item) => item.estagio.id)).not.toContain(id);
    expect(await listEstagiosDivergentes(como(mundo.aluno))).toHaveLength(0);
  });
});

describe("auditoria (RF029, RF065)", () => {
  it("records corrections with author and masks the free text the administrator may not read", async () => {
    const { mundo, id } = await mundoAtivo();
    const registro = await registrarFrequencia(como(mundo.aluno), id, { ...dia("2026-08-03"), observacao: "Consulta médica à tarde" });
    await ajustarFrequencia(como(mundo.aluno), registro.id, { duracaoMinutos: 240, observacao: null, justificativa: "Saí às 12h" });
    const trilha = await owner()
      .select()
      .from(schema.auditoria)
      .where(and(eq(schema.auditoria.tabela, "registro_frequencia"), eq(schema.auditoria.registroId, registro.id)));
    expect(trilha.map((linha) => linha.operacao)).toEqual(["INSERT", "UPDATE"]);
    expect(trilha.every((linha) => linha.usuarioId === mundo.aluno.id)).toBe(true);
    expect(JSON.stringify(trilha)).not.toContain("Consulta médica");
    expect((trilha[0].dadosNovos as Record<string, unknown>).observacao).toBe("[omitido]");
  });
});
