import { withUser } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { conferirRespostas } from "../domain/avaliacao";
import {
  findAcompanhamentoById,
  findAcompanhamentos,
  findAvaliacoes,
  findCriterios,
  findRespostas,
  insertAcompanhamento,
  insertAvaliacao,
  insertCriterio,
  insertRespostas,
  mediaAvaliacoesConcedente,
  podeLerAcompanhamentos,
  updateAcompanhamento,
  updateCriterio,
  type AcompanhamentoRow,
  type CriterioRow,
} from "../repositories/avaliacao-repository";
import { acessoNegado, tradutorDeErros } from "./erros";
import { carregarEstagioAcompanhado } from "./frequencia-service";

// Performance evaluation by the concedente (RF042, RF043, RN-15) with institutional criteria,
// the concedente's average (RF014) and the advisor's follow-up records (RF033, RN-11).

const traduzir = tradutorDeErros(
  [
    { codigo: "AVALIACAO_RESTRITA_A_CONCEDENTE", kind: "FORBIDDEN", mensagem: "Só o supervisor ou a concedente do estágio avaliam.", requisito: "RF042" },
    { codigo: "AVALIACAO_INCOMPLETA", kind: "UNPROCESSABLE", mensagem: "Todos os critérios ativos precisam de nota.", requisito: "RF042" },
    { codigo: "AVALIACAO_FECHADA", kind: "CONFLICT", mensagem: "As notas entram junto com a avaliação.", requisito: "RF042" },
    { codigo: "NOTA_FORA_DA_ESCALA", kind: "UNPROCESSABLE", mensagem: "Nota fora da escala do critério.", requisito: "RF042" },
    { codigo: "CRITERIO_INATIVO", kind: "UNPROCESSABLE", mensagem: "O critério não está ativo.", requisito: "RF042" },
    { codigo: "CRITERIO_EM_USO", kind: "CONFLICT", mensagem: "Critério já respondido não muda; desative-o e crie outro.", requisito: "RF042" },
    { codigo: "PERIODO_INVALIDO", kind: "UNPROCESSABLE", mensagem: "O período avaliado fica dentro do estágio.", requisito: "RF042" },
    { codigo: "ACOMPANHAMENTO_RESTRITO_AO_ORIENTADOR", kind: "FORBIDDEN", mensagem: "Só o professor orientador registra e edita o próprio acompanhamento.", requisito: "RF033" },
  ],
  {
    avaliacao_uma_final: { codigo: "AVALIACAO_FINAL_EXISTENTE", mensagem: "O estágio já tem avaliação final.", requisito: "RF043" },
    resposta_avaliacao_criterio_unique: { codigo: "CRITERIO_REPETIDO", mensagem: "Cada critério recebe uma nota.", requisito: "RF042" },
    criterio_avaliacao_codigo_unique: { codigo: "CODIGO_DUPLICADO", mensagem: "Já existe critério com este código.", requisito: "RF042" },
  },
);

// ---------------------------------------------------------------- critérios (RF042)

export async function listCriterios(identity: Identity, apenasAtivos = true) {
  return withUser(identity, (tx) => findCriterios(tx, apenasAtivos));
}

export async function criarCriterio(identity: Identity, input: { codigo: string; descricao: string; escalaMinima: number; escalaMaxima: number; ordem: number }) {
  if (input.escalaMaxima <= input.escalaMinima) {
    throw new DomainError({ code: "ESCALA_INVALIDA", kind: "UNPROCESSABLE", message: "A escala máxima precisa ser maior que a mínima.", requisito: "RF042" });
  }
  try {
    return await withUser(identity, (tx) => insertCriterio(tx, input));
  } catch (error) {
    throw traduzir(error, "definir critérios de avaliação");
  }
}

export async function alterarCriterio(
  identity: Identity,
  id: string,
  input: Partial<Pick<CriterioRow, "descricao" | "escalaMinima" | "escalaMaxima" | "ordem" | "ativo">>,
) {
  try {
    return await withUser(identity, async (tx) => {
      const criterio = (await findCriterios(tx, false)).find((item) => item.id === id);
      if (!criterio) {
        throw new DomainError({ code: "CRITERIO_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Critério não encontrado.", requisito: "RF042" });
      }
      if ((input.escalaMaxima ?? criterio.escalaMaxima) <= (input.escalaMinima ?? criterio.escalaMinima)) {
        throw new DomainError({ code: "ESCALA_INVALIDA", kind: "UNPROCESSABLE", message: "A escala máxima precisa ser maior que a mínima.", requisito: "RF042" });
      }
      const atualizado = await updateCriterio(tx, id, input);
      if (!atualizado) throw acessoNegado("definir critérios de avaliação");
      return atualizado;
    });
  } catch (error) {
    throw traduzir(error, "definir critérios de avaliação");
  }
}

// ---------------------------------------------------------------- avaliação (RF042, RF043)

export async function listAvaliacoes(identity: Identity, estagioId: string) {
  return withUser(identity, async (tx) => {
    await carregarEstagioAcompanhado(tx, estagioId);
    const avaliacoes = await findAvaliacoes(tx, estagioId);
    const respostas = await findRespostas(tx, avaliacoes.map((avaliacao) => avaliacao.id));
    return avaliacoes.map((avaliacao) => ({ ...avaliacao, respostas: respostas.filter((resposta) => resposta.avaliacaoId === avaliacao.id) }));
  });
}

/** RF042: the form of the evaluation, i.e. the active criteria, for the internship's evaluators. */
export async function getFormularioAvaliacao(identity: Identity, estagioId: string) {
  return withUser(identity, async (tx) => {
    await carregarEstagioAcompanhado(tx, estagioId);
    return findCriterios(tx, true);
  });
}

/**
 * RF042, RF043, RN-15: the supervisor or the concedente's representative evaluates an ATIVO
 * internship, periodically or at the end (one final evaluation, guard of the conclusion),
 * giving a grade to every active criterion.
 */
export async function registrarAvaliacao(
  identity: Identity,
  estagioId: string,
  input: {
    momento: "PERIODICA" | "FINAL";
    periodoInicio: string | null;
    periodoFim: string | null;
    observacoes: string | null;
    respostas: { criterioId: string; nota: number; comentario: string | null }[];
  },
) {
  if (input.momento === "PERIODICA" && (!input.periodoInicio || !input.periodoFim || input.periodoFim < input.periodoInicio)) {
    throw new DomainError({ code: "PERIODO_INVALIDO", kind: "UNPROCESSABLE", message: "A avaliação periódica informa o período avaliado.", requisito: "RF042" });
  }
  try {
    return await withUser(identity, async (tx) => {
      const estagio = await carregarEstagioAcompanhado(tx, estagioId);
      if (estagio.situacao !== "ATIVO") {
        throw new DomainError({ code: "ESTAGIO_NAO_ATIVO", kind: "CONFLICT", message: "A avaliação é registrada com o estágio ativo.", requisito: "RF042" });
      }
      const criterios = await findCriterios(tx, false);
      if (!criterios.some((criterio) => criterio.ativo)) {
        throw new DomainError({
          code: "SEM_CRITERIOS",
          kind: "CONFLICT",
          message: "A instituição ainda não definiu critérios de avaliação.",
          requisito: "RF042",
        });
      }
      const problemas = conferirRespostas(criterios, input.respostas);
      if (problemas.length > 0) {
        throw new DomainError({
          code: "AVALIACAO_INCOMPLETA",
          kind: "UNPROCESSABLE",
          message: "Dê uma nota, dentro da escala, a cada critério ativo.",
          requisito: "RF042",
          details: problemas.map((problema) => ({ code: problema.code, field: `respostas.${problema.criterioId}`, issue: problema.code })),
        });
      }
      const avaliacao = await insertAvaliacao(tx, {
        estagioId,
        momento: input.momento,
        periodoInicio: input.momento === "PERIODICA" ? input.periodoInicio : null,
        periodoFim: input.momento === "PERIODICA" ? input.periodoFim : null,
        observacoes: input.observacoes,
        avaliadorUsuarioId: identity.userId,
      });
      const respostas = await insertRespostas(tx, avaliacao.id, input.respostas);
      return { ...avaliacao, respostas };
    });
  } catch (error) {
    throw traduzir(error, "avaliar o estágio");
  }
}

/** RF014: average of the final evaluations of the concedente's internships, 0 to 10. */
export async function getMediaAvaliacoesConcedente(identity: Identity, concedenteId: string) {
  return withUser(identity, (tx) => mediaAvaliacoesConcedente(tx, concedenteId));
}

// ---------------------------------------------------------------- acompanhamento (RF033)

export async function listAcompanhamentos(identity: Identity, estagioId: string) {
  return withUser(identity, async (tx) => {
    await carregarEstagioAcompanhado(tx, estagioId);
    // DER §4.5: the advisor in force and the coordination follow the visits and contacts
    if (!(await podeLerAcompanhamentos(tx, estagioId))) throw acessoNegado("ler os acompanhamentos deste estágio");
    return findAcompanhamentos(tx, estagioId);
  });
}

type DadosAcompanhamento = Pick<AcompanhamentoRow, "tipo" | "dataOcorrencia" | "participantes" | "observacoes">;

/** RF033, RN-11: the advisor records a visit, contact or meeting that already happened. */
export async function registrarAcompanhamento(identity: Identity, estagioId: string, input: DadosAcompanhamento) {
  try {
    return await withUser(identity, async (tx) => {
      await carregarEstagioAcompanhado(tx, estagioId);
      return insertAcompanhamento(tx, { ...input, estagioId, registradoPorUsuarioId: identity.userId });
    });
  } catch (error) {
    throw traduzir(error, "registrar acompanhamento");
  }
}

/** RF033: its author corrects a record while the internship is ATIVO (the audit trail keeps the previous text). */
export async function alterarAcompanhamento(identity: Identity, id: string, input: Partial<DadosAcompanhamento>) {
  try {
    return await withUser(identity, async (tx) => {
      const atual = await findAcompanhamentoById(tx, id);
      if (!atual) {
        throw new DomainError({ code: "ACOMPANHAMENTO_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Acompanhamento não encontrado.", requisito: "RF033" });
      }
      const atualizado = await updateAcompanhamento(tx, id, input);
      if (!atualizado) throw acessoNegado("editar este acompanhamento");
      return atualizado;
    });
  } catch (error) {
    throw traduzir(error, "editar acompanhamento");
  }
}
