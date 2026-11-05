import { sql } from "drizzle-orm";
import { isRlsViolation, isTriggerRule, isUniqueViolation } from "@/db/errors";
import { withUser, type Transaction } from "@/db/with-user";
import { DomainError, type DomainErrorKind } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { exigirDocumento } from "@/shared/documentos/documento-service";
import { calcularAproveitamento, periodoValido } from "../domain/aproveitamento";
import {
  estudanteAtualId,
  findAnalises,
  findAtividadeById,
  findAtividades,
  findAtividadesPagina,
  findComprovantePorHash,
  findComprovantes,
  findSaldos,
  insertAnalise,
  insertAtividade,
  insertComprovantes,
  retirarComprovantes,
  updateAtividade,
  type AtividadeRow,
  type FiltrosAtividade,
} from "../repositories/atividade-repository";

// M06 complementary activities (RF046 to RF055, RN-18 to RN-23, RN-36). The student registers
// with the proof; the coordination of the course approves (the minutes counted are decided by
// the database), refuses with a reason or returns for complementation. Who reads: the student
// and the coordination (DER §4.6).

type Regra = { codigo: string; kind: DomainErrorKind; mensagem: string; requisito: string };

const REGRAS: Regra[] = [
  { codigo: "TRANSICAO_ATIVIDADE_INVALIDA", kind: "CONFLICT", mensagem: "A situação da atividade não permite esta operação.", requisito: "RF054" },
  { codigo: "CADASTRO_RESTRITO_AO_ESTUDANTE", kind: "FORBIDDEN", mensagem: "Só o estudante cadastra e complementa a própria atividade.", requisito: "RF049" },
  { codigo: "ATIVIDADE_IMUTAVEL", kind: "CONFLICT", mensagem: "A atividade só muda quando devolvida para complementação.", requisito: "RF055" },
  { codigo: "CATEGORIA_INATIVA", kind: "UNPROCESSABLE", mensagem: "A categoria não está ativa.", requisito: "RF048" },
  { codigo: "CATEGORIA_FORA_DO_CURSO", kind: "UNPROCESSABLE", mensagem: "O curso do estudante não aproveita horas nesta categoria.", requisito: "RF048" },
  { codigo: "ATIVIDADE_FUTURA", kind: "UNPROCESSABLE", mensagem: "Registra-se a atividade já realizada.", requisito: "RF049" },
  { codigo: "COMPROVANTE_OBRIGATORIO", kind: "UNPROCESSABLE", mensagem: "A atividade precisa de ao menos um comprovante.", requisito: "RF050" },
  { codigo: "COMPROVANTE_FORA_DO_ENVIO", kind: "CONFLICT", mensagem: "Comprovante entra no cadastro ou na complementação.", requisito: "RF055" },
  { codigo: "DOCUMENTO_INVALIDO", kind: "UNPROCESSABLE", mensagem: "O comprovante precisa ser documento do tipo COMPROVANTE_ATIVIDADE do estudante.", requisito: "RF050" },
  { codigo: "ATIVIDADE_NAO_ANALISAVEL", kind: "CONFLICT", mensagem: "Só atividade em análise recebe decisão.", requisito: "RF054" },
  { codigo: "ANALISE_RESTRITA_A_COORDENACAO", kind: "FORBIDDEN", mensagem: "Só a coordenação do curso do estudante analisa a atividade.", requisito: "RF053" },
  { codigo: "DUPLA_CONTAGEM_VEDADA", kind: "UNPROCESSABLE", mensagem: "Estas horas não podem ser aproveitadas como atividade complementar.", requisito: "RF047" },
  { codigo: "REGISTRO_IMUTAVEL", kind: "CONFLICT", mensagem: "O registro não pode ser alterado.", requisito: "RN-28" },
];

const UNICOS: Record<string, Omit<Regra, "kind">> = {
  atividade_sem_duplicidade: { codigo: "ATIVIDADE_DUPLICADA", mensagem: "Esta atividade já foi cadastrada.", requisito: "RF052" },
  comprovante_unico_por_estudante: { codigo: "COMPROVANTE_DUPLICADO", mensagem: "Este comprovante já foi usado em outra atividade.", requisito: "RF052" },
  comprovante_atividade_documento_id_unique: { codigo: "COMPROVANTE_DUPLICADO", mensagem: "Este documento já é comprovante de outra atividade.", requisito: "RF052" },
  atividade_uma_por_estagio: { codigo: "DUPLA_CONTAGEM_VEDADA", mensagem: "Este estágio já foi aproveitado como atividade complementar.", requisito: "RF047" },
};

function traduzir(error: unknown, acao: string): unknown {
  if (error instanceof DomainError) return error;
  if (isRlsViolation(error)) {
    return new DomainError({ code: "ACESSO_NEGADO", kind: "FORBIDDEN", message: `O perfil atual não permite ${acao}.`, requisito: "RF003" });
  }
  for (const regra of REGRAS) {
    if (isTriggerRule(error, regra.codigo)) return new DomainError({ code: regra.codigo, kind: regra.kind, message: regra.mensagem, requisito: regra.requisito });
  }
  for (const [constraint, regra] of Object.entries(UNICOS)) {
    if (isUniqueViolation(error, constraint)) {
      return new DomainError({ code: regra.codigo, kind: regra.codigo === "DUPLA_CONTAGEM_VEDADA" ? "UNPROCESSABLE" : "CONFLICT", message: regra.mensagem, requisito: regra.requisito });
    }
  }
  return error;
}

const naoEncontrada = () =>
  new DomainError({ code: "ATIVIDADE_NAO_ENCONTRADA", kind: "NOT_FOUND", message: "Atividade complementar não encontrada.", requisito: "RF049" });

async function carregar(tx: Transaction, id: string): Promise<AtividadeRow> {
  const atividade = await findAtividadeById(tx, id);
  if (!atividade) throw naoEncontrada();
  return atividade;
}

function exigirPeriodo(dataInicio: string, dataFim: string, hoje: string) {
  const resultado = periodoValido(dataInicio, dataFim, hoje);
  if (resultado === "PERIODO_INVALIDO") {
    throw new DomainError({ code: "PERIODO_INVALIDO", kind: "UNPROCESSABLE", message: "O fim da atividade é anterior ao início.", requisito: "RF049" });
  }
  if (resultado === "ATIVIDADE_FUTURA") {
    throw new DomainError({ code: "ATIVIDADE_FUTURA", kind: "UNPROCESSABLE", message: "Registra-se a atividade já realizada.", requisito: "RF049" });
  }
}

async function hoje(tx: Transaction): Promise<string> {
  const { rows } = await tx.execute<{ hoje: string }>(sql`select app.hoje()::text as hoje`);
  return rows[0].hoje;
}

/** RF050, RF052: proofs are the student's COMPROVANTE_ATIVIDADE documents, each file used once. */
async function conferirComprovantes(identity: Identity, estudanteId: string, documentoIds: string[]) {
  const documentos = [];
  for (const id of new Set(documentoIds)) {
    const doc = await exigirDocumento(identity, id, { tipo: "COMPROVANTE_ATIVIDADE", estudanteId });
    documentos.push({ id: doc.id, sha256: doc.sha256 });
  }
  return documentos;
}

async function exigirInedito(tx: Transaction, estudanteId: string, documentos: { sha256: string }[]) {
  const repetido = await findComprovantePorHash(tx, estudanteId, documentos.map((doc) => doc.sha256));
  if (repetido) {
    throw new DomainError({
      code: "COMPROVANTE_DUPLICADO",
      kind: "CONFLICT",
      message: "Este comprovante já foi usado em outra atividade.",
      requisito: "RF052",
      details: [{ code: "ATIVIDADE_ORIGINAL", field: "atividade_id", issue: repetido.atividadeId, requisito: "RF052" }],
    });
  }
}

// ---------------------------------------------------------------- leitura

export async function listAtividades(identity: Identity, filtros: FiltrosAtividade) {
  return withUser(identity, (tx) => findAtividades(tx, filtros));
}

/** RNF-11: one page for the list screens. */
export async function listAtividadesPagina(identity: Identity, filtros: FiltrosAtividade, query: { page: number; limit: number }) {
  return withUser(identity, (tx) => findAtividadesPagina(tx, filtros, { limit: query.limit, offset: (query.page - 1) * query.limit }));
}

/** RF055: the activity with its proofs and the whole history of analyses. */
export async function getAtividade(identity: Identity, id: string) {
  return withUser(identity, async (tx) => {
    const atividade = await carregar(tx, id);
    return { atividade, comprovantes: await findComprovantes(tx, id), analises: await findAnalises(tx, id) };
  });
}

/**
 * RF053: the coordination's queue, oldest sending first, with the preview of what the approval
 * would count (RF051): the database decides at approval with the same rule.
 */
export async function listFilaAnalise(identity: Identity) {
  return withUser(identity, async (tx) => comPrevia(tx, (await findAtividades(tx, { situacao: "EM_ANALISE" })).reverse()));
}

async function comPrevia(tx: Transaction, fila: AtividadeRow[]) {
  const saldos = new Map((await findSaldos(tx, fila.map((atividade) => atividade.id))).map((saldo) => [saldo.atividadeId, saldo]));
  return fila.map((atividade) => {
    const saldo = saldos.get(atividade.id);
    return {
      atividade,
      previa: saldo ? calcularAproveitamento({ declaradosMinutos: atividade.horasDeclaradasMinutos, ...saldo }) : null,
    };
  });
}

/** RF053, RNF-11: one page of the queue for the screen; the preview is computed only for it. */
export async function listFilaAnalisePagina(identity: Identity, query: { page: number; limit: number }) {
  return withUser(identity, async (tx) => {
    const { items, total } = await findAtividadesPagina(tx, { situacao: "EM_ANALISE" }, { limit: query.limit, offset: (query.page - 1) * query.limit, maisAntigasPrimeiro: true });
    // RF053: whoever decides has to see the proof. Per row, and only for the page on screen
    const comProvas = [];
    for (const item of await comPrevia(tx, items)) {
      comProvas.push({ ...item, comprovantes: await findComprovantes(tx, item.atividade.id) });
    }
    return { items: comProvas, total };
  });
}

// ---------------------------------------------------------------- estudante

export type DadosAtividade = {
  categoriaId: string;
  descricao: string;
  instituicaoPromotora: string;
  dataInicio: string;
  dataFim: string;
  horasDeclaradasMinutos: number;
};

/**
 * RF049, RF050, RF053: the student registers the activity with at least one proof; it goes
 * straight to the coordination's analysis. RF046: `origemEstagioId` counts a concluded
 * non-mandatory internship, under the double-count bar (RN-36, DER §5.9).
 */
export async function cadastrarAtividade(identity: Identity, input: DadosAtividade & { documentoIds: string[]; origemEstagioId: string | null }) {
  if (input.documentoIds.length === 0) {
    throw new DomainError({ code: "COMPROVANTE_OBRIGATORIO", kind: "UNPROCESSABLE", message: "Anexe ao menos um comprovante.", requisito: "RF050" });
  }
  const estudanteId = await withUser(identity, async (tx) => {
    const id = await estudanteAtualId(tx);
    if (!id) {
      throw new DomainError({ code: "CADASTRO_RESTRITO_AO_ESTUDANTE", kind: "FORBIDDEN", message: "Só o estudante cadastra a própria atividade.", requisito: "RF049" });
    }
    exigirPeriodo(input.dataInicio, input.dataFim, await hoje(tx));
    return id;
  });
  const documentos = await conferirComprovantes(identity, estudanteId, input.documentoIds);
  try {
    return await withUser(identity, async (tx) => {
      await exigirInedito(tx, estudanteId, documentos);
      const atividade = await insertAtividade(tx, {
        estudanteId,
        categoriaId: input.categoriaId,
        descricao: input.descricao,
        instituicaoPromotora: input.instituicaoPromotora,
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
        horasDeclaradasMinutos: input.horasDeclaradasMinutos,
        origemEstagioId: input.origemEstagioId,
        registradaPorUsuarioId: identity.userId,
      });
      await insertComprovantes(tx, atividade.id, estudanteId, documentos);
      return atividade;
    });
  } catch (error) {
    throw traduzir(error, "cadastrar atividade complementar");
  }
}

/**
 * RF055: while returned, the student corrects the data, attaches new proofs and withdraws old
 * ones; the history of analyses stays. The activity goes back to analysis with `reenviar`.
 */
export async function complementarAtividade(
  identity: Identity,
  id: string,
  input: { dados: Partial<DadosAtividade>; adicionarDocumentoIds: string[]; retirarComprovanteIds: string[] },
) {
  const atividadeAtual = await withUser(identity, (tx) => carregar(tx, id));
  if (atividadeAtual.situacao !== "DEVOLVIDA") {
    throw new DomainError({ code: "ATIVIDADE_IMUTAVEL", kind: "CONFLICT", message: "A atividade só muda quando devolvida para complementação.", requisito: "RF055" });
  }
  const documentos = await conferirComprovantes(identity, atividadeAtual.estudanteId, input.adicionarDocumentoIds);
  try {
    return await withUser(identity, async (tx) => {
      const atividade = await carregar(tx, id);
      if (input.dados.dataInicio || input.dados.dataFim) {
        exigirPeriodo(input.dados.dataInicio ?? atividade.dataInicio, input.dados.dataFim ?? atividade.dataFim, await hoje(tx));
      }
      const mudancas = Object.fromEntries(Object.entries(input.dados).filter(([, valor]) => valor !== undefined));
      if (Object.keys(mudancas).length > 0 && !(await updateAtividade(tx, id, mudancas))) {
        throw new DomainError({ code: "CADASTRO_RESTRITO_AO_ESTUDANTE", kind: "FORBIDDEN", message: "Só o estudante complementa a própria atividade.", requisito: "RF055" });
      }
      if ((await retirarComprovantes(tx, id, input.retirarComprovanteIds)) !== new Set(input.retirarComprovanteIds).size) {
        throw new DomainError({ code: "COMPROVANTE_NAO_ENCONTRADO", kind: "UNPROCESSABLE", message: "Comprovante a retirar não é desta atividade.", requisito: "RF055" });
      }
      await exigirInedito(tx, atividade.estudanteId, documentos);
      await insertComprovantes(tx, id, atividade.estudanteId, documentos);
      return carregar(tx, id);
    });
  } catch (error) {
    throw traduzir(error, "complementar a atividade");
  }
}

/** RF055: DEVOLVIDA -> EM_ANALISE, with at least one valid proof (checked at commit). */
export async function reenviarAtividade(identity: Identity, id: string) {
  try {
    return await withUser(identity, async (tx) => {
      const atividade = await carregar(tx, id);
      if (atividade.situacao !== "DEVOLVIDA") {
        throw new DomainError({ code: "TRANSICAO_ATIVIDADE_INVALIDA", kind: "CONFLICT", message: "Só atividade devolvida é reenviada.", requisito: "RF055" });
      }
      const reenviada = await updateAtividade(tx, id, { situacao: "EM_ANALISE" });
      if (!reenviada) {
        throw new DomainError({ code: "CADASTRO_RESTRITO_AO_ESTUDANTE", kind: "FORBIDDEN", message: "Só o estudante reenvia a própria atividade.", requisito: "RF055" });
      }
      return reenviada;
    });
  } catch (error) {
    throw traduzir(error, "reenviar a atividade");
  }
}

// ---------------------------------------------------------------- coordenação

/**
 * RF051, RF054, RN-22, RN-23: the coordination approves (the database counts what fits the
 * category limit and the course total and records the excess with its reason), refuses with
 * a reason (final) or returns for complementation with guidance.
 */
export async function decidirAtividade(identity: Identity, id: string, decisao: "APROVADA" | "RECUSADA" | "DEVOLVIDA", motivo: string | null) {
  const texto = motivo?.trim() || null;
  if (decisao !== "APROVADA" && !texto) {
    throw new DomainError({
      code: "MOTIVO_OBRIGATORIO",
      kind: "UNPROCESSABLE",
      message: decisao === "RECUSADA" ? "A recusa exige motivo." : "A devolução exige a orientação do que complementar.",
      requisito: "RF054",
    });
  }
  try {
    return await withUser(identity, async (tx) => {
      const atividade = await carregar(tx, id);
      if (atividade.situacao !== "EM_ANALISE") {
        throw new DomainError({ code: "ATIVIDADE_NAO_ANALISAVEL", kind: "CONFLICT", message: "Só atividade em análise recebe decisão.", requisito: "RF054" });
      }
      const analise = await insertAnalise(tx, { atividadeId: id, decisao, motivo: texto, analisadoPorUsuarioId: identity.userId });
      return { analise, atividade: await carregar(tx, id) };
    });
  } catch (error) {
    throw traduzir(error, "analisar a atividade");
  }
}
