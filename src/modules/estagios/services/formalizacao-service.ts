import { withUser, type Transaction } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { exigirDocumento } from "@/shared/documentos/documento-service";
import { dataLocal } from "@/modules/academico/domain/parametros";
import { findEstagioById, podeAssinar, type EstagioRow } from "../repositories/estagio-repository";
import {
  encerrarResponsavel,
  findApolices,
  findAssinaturas,
  findPlanoById,
  findPlanos,
  findResponsaveis,
  findResponsavelAtual,
  insertApolice,
  insertAssinatura,
  insertPlano,
  insertResponsavel,
  nomeDoUsuario,
  updatePlano,
  type PlanoRow,
  type ResponsavelRow,
} from "../repositories/formalizacao-repository";
import { estagioNaoEncontrado, traduzirErroEstagio } from "./erros";

// Formalization pieces of an internship: activity plan (RF016, RF017), responsible people
// (RF031, RF034), insurance (RF018) and TCE signatures (RF019). RLS decides who writes; the
// triggers of functions/07_estagios.sql freeze what must not change.

type Papel = ResponsavelRow["papel"];
type Parte = "ESTUDANTE" | "INSTITUICAO" | "CONCEDENTE";

async function carregarEstagio(tx: Transaction, id: string): Promise<EstagioRow> {
  const row = await findEstagioById(tx, id);
  if (!row) throw estagioNaoEncontrado();
  return row;
}

function encerrado(row: EstagioRow) {
  if (row.situacao === "CONCLUIDO" || row.situacao === "RESCINDIDO") {
    throw new DomainError({ code: "ESTAGIO_ENCERRADO", kind: "CONFLICT", message: "O estágio já foi encerrado.", requisito: "RF015" });
  }
}

const proximoDia = (data: string) => {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

// ---------------------------------------------------------------- plano de atividades

export async function listPlanos(identity: Identity, estagioId: string) {
  return withUser(identity, async (tx) => {
    await carregarEstagio(tx, estagioId);
    return findPlanos(tx, estagioId);
  });
}

/**
 * RF016: records the plan. A draft in progress is edited in place; otherwise a new version is
 * created (after a return or to replace the approved one), keeping the previous versions.
 */
export async function registrarPlano(
  identity: Identity,
  estagioId: string,
  input: { atividadesPrevistas: string; justificativaCompatibilidade: string },
): Promise<PlanoRow> {
  try {
    return await withUser(identity, async (tx) => {
      encerrado(await carregarEstagio(tx, estagioId));
      const rascunho = (await findPlanos(tx, estagioId)).find((plano) => plano.situacao === "RASCUNHO");
      if (rascunho) {
        const atualizado = await updatePlano(tx, rascunho.id, input);
        if (!atualizado) throw acessoNegado("elaborar o plano");
        return atualizado;
      }
      return insertPlano(tx, { estagioId, ...input, elaboradoPorUsuarioId: identity.userId });
    });
  } catch (error) {
    throw traduzirErroEstagio(error, "elaborar o plano de atividades");
  }
}

/** RF017: the draft goes to the advisor; its content is frozen from here on. */
export async function submeterPlano(identity: Identity, estagioId: string): Promise<PlanoRow> {
  return transicaoPlano(identity, estagioId, "RASCUNHO", async (tx, plano) =>
    updatePlano(tx, plano.id, { situacao: "AGUARDANDO_APROVACAO" }),
  );
}

/**
 * RF017: the advisor approves or returns with an opinion. Approving a new version replaces
 * the approved one (SUBSTITUIDO), which stays as history.
 */
export async function decidirPlano(
  identity: Identity,
  estagioId: string,
  decisao: "APROVADO" | "DEVOLVIDO",
  parecer: string | null,
): Promise<PlanoRow> {
  if (decisao === "DEVOLVIDO" && !parecer) {
    throw new DomainError({ code: "PARECER_OBRIGATORIO", kind: "UNPROCESSABLE", message: "A devolução exige parecer.", requisito: "RF017" });
  }
  return transicaoPlano(identity, estagioId, "AGUARDANDO_APROVACAO", async (tx, plano) => {
    if (decisao === "APROVADO") {
      const aprovado = (await findPlanos(tx, estagioId)).find((item) => item.situacao === "APROVADO");
      if (aprovado) await updatePlano(tx, aprovado.id, { situacao: "SUBSTITUIDO" });
    }
    return updatePlano(tx, plano.id, { situacao: decisao, parecer, decididoPorUsuarioId: identity.userId, decididoEm: new Date() });
  });
}

async function transicaoPlano(
  identity: Identity,
  estagioId: string,
  situacaoEsperada: PlanoRow["situacao"],
  aplicar: (tx: Transaction, plano: PlanoRow) => Promise<PlanoRow | undefined>,
): Promise<PlanoRow> {
  try {
    return await withUser(identity, async (tx) => {
      encerrado(await carregarEstagio(tx, estagioId));
      const plano = (await findPlanos(tx, estagioId)).find((item) => item.situacao === situacaoEsperada);
      if (!plano) {
        throw new DomainError({
          code: "PLANO_NAO_ENCONTRADO",
          kind: "CONFLICT",
          message: situacaoEsperada === "RASCUNHO" ? "Não há plano em rascunho para enviar." : "Não há plano aguardando aprovação.",
          requisito: "RF017",
        });
      }
      const resultado = await aplicar(tx, plano);
      if (!resultado) throw acessoNegado("alterar o plano");
      return (await findPlanoById(tx, resultado.id))!;
    });
  } catch (error) {
    throw traduzirErroEstagio(error, "alterar o plano de atividades");
  }
}

// ---------------------------------------------------------------- responsáveis

export async function listResponsaveis(identity: Identity, estagioId: string) {
  return withUser(identity, async (tx) => {
    await carregarEstagio(tx, estagioId);
    return findResponsaveis(tx, estagioId);
  });
}

/**
 * RF031: binds the advisor or the supervisor from the start date. During formalization a
 * wrong designation is corrected by binding again: the previous one is annulled (empty period
 * [início, início), kept as history) because it never took effect. Once the internship is
 * active, a change is a replacement (RF034).
 */
export async function vincularResponsavel(identity: Identity, estagioId: string, papel: Papel, usuarioId: string): Promise<ResponsavelRow> {
  try {
    return await withUser(identity, async (tx) => {
      const estagio = await carregarEstagio(tx, estagioId);
      if (estagio.situacao !== "EM_FORMALIZACAO") {
        throw new DomainError({
          code: "USE_SUBSTITUICAO",
          kind: "CONFLICT",
          message: "Com o estágio ativo, a troca de responsável é uma substituição (com motivo; supervisor exige aditivo).",
          requisito: "RF034",
        });
      }
      const atual = await findResponsavelAtual(tx, estagioId, papel);
      if (atual) {
        if (atual.usuarioId === usuarioId) return atual;
        if (!(await encerrarResponsavel(tx, atual.id, atual.vigenciaInicio))) throw acessoNegado("alterar responsáveis");
      }
      return insertResponsavel(tx, {
        estagioId,
        papel,
        usuarioId,
        vigenciaInicio: estagio.dataInicio,
        decididoPorUsuarioId: identity.userId,
      });
    });
  } catch (error) {
    throw traduzirErroEstagio(error, "vincular responsáveis");
  }
}

/**
 * RF034, RN-12: replaces the advisor of an active internship, with reason and author; the
 * previous period is closed, never erased. Replacing the supervisor requires an amendment
 * (RN-06), so it goes through POST /estagios/{id}/aditivos (SUBSTITUICAO_SUPERVISOR).
 * Notification to student, concedente and new advisor (RF035) arrives with notificacao (Fase 5).
 */
export async function substituirOrientador(identity: Identity, estagioId: string, usuarioId: string, motivo: string): Promise<ResponsavelRow> {
  try {
    return await withUser(identity, async (tx) => {
      const estagio = await carregarEstagio(tx, estagioId);
      if (estagio.situacao !== "ATIVO") {
        throw new DomainError({
          code: "ESTAGIO_NAO_ATIVO",
          kind: "CONFLICT",
          message: "A substituição vale para estágio ativo; na formalização, vincule de novo.",
          requisito: "RF034",
        });
      }
      const atual = await findResponsavelAtual(tx, estagioId, "ORIENTADOR");
      const inicio = atual ? [dataLocal(), proximoDia(atual.vigenciaInicio)].sort().at(-1)! : dataLocal();
      if (atual && !(await encerrarResponsavel(tx, atual.id, inicio))) throw acessoNegado("substituir responsáveis");
      return insertResponsavel(tx, {
        estagioId,
        papel: "ORIENTADOR",
        usuarioId,
        vigenciaInicio: inicio,
        substituiResponsavelId: atual?.id ?? null,
        motivoSubstituicao: motivo,
        decididoPorUsuarioId: identity.userId,
      });
    });
  } catch (error) {
    throw traduzirErroEstagio(error, "substituir responsáveis");
  }
}

// ---------------------------------------------------------------- apólice

export async function listApolices(identity: Identity, estagioId: string) {
  return withUser(identity, async (tx) => {
    await carregarEstagio(tx, estagioId);
    return findApolices(tx, estagioId);
  });
}

/** RF018, RN-33: records a policy; a renewal or correction is a new row pointing to the previous one. */
export async function registrarApolice(
  identity: Identity,
  estagioId: string,
  input: {
    seguradora: string;
    numeroApolice: string;
    contratante: "CONCEDENTE" | "INSTITUICAO";
    vigenciaInicio: string;
    vigenciaFim: string;
    substituiApoliceId: string | null;
    documentoId: string | null;
  },
) {
  if (input.vigenciaFim < input.vigenciaInicio) {
    throw new DomainError({ code: "PERIODO_INVALIDO", kind: "UNPROCESSABLE", message: "O fim da vigência é anterior ao início.", requisito: "RF018" });
  }
  if (input.documentoId) await exigirDocumento(identity, input.documentoId, { tipo: "APOLICE", estagioId });
  try {
    return await withUser(identity, async (tx) => {
      encerrado(await carregarEstagio(tx, estagioId));
      if (input.substituiApoliceId && !(await findApolices(tx, estagioId)).some((apolice) => apolice.id === input.substituiApoliceId)) {
        throw new DomainError({ code: "APOLICE_NAO_ENCONTRADA", kind: "UNPROCESSABLE", message: "A apólice substituída não é deste estágio.", requisito: "RF018" });
      }
      return insertApolice(tx, { ...input, estagioId, registradoPorUsuarioId: identity.userId });
    });
  } catch (error) {
    throw traduzirErroEstagio(error, "registrar apólice");
  }
}

// ---------------------------------------------------------------- assinaturas do TCE

export async function listAssinaturas(identity: Identity, estagioId: string) {
  return withUser(identity, async (tx) => {
    await carregarEstagio(tx, estagioId);
    return findAssinaturas(tx, estagioId);
  });
}

const PERFIL_DA_PARTE: Record<Parte, "ESTUDANTE" | "COORDENACAO" | "CONCEDENTE"> = {
  ESTUDANTE: "ESTUDANTE",
  INSTITUICAO: "COORDENACAO",
  CONCEDENTE: "CONCEDENTE",
};

/**
 * RF019, RN-28: the party signs the closed TCE in person. The signature records who, when,
 * from which address and over which hash; it is never edited or removed.
 */
export async function assinarTce(identity: Identity, estagioId: string, parte: Parte, enderecoIp: string | null) {
  try {
    return await withUser(identity, async (tx) => {
      const estagio = await carregarEstagio(tx, estagioId);
      if (estagio.situacao !== "EM_FORMALIZACAO" || !estagio.hashTce) {
        throw new DomainError({ code: "TCE_NAO_FECHADO", kind: "CONFLICT", message: "O TCE só é assinado depois de fechado e antes da ativação.", requisito: "RF019" });
      }
      if (!(await podeAssinar(tx, estagioId, parte))) throw acessoNegado(`assinar pela parte ${parte}`);
      return insertAssinatura(tx, {
        estagioId,
        aditivoId: null,
        parte,
        signatarioUsuarioId: identity.userId,
        signatarioNome: (await nomeDoUsuario(tx, identity.userId)) ?? "",
        signatarioPerfil: PERFIL_DA_PARTE[parte],
        hashDocumento: estagio.hashTce,
        documentoId: null,
        enderecoIp,
      });
    });
  } catch (error) {
    throw traduzirErroEstagio(error, "assinar o TCE");
  }
}

export { PERFIL_DA_PARTE };

function acessoNegado(acao: string) {
  return new DomainError({ code: "ACESSO_NEGADO", kind: "FORBIDDEN", message: `O perfil atual não permite ${acao}.`, requisito: "RF003" });
}
