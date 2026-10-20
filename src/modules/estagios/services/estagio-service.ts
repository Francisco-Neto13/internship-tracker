import { withUser, type Transaction } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { parametrosVigentesEm } from "@/modules/academico/services/parametro-service";
import { exigirDocumento } from "@/shared/documentos/documento-service";
import { exigirAtivavel } from "../domain/ativacao";
import { hashTce, validarTce, type DadosTce } from "../domain/tce";
import { findAditivos } from "../repositories/aditivo-repository";
import {
  convenioVigenteEm,
  cursoDoEstudante,
  diasUsadosNoPar,
  findEstagioById,
  findEstagios,
  historicoConcedente,
  insertEstagio,
  lockEstagio,
  situacaoAcademica,
  situacaoConcedente,
  temOutroEstagioAtivo,
  updateEstagio,
  type EstagioRow,
} from "../repositories/estagio-repository";
import { findApolices, findAssinaturas, findPlanos, findResponsaveis, temResponsavelEm } from "../repositories/formalizacao-repository";
import { estagioNaoEncontrado, traduzirErroEstagio } from "./erros";

// M04: life cycle of the internship (requisitos §8.6, D9; ARQUITETURA §5.1; DER §5.1).
// Writes go through withUser: RLS checks who may write and the audit trigger records the author.

export type DadosTceEntrada = Omit<DadosTce, "cursoId" | "dispensaDuracaoMaxima">;

type Situacao = EstagioRow["situacao"];

function paraDadosTce(row: EstagioRow): DadosTce {
  return {
    estudanteId: row.estudanteId,
    cursoId: row.cursoId,
    concedenteId: row.concedenteId,
    convenioId: row.convenioId,
    tipo: row.tipo,
    dataInicio: row.dataInicio,
    dataFimPactuada: row.dataFimPactuada,
    cargaDiariaMinutos: row.cargaDiariaMinutos,
    cargaSemanalMinutos: row.cargaSemanalMinutos,
    cargaTotalMinutos: row.cargaTotalMinutos,
    condicoesPactuadas: row.condicoesPactuadas,
    bolsaValor: row.bolsaValor,
    auxilioTransporteValor: row.auxilioTransporteValor,
    seguroExigido: row.seguroExigido,
    dispensaDuracaoMaxima: row.dispensaDuracaoMaxima,
  };
}

/**
 * The rules that depend on other records, checked on every create and edit of the TCE:
 * the student is enrolled (D10), the concedente is not suspended (RF008, RN-31), an agreement
 * is valid on the start date (RF010) and the content respects the law and the parameters in
 * force on the start date (RF044, RF024, RF062).
 */
async function validarContexto(tx: Transaction, dados: DadosTce, estagioId: string | null) {
  const situacaoEstudante = await situacaoAcademica(tx, dados.estudanteId);
  if (situacaoEstudante === null) {
    throw new DomainError({ code: "ESTUDANTE_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Estudante não encontrado.", requisito: "RF005" });
  }
  if (situacaoEstudante !== "MATRICULADO") {
    throw new DomainError({
      code: "ESTUDANTE_NAO_MATRICULADO",
      kind: "UNPROCESSABLE",
      message: "Só estudante com matrícula regular formaliza estágio (Lei 11.788/2008, art. 3º, I).",
      requisito: "RF005",
    });
  }
  const concedente = await situacaoConcedente(tx, dados.concedenteId);
  if (concedente === null) {
    throw new DomainError({ code: "CONCEDENTE_NAO_ENCONTRADA", kind: "NOT_FOUND", message: "Concedente não encontrada.", requisito: "RF007" });
  }
  if (concedente === "SUSPENSA") {
    throw new DomainError({ code: "CONCEDENTE_SUSPENSA", kind: "CONFLICT", message: "A concedente está suspensa para novos estágios.", requisito: "RF008" });
  }
  if (!(await convenioVigenteEm(tx, dados.convenioId, dados.concedenteId, dados.dataInicio))) {
    throw new DomainError({
      code: "CONVENIO_VENCIDO",
      kind: "UNPROCESSABLE",
      message: "O convênio informado não é da concedente ou não está vigente na data de início.",
      requisito: "RF010",
    });
  }
  const parametros = await parametrosVigentesEm(tx, dados.dataInicio);
  validarTce(dados, {
    limiteDiarioMinutos: dados.tipo === "OBRIGATORIO" ? parametros.limiteDiarioObrigatorioMinutos : parametros.limiteDiarioNaoObrigatorioMinutos,
    limiteSemanalMinutos: parametros.limiteSemanalMinutos,
    duracaoMaximaMeses: parametros.duracaoMaximaMeses,
    diasUsadosNoPar: await diasUsadosNoPar(tx, dados.estudanteId, dados.concedenteId, estagioId),
  });
}

function exigirTceEmEdicao(row: EstagioRow) {
  if (row.situacao !== "EM_FORMALIZACAO") {
    throw new DomainError({ code: "ESTAGIO_JA_ATIVADO", kind: "CONFLICT", message: "Depois da ativação o TCE muda só por aditivo.", requisito: "RF020" });
  }
  if (row.hashTce) {
    throw new DomainError({ code: "TCE_FECHADO", kind: "CONFLICT", message: "O TCE está fechado para assinatura: reabra-o para editar.", requisito: "RF019" });
  }
}

async function carregar(tx: Transaction, id: string, travar = false): Promise<EstagioRow> {
  const row = travar ? await lockEstagio(tx, id) : await findEstagioById(tx, id);
  if (!row) throw estagioNaoEncontrado();
  return row;
}

async function gravar(tx: Transaction, id: string, values: Partial<EstagioRow>, acao: string): Promise<EstagioRow> {
  const row = await updateEstagio(tx, id, values);
  if (!row) {
    throw new DomainError({ code: "ACESSO_NEGADO", kind: "FORBIDDEN", message: `O perfil atual não permite ${acao}.`, requisito: "RF003" });
  }
  return row;
}

export async function listEstagios(
  identity: Identity,
  query: { page: number; limit: number; situacao?: Situacao; tipo?: EstagioRow["tipo"]; cursoId?: string; concedenteId?: string; estudanteId?: string },
) {
  return withUser(identity, (tx) => findEstagios(tx, { ...query, offset: (query.page - 1) * query.limit }));
}

/** RF015: creates the internship in EM_FORMALIZACAO with its TCE in edition. */
export async function createEstagio(identity: Identity, input: DadosTceEntrada): Promise<EstagioRow> {
  try {
    return await withUser(identity, async (tx) => {
      const cursoId = await cursoDoEstudante(tx, input.estudanteId);
      if (!cursoId) {
        throw new DomainError({ code: "ESTUDANTE_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Estudante não encontrado.", requisito: "RF005" });
      }
      const dados: DadosTce = { ...input, cursoId, dispensaDuracaoMaxima: false };
      await validarContexto(tx, dados, null);
      return insertEstagio(tx, {
        ...dados,
        dataFimPrevista: dados.dataFimPactuada,
        criadoPorUsuarioId: identity.userId,
      });
    });
  } catch (error) {
    throw traduzirErroEstagio(error, "formalizar estágio para este estudante");
  }
}

/** RF015: edits the TCE while it is in edition (before closing for signature). */
export async function updateTce(identity: Identity, id: string, input: Partial<DadosTceEntrada>): Promise<EstagioRow> {
  if (input.estudanteId) {
    throw new DomainError({ code: "ALTERACAO_ESTAGIO_VEDADA", kind: "UNPROCESSABLE", message: "O estudante do estágio não muda.", requisito: "RF015" });
  }
  try {
    return await withUser(identity, async (tx) => {
      const atual = await carregar(tx, id, true);
      exigirTceEmEdicao(atual);
      const dados: DadosTce = { ...paraDadosTce(atual), ...input };
      await validarContexto(tx, dados, id);
      return gravar(tx, id, { ...input, dataFimPrevista: dados.dataFimPactuada }, "editar o TCE");
    });
  } catch (error) {
    throw traduzirErroEstagio(error, "editar o TCE");
  }
}

/**
 * D5, Lei 11.788/2008 art. 11: the exemption from the maximum duration for an intern with a
 * disability, recorded on the internship by coordination with a sensitive document. Nothing
 * about the disability is stored on the student.
 */
export async function definirDispensaDuracao(identity: Identity, id: string, documentoId: string | null): Promise<EstagioRow> {
  if (documentoId) await exigirDocumento(identity, documentoId, { tipo: "DISPENSA_DURACAO", estagioId: id });
  try {
    return await withUser(identity, async (tx) => {
      const atual = await carregar(tx, id, true);
      exigirTceEmEdicao(atual);
      const dados: DadosTce = { ...paraDadosTce(atual), dispensaDuracaoMaxima: documentoId !== null };
      if (!dados.dispensaDuracaoMaxima) await validarContexto(tx, dados, id);
      return gravar(tx, id, { dispensaDuracaoMaxima: dados.dispensaDuracaoMaxima, dispensaDocumentoId: documentoId }, "registrar a dispensa");
    });
  } catch (error) {
    throw traduzirErroEstagio(error, "registrar a dispensa");
  }
}

/** D9, RF019, RNF-08: freezes the TCE and records the hash the parties sign. */
export async function fecharTce(identity: Identity, id: string): Promise<EstagioRow> {
  try {
    return await withUser(identity, async (tx) => {
      const atual = await carregar(tx, id, true);
      exigirTceEmEdicao(atual);
      await validarContexto(tx, paraDadosTce(atual), id);
      return gravar(tx, id, { hashTce: hashTce(paraDadosTce(atual)), tceFechadoEm: new Date() }, "fechar o TCE");
    });
  } catch (error) {
    throw traduzirErroEstagio(error, "fechar o TCE");
  }
}

/**
 * D9: reopens a closed TCE for correction. The signatures already collected stay recorded
 * but stop counting, because they are over the previous hash.
 */
export async function reabrirTce(identity: Identity, id: string, justificativa: string): Promise<EstagioRow> {
  try {
    return await withUser(identity, async (tx) => {
      const atual = await carregar(tx, id, true);
      if (atual.situacao !== "EM_FORMALIZACAO") {
        throw new DomainError({ code: "ESTAGIO_JA_ATIVADO", kind: "CONFLICT", message: "Depois da ativação o TCE muda só por aditivo.", requisito: "RF020" });
      }
      if (!atual.hashTce) {
        throw new DomainError({ code: "TCE_EM_EDICAO", kind: "CONFLICT", message: "O TCE já está em edição.", requisito: "RF015" });
      }
      return gravar(tx, id, { hashTce: null, tceFechadoEm: null, justificativaReabertura: justificativa }, "reabrir o TCE");
    });
  } catch (error) {
    throw traduzirErroEstagio(error, "reabrir o TCE");
  }
}

/**
 * EM_FORMALIZACAO -> ATIVO. All guards on facts read in one transaction with the internship
 * locked; every impediment reported at once (409 ATIVACAO_BLOQUEADA).
 */
export async function ativarEstagio(identity: Identity, id: string): Promise<EstagioRow> {
  try {
    return await withUser(identity, async (tx) => {
      const atual = await carregar(tx, id, true);
      const planos = await findPlanos(tx, id);
      const assinaturas = await findAssinaturas(tx, id);
      const apolices = await findApolices(tx, id);
      exigirAtivavel({
        situacao: atual.situacao,
        hashTce: atual.hashTce,
        dataInicio: atual.dataInicio,
        dataFimPrevista: atual.dataFimPrevista,
        seguroExigido: atual.seguroExigido,
        concedenteAtiva: (await situacaoConcedente(tx, atual.concedenteId)) === "ATIVA",
        convenioVigenteNoInicio: await convenioVigenteEm(tx, atual.convenioId, atual.concedenteId, atual.dataInicio),
        planoAprovado: planos.some((plano) => plano.situacao === "APROVADO"),
        orientadorNoInicio: await temResponsavelEm(tx, id, "ORIENTADOR", atual.dataInicio),
        supervisorNoInicio: await temResponsavelEm(tx, id, "SUPERVISOR", atual.dataInicio),
        apolices: apolices.map((apolice) => ({ inicio: apolice.vigenciaInicio, fim: apolice.vigenciaFim })),
        partesQueAssinaramOHashAtual: [
          ...new Set(assinaturas.filter((a) => !a.aditivoId && a.hashDocumento === atual.hashTce).map((a) => a.parte)),
        ],
        estudanteMatriculado: (await situacaoAcademica(tx, atual.estudanteId)) === "MATRICULADO",
        outroEstagioAtivo: await temOutroEstagioAtivo(tx, atual.estudanteId, id),
      });
      return gravar(tx, id, { situacao: "ATIVO", ativadoEm: new Date() }, "ativar o estágio");
    });
  } catch (error) {
    throw traduzirErroEstagio(error, "ativar o estágio");
  }
}

/** Formalization steps derived from the data (D9): no state of their own. */
export function etapasFormalizacao(row: EstagioRow, assinaturas: { parte: string; hashDocumento: string; aditivoId: string | null }[]) {
  const assinadas = row.hashTce
    ? [...new Set(assinaturas.filter((a) => !a.aditivoId && a.hashDocumento === row.hashTce).map((a) => a.parte))]
    : [];
  return {
    tce: row.hashTce ? "FECHADO" : "EM_EDICAO",
    partesAssinadas: assinadas,
    partesPendentes: ["ESTUDANTE", "INSTITUICAO", "CONCEDENTE"].filter((parte) => !assinadas.includes(parte)),
  };
}

/** RF015, RF021: the internship with TCE, plans, responsible people, insurance, signatures and amendments. */
export async function getEstagioDetalhado(identity: Identity, id: string) {
  return withUser(identity, async (tx) => {
    const estagio = await carregar(tx, id);
    const [planos, responsaveis, apolices, assinaturas, aditivos] = [
      await findPlanos(tx, id),
      await findResponsaveis(tx, id),
      await findApolices(tx, id),
      await findAssinaturas(tx, id),
      await findAditivos(tx, id),
    ];
    return { estagio, planos, responsaveis, apolices, assinaturas, aditivos, etapas: etapasFormalizacao(estagio, assinaturas) };
  });
}

// ---------------------------------------------------------------- queries used by other modules

/** RF008, RN-31: active internships preserved when a concedente is suspended. */
export async function contarEstagiosEmAndamento(tx: Transaction, concedenteId: string): Promise<number> {
  return (await historicoConcedente(tx, concedenteId)).ATIVO ?? 0;
}

/** RF014: aggregate history of a concedente (no personal data). */
export async function getHistoricoConcedente(identity: Identity, concedenteId: string) {
  const porSituacao = await withUser(identity, (tx) => historicoConcedente(tx, concedenteId));
  const concluidos = porSituacao.CONCLUIDO ?? 0;
  const rescindidos = porSituacao.RESCINDIDO ?? 0;
  return {
    total: Object.values(porSituacao).reduce((soma, quantidade) => soma + quantidade, 0),
    porSituacao,
    // Share of the finished internships that reached the end (RF014 "taxa de conclusão")
    taxaConclusao: concluidos + rescindidos === 0 ? null : concluidos / (concluidos + rescindidos),
    // RF014 asks for the average evaluation too: it arrives with avaliacao_desempenho (Fase 3)
    mediaAvaliacoes: null,
  };
}
