import { sql } from "drizzle-orm";
import { withUser, type Transaction } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { avaliarDivergencia, diaAnterior, resumoCarga } from "../domain/carga";
import { avaliarJornada, duracaoDoHorario, semanaIso, type AvaliacaoJornada } from "../domain/jornada";
import {
  abrirDivergencia,
  analisarDivergencia as gravarAnalise,
  findDivergenciaById,
  findDivergencias,
  findEstagioAcompanhado,
  findEstagiosAtivosComCumpridos,
  findFrequenciaById,
  findFrequencias,
  findHomologacoes,
  findPendentesNoPeriodo,
  hoje,
  insertFrequencia,
  insertHomologacao,
  marcarHomologados,
  minutosVigentesEntre,
  parametrosEm,
  totaisFrequencia,
  travarEstagio,
  updateFrequencia,
  type EstagioAcompanhado,
  type FiltrosFrequencia,
  type FrequenciaRow,
} from "../repositories/frequencia-repository";
import { acessoNegado, estagioNaoEncontrado, traduzirErroFrequencia } from "./erros";

// M05 frequency (RF023 to RF030), homologation (RF027), accumulated hours (RF026) and
// divergence (RF028). Rules live in ../domain; the triggers of functions/08_frequencia.sql
// enforce them again, so the database never holds hours the rules forbid.

export type DiaInformado = {
  data: string;
  /** D2: entry and exit with the break of a split shift; or the total of the day. */
  horario?: { horaEntrada: string; horaSaida: string; intervaloMinutos: number };
  duracaoMinutos?: number;
  observacao: string | null;
};

const VIGENTES: readonly FrequenciaRow["situacao"][] = ["REGISTRADO", "SINALIZADO", "HOMOLOGADO"];

/** Every M05 read and write starts here: the internship exists and the caller follows it. */
export async function carregarEstagioAcompanhado(tx: Transaction, estagioId: string): Promise<EstagioAcompanhado> {
  const estagio = await findEstagioAcompanhado(tx, estagioId);
  if (!estagio) throw estagioNaoEncontrado();
  const { rows } = await tx.execute<{ pode: boolean }>(sql`select app.pode_ler_estagio(${estagioId}::uuid) as pode`);
  // The administrator reads the internship for management reports, not its follow-up (RN-37)
  if (rows[0]?.pode !== true) throw acessoNegado("acompanhar este estágio");
  return estagio;
}

function duracaoDoDia(dia: DiaInformado): number {
  if (dia.horario) {
    const resultado = duracaoDoHorario(dia.horario);
    if ("problema" in resultado) {
      throw new DomainError({
        code: "HORARIO_INVALIDO",
        kind: "UNPROCESSABLE",
        message: resultado.problema === "SAIDA_ANTES_DA_ENTRADA" ? "A saída precisa ser depois da entrada." : "O intervalo não pode ocupar a jornada inteira.",
        requisito: "RF023",
      });
    }
    return resultado.minutos;
  }
  if (!dia.duracaoMinutos || dia.duracaoMinutos <= 0) {
    throw new DomainError({ code: "HORARIO_INVALIDO", kind: "UNPROCESSABLE", message: "Informe entrada e saída ou o total de horas.", requisito: "RF023" });
  }
  return dia.duracaoMinutos;
}

function exigirLancavel(estagio: EstagioAcompanhado, data: string, diaAtual: string) {
  if (estagio.situacao !== "ATIVO") {
    throw new DomainError({ code: "ESTAGIO_NAO_ATIVO", kind: "CONFLICT", message: "Só estágio ativo recebe lançamentos de frequência.", requisito: "RF023" });
  }
  if (data < estagio.dataInicio || data > estagio.dataFimPrevista) {
    throw new DomainError({
      code: "DATA_FORA_DO_ESTAGIO",
      kind: "UNPROCESSABLE",
      message: `A data precisa estar entre ${estagio.dataInicio} e ${estagio.dataFimPrevista}.`,
      requisito: "RF023",
    });
  }
  if (data > diaAtual) {
    throw new DomainError({ code: "DATA_FUTURA", kind: "UNPROCESSABLE", message: "Não se registra frequência de dia que ainda não aconteceu.", requisito: "RF023" });
  }
}

/** RF024, RF025: the same check the trigger makes, to answer with the numbers involved. */
async function avaliarDia(tx: Transaction, estagio: EstagioAcompanhado, data: string, duracaoMinutos: number): Promise<AvaliacaoJornada> {
  const parametros = await parametrosEm(tx, data);
  const semana = semanaIso(data);
  const outras = await minutosVigentesEntre(tx, estagio.id, semana.inicio, semana.fim);
  const limiteDiarioMinutos = estagio.tipo === "OBRIGATORIO" ? parametros.limiteDiarioObrigatorioMinutos : parametros.limiteDiarioNaoObrigatorioMinutos;
  const jornada = avaliarJornada(duracaoMinutos, outras, {
    limiteDiarioMinutos,
    limiteSemanalMinutos: parametros.limiteSemanalMinutos,
    bloquearExcedente: parametros.bloquearExcedente,
  });
  if (jornada.bloqueia) {
    throw new DomainError({
      code: "LIMITE_JORNADA_EXCEDIDO",
      kind: "UNPROCESSABLE",
      message: jornada.excedeuDiario
        ? `O dia passa do limite de ${limiteDiarioMinutos / 60} h.`
        : `A semana de ${semana.inicio} a ${semana.fim} passa do limite de ${parametros.limiteSemanalMinutos / 60} h.`,
      requisito: "RF024",
      details: [
        ...(jornada.excedeuDiario ? [{ code: "LIMITE_DIARIO", field: "duracao", issue: `${duracaoMinutos} min > ${limiteDiarioMinutos} min`, requisito: "RF024" }] : []),
        ...(jornada.excedeuSemanal
          ? [{ code: "LIMITE_SEMANAL", field: "semana", issue: `${jornada.totalSemanaMinutos} min > ${parametros.limiteSemanalMinutos} min`, requisito: "RF024" }]
          : []),
      ],
    });
  }
  return jornada;
}

/**
 * RF028: after a write that changes the hours, opens a case for the advisor when the hours in
 * force move away from the expected ones beyond the tolerance. Notification to the advisor
 * (RF028 "sinalizar") is the Fase 5 hook: it reads the open cases.
 */
async function detectarDivergencia(tx: Transaction, estagio: EstagioAcompanhado, diaAtual: string) {
  if (estagio.situacao !== "ATIVO") return;
  const parametros = await parametrosEm(tx, diaAtual);
  const totais = await totaisFrequencia(tx, estagio.id, diaAnterior(diaAtual));
  const divergencia = avaliarDivergencia(estagio, totais.minutosCumpridosAteReferencia, parametros.toleranciaDivergenciaPercentual, diaAtual);
  if (!divergencia.divergente) return;
  await abrirDivergencia(tx, {
    estagioId: estagio.id,
    dataReferencia: divergencia.dataReferencia,
    minutosPrevistos: divergencia.minutosPrevistos,
    minutosCumpridos: divergencia.minutosCumpridos,
    toleranciaPercentual: divergencia.toleranciaPercentual,
  });
}

// ---------------------------------------------------------------- lançamentos

export async function listFrequencias(identity: Identity, estagioId: string, filtros: FiltrosFrequencia) {
  return withUser(identity, async (tx) => {
    await carregarEstagioAcompanhado(tx, estagioId);
    return findFrequencias(tx, estagioId, filtros);
  });
}

/**
 * RF023 to RF025: the student records a day of an ATIVO internship. Over a limit, refused
 * (422 LIMITE_JORNADA_EXCEDIDO) or recorded as SINALIZADO, by the institutional parameter.
 */
export async function registrarFrequencia(identity: Identity, estagioId: string, dia: DiaInformado): Promise<FrequenciaRow> {
  const duracaoMinutos = duracaoDoDia(dia);
  try {
    return await withUser(identity, async (tx) => {
      const estagio = await carregarEstagioAcompanhado(tx, estagioId);
      const diaAtual = await hoje(tx);
      exigirLancavel(estagio, dia.data, diaAtual);
      if (!(await travarEstagio(tx, estagioId))) throw estagioNaoEncontrado();
      await avaliarDia(tx, estagio, dia.data, duracaoMinutos);
      const registro = await insertFrequencia(tx, {
        estagioId,
        data: dia.data,
        horaEntrada: dia.horario?.horaEntrada ?? null,
        horaSaida: dia.horario?.horaSaida ?? null,
        intervaloMinutos: dia.horario?.intervaloMinutos ?? 0,
        duracaoMinutos,
        observacao: dia.observacao,
        substituiRegistroId: null,
        justificativaAjuste: null,
        registradoPorUsuarioId: identity.userId,
      });
      await detectarDivergencia(tx, estagio, diaAtual);
      return registro;
    });
  } catch (error) {
    throw traduzirErroFrequencia(error, "registrar frequência");
  }
}

async function carregarRegistro(tx: Transaction, id: string) {
  const registro = await findFrequenciaById(tx, id);
  if (!registro) {
    throw new DomainError({ code: "FREQUENCIA_NAO_ENCONTRADA", kind: "NOT_FOUND", message: "Lançamento de frequência não encontrado.", requisito: "RF023" });
  }
  const estagio = await carregarEstagioAcompanhado(tx, registro.estagioId);
  if (!VIGENTES.includes(registro.situacao)) {
    throw new DomainError({
      code: "LANCAMENTO_JA_AJUSTADO",
      kind: "CONFLICT",
      message: "Este lançamento já foi substituído ou cancelado; corrija o lançamento vigente do dia.",
      requisito: "RF029",
    });
  }
  return { registro, estagio };
}

/**
 * RF029 (DER §4.5, §9.1 P5): a correction is a new row for the same day, with the reason,
 * replacing the previous one, which is kept. The student corrects what is not homologated;
 * the coordination also replaces a homologated entry, which then needs a new homologation.
 */
export async function ajustarFrequencia(identity: Identity, registroId: string, dia: Omit<DiaInformado, "data"> & { justificativa: string }) {
  const duracaoMinutos = duracaoDoDia({ ...dia, data: "" });
  try {
    return await withUser(identity, async (tx) => {
      const { registro, estagio } = await carregarRegistro(tx, registroId);
      const diaAtual = await hoje(tx);
      exigirLancavel(estagio, registro.data, diaAtual);
      if (!(await travarEstagio(tx, estagio.id))) throw estagioNaoEncontrado();
      if (!(await updateFrequencia(tx, registro.id, { situacao: "SUBSTITUIDO" }))) throw acessoNegado("corrigir este lançamento");
      await avaliarDia(tx, estagio, registro.data, duracaoMinutos);
      const novo = await insertFrequencia(tx, {
        estagioId: estagio.id,
        data: registro.data,
        horaEntrada: dia.horario?.horaEntrada ?? null,
        horaSaida: dia.horario?.horaSaida ?? null,
        intervaloMinutos: dia.horario?.intervaloMinutos ?? 0,
        duracaoMinutos,
        observacao: dia.observacao,
        substituiRegistroId: registro.id,
        justificativaAjuste: dia.justificativa,
        registradoPorUsuarioId: identity.userId,
      });
      await detectarDivergencia(tx, estagio, diaAtual);
      return novo;
    });
  } catch (error) {
    throw traduzirErroFrequencia(error, "corrigir frequência");
  }
}

/** RF029: removes a day not homologated (CANCELADO with the reason; the row stays). */
export async function cancelarFrequencia(identity: Identity, registroId: string, justificativa: string) {
  try {
    return await withUser(identity, async (tx) => {
      const { registro, estagio } = await carregarRegistro(tx, registroId);
      const atualizado = await updateFrequencia(tx, registro.id, { situacao: "CANCELADO", justificativaCancelamento: justificativa });
      if (!atualizado) throw acessoNegado("cancelar este lançamento");
      await detectarDivergencia(tx, estagio, await hoje(tx));
      return atualizado;
    });
  } catch (error) {
    throw traduzirErroFrequencia(error, "cancelar frequência");
  }
}

// ---------------------------------------------------------------- homologação

/**
 * RF027, RN-08: the supervisor in force validates the entries waiting in a closed period. Who,
 * when, which entries (homologacao_id), how many minutes and the opinion stay recorded; the
 * entries become immutable for the student.
 */
export async function homologarFrequencia(
  identity: Identity,
  estagioId: string,
  input: { periodoInicio: string; periodoFim: string; observacao: string | null },
) {
  if (input.periodoFim < input.periodoInicio) {
    throw new DomainError({ code: "PERIODO_INVALIDO", kind: "UNPROCESSABLE", message: "O fim do período é anterior ao início.", requisito: "RF027" });
  }
  try {
    return await withUser(identity, async (tx) => {
      const estagio = await carregarEstagioAcompanhado(tx, estagioId);
      if (estagio.situacao !== "ATIVO") {
        throw new DomainError({ code: "ESTAGIO_NAO_ATIVO", kind: "CONFLICT", message: "Só estágio ativo tem frequência homologada.", requisito: "RF027" });
      }
      if (input.periodoFim > (await hoje(tx))) {
        throw new DomainError({ code: "DATA_FUTURA", kind: "UNPROCESSABLE", message: "O período homologado termina no máximo hoje.", requisito: "RF027" });
      }
      if (!(await travarEstagio(tx, estagioId))) throw estagioNaoEncontrado();
      const pendentes = await findPendentesNoPeriodo(tx, estagioId, input.periodoInicio, input.periodoFim);
      if (pendentes.length === 0) {
        throw new DomainError({
          code: "NADA_A_HOMOLOGAR",
          kind: "UNPROCESSABLE",
          message: "Não há lançamento aguardando homologação no período.",
          requisito: "RF027",
        });
      }
      const homologacao = await insertHomologacao(tx, {
        estagioId,
        periodoInicio: input.periodoInicio,
        periodoFim: input.periodoFim,
        minutosHomologados: pendentes.reduce((total, registro) => total + registro.duracaoMinutos, 0),
        observacao: input.observacao,
        homologadoPorUsuarioId: identity.userId,
      });
      if ((await marcarHomologados(tx, pendentes.map((registro) => registro.id), homologacao.id)) !== pendentes.length) {
        throw acessoNegado("homologar a frequência");
      }
      return { homologacao, lancamentos: pendentes.length, sinalizados: pendentes.filter((registro) => registro.excedeuLimite).length };
    });
  } catch (error) {
    throw traduzirErroFrequencia(error, "homologar a frequência");
  }
}

export async function listHomologacoes(identity: Identity, estagioId: string) {
  return withUser(identity, async (tx) => {
    await carregarEstagioAcompanhado(tx, estagioId);
    return findHomologacoes(tx, estagioId);
  });
}

// ---------------------------------------------------------------- carga horária e divergência

/** RF026, RF028: accumulated hours, balance, completion and the divergence from the expected. */
export async function getCargaHoraria(identity: Identity, estagioId: string) {
  return withUser(identity, async (tx) => {
    const estagio = await carregarEstagioAcompanhado(tx, estagioId);
    const diaAtual = await hoje(tx);
    const parametros = await parametrosEm(tx, diaAtual);
    const totais = await totaisFrequencia(tx, estagioId, diaAnterior(diaAtual));
    const aberta = (await findDivergencias(tx, estagioId)).find((caso) => caso.situacao === "ABERTA");
    return {
      estagio,
      resumo: resumoCarga(estagio, totais),
      divergencia: avaliarDivergencia(estagio, totais.minutosCumpridosAteReferencia, parametros.toleranciaDivergenciaPercentual, diaAtual),
      divergenciaAbertaId: aberta?.id ?? null,
    };
  });
}

/**
 * RF028: active internships the caller advises or coordinates whose hours diverge now,
 * calculated on the spot (a student who stops recording appears here before any write).
 */
export async function listEstagiosDivergentes(identity: Identity) {
  return withUser(identity, async (tx) => {
    const diaAtual = await hoje(tx);
    const parametros = await parametrosEm(tx, diaAtual);
    const estagios = await findEstagiosAtivosComCumpridos(tx, diaAnterior(diaAtual));
    const abertas = new Map((await findDivergencias(tx)).filter((caso) => caso.situacao === "ABERTA").map((caso) => [caso.estagioId, caso.id]));
    return estagios
      .map(({ estagio, minutosCumpridos }) => ({
        estagio,
        divergencia: avaliarDivergencia(estagio, minutosCumpridos, parametros.toleranciaDivergenciaPercentual, diaAtual),
        divergenciaAbertaId: abertas.get(estagio.id) ?? null,
      }))
      .filter((item) => item.divergencia.divergente || item.divergenciaAbertaId);
  });
}

export async function listDivergencias(identity: Identity, estagioId: string) {
  return withUser(identity, async (tx) => {
    await carregarEstagioAcompanhado(tx, estagioId);
    return findDivergencias(tx, estagioId);
  });
}

/** RF028, RN-09: the advisor records the analysis, which closes the case and keeps it. */
export async function analisarDivergencia(identity: Identity, divergenciaId: string, parecer: string) {
  try {
    return await withUser(identity, async (tx) => {
      const caso = await findDivergenciaById(tx, divergenciaId);
      if (!caso) {
        throw new DomainError({ code: "DIVERGENCIA_NAO_ENCONTRADA", kind: "NOT_FOUND", message: "Divergência não encontrada.", requisito: "RF028" });
      }
      if (caso.situacao !== "ABERTA") {
        throw new DomainError({ code: "DIVERGENCIA_JA_ANALISADA", kind: "CONFLICT", message: "A divergência já foi analisada.", requisito: "RF028" });
      }
      const analisada = await gravarAnalise(tx, divergenciaId, parecer, identity.userId);
      if (!analisada) throw acessoNegado("analisar a divergência");
      return analisada;
    });
  } catch (error) {
    throw traduzirErroFrequencia(error, "analisar a divergência");
  }
}
