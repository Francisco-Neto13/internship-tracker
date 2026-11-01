import { isForeignKeyViolation, isRlsViolation, isTriggerRule, isUniqueViolation } from "@/db/errors";
import { withUser, type Transaction } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { cnpjValido, normalizarCnpj } from "../domain/cnpj";
import {
  classificacaoAtiva,
  findClassificacoes,
  findConcedenteById,
  findConcedentes,
  findHistoricoSituacao,
  insertClassificacao,
  insertConcedente,
  insertHistoricoSituacao,
  updateClassificacao,
  updateConcedente,
  type Catalogo,
  type ConcedenteRow,
  type ConcedenteValues,
} from "../repositories/concedente-repository";

// M03 (RF007, RF008, RF013, RN-01, RN-31). Writes go through withUser: RLS checks the
// profile and the audit trigger records the author (RN-28).

type Situacao = ConcedenteRow["situacao"];

const naoEncontrada = () =>
  new DomainError({ code: "CONCEDENTE_NAO_ENCONTRADA", kind: "NOT_FOUND", message: "Concedente não encontrada.", requisito: "RF007" });

const acessoNegado = (acao: string) =>
  new DomainError({ code: "ACESSO_NEGADO", kind: "FORBIDDEN", message: `O perfil atual não permite ${acao}.`, requisito: "RF003" });

function translateWriteError(error: unknown, acao: string): unknown {
  if (isRlsViolation(error)) return acessoNegado(acao);
  if (isUniqueViolation(error, "concedente_cnpj_unique")) {
    return new DomainError({ code: "CNPJ_DUPLICADO", kind: "CONFLICT", message: "Já existe concedente com este CNPJ.", requisito: "RF007" });
  }
  if (isUniqueViolation(error, "porte_concedente_nome_unique") || isUniqueViolation(error, "setor_atuacao_nome_unique")) {
    return new DomainError({ code: "CLASSIFICACAO_DUPLICADA", kind: "CONFLICT", message: "Já existe valor com este nome.", requisito: "RF013" });
  }
  if (isForeignKeyViolation(error, "concedente_porte_id_porte_concedente_id_fk") || isForeignKeyViolation(error, "concedente_setor_atuacao_id_setor_atuacao_id_fk")) {
    return new DomainError({ code: "CLASSIFICACAO_INEXISTENTE", kind: "UNPROCESSABLE", message: "Porte ou setor inexistente.", requisito: "RF013" });
  }
  if (isTriggerRule(error, "ALTERACAO_RESTRITA_A_CONTATOS")) {
    return new DomainError({
      code: "ALTERACAO_RESTRITA_A_CONTATOS",
      kind: "FORBIDDEN",
      message: "A concedente edita apenas os próprios contatos (e-mail e telefone).",
      requisito: "RF007",
    });
  }
  return error;
}

function validarCnpj(cnpj: string): string {
  const normalizado = normalizarCnpj(cnpj);
  if (!cnpjValido(normalizado)) {
    throw new DomainError({ code: "CNPJ_INVALIDO", kind: "UNPROCESSABLE", message: "CNPJ inválido.", requisito: "RF007" });
  }
  return normalizado;
}

/** A classification value offered to a new or edited concedente must be active (RF013). */
async function validarClassificacoes(tx: Transaction, values: Partial<ConcedenteValues>) {
  const inativos: string[] = [];
  if (values.porteId && !(await classificacaoAtiva(tx, "porte", values.porteId))) inativos.push("porte_id");
  if (values.setorAtuacaoId && !(await classificacaoAtiva(tx, "setor", values.setorAtuacaoId))) inativos.push("setor_atuacao_id");
  if (inativos.length > 0) {
    throw new DomainError({
      code: "CLASSIFICACAO_INATIVA",
      kind: "UNPROCESSABLE",
      message: "Porte ou setor inexistente ou desativado.",
      requisito: "RF013",
      details: inativos.map((field) => ({ field, code: "CLASSIFICACAO_INATIVA" })),
    });
  }
}

export async function listConcedentes(
  identity: Identity,
  query: { page: number; limit: number; situacao?: Situacao; porteId?: string; setorAtuacaoId?: string; busca?: string },
) {
  return withUser(identity, (tx) =>
    findConcedentes(tx, { ...query, busca: query.busca && normalizarBusca(query.busca), offset: (query.page - 1) * query.limit }),
  );
}

// A search typed as a formatted CNPJ ("12.345.678/0001-90") matches the stored digits
function normalizarBusca(busca: string): string {
  return /^[\d.\-/\s]+$/.test(busca) ? busca.replace(/\D/g, "") : busca;
}

export async function getConcedente(identity: Identity, id: string) {
  return withUser(identity, async (tx) => {
    const row = await findConcedenteById(tx, id);
    if (!row) throw naoEncontrada();
    return row;
  });
}

export async function createConcedente(identity: Identity, input: ConcedenteValues): Promise<ConcedenteRow> {
  const cnpj = validarCnpj(input.cnpj);
  try {
    return await withUser(identity, async (tx) => {
      await validarClassificacoes(tx, input);
      return insertConcedente(tx, { ...input, cnpj });
    });
  } catch (error) {
    throw translateWriteError(error, "cadastrar concedente");
  }
}

/** RF007, RF013: data and classification; a representative only reaches the contacts. */
export async function updateConcedenteDados(identity: Identity, id: string, input: Partial<ConcedenteValues>): Promise<ConcedenteRow> {
  const values = input.cnpj ? { ...input, cnpj: validarCnpj(input.cnpj) } : input;
  try {
    return await withUser(identity, async (tx) => {
      await validarClassificacoes(tx, values);
      const atualizada = await updateConcedente(tx, id, values);
      if (atualizada) return atualizada;
      if (!(await findConcedenteById(tx, id))) throw naoEncontrada();
      throw acessoNegado("editar esta concedente");
    });
  } catch (error) {
    throw translateWriteError(error, "editar concedente");
  }
}

/**
 * RF008, RN-31: suspension and reactivation, always with a history row in the same
 * transaction (the trigger refuses the change otherwise). Suspension does not touch
 * internships in progress; `contarEstagiosEmAndamento` reports how many were preserved.
 */
export async function alterarSituacaoConcedente(
  identity: Identity,
  id: string,
  situacaoNova: Situacao,
  motivo: string | null,
  contarEstagiosEmAndamento: (tx: Transaction, concedenteId: string) => Promise<number> = async () => 0,
): Promise<{ concedente: ConcedenteRow; estagiosEmAndamentoPreservados: number }> {
  try {
    return await withUser(identity, async (tx) => {
      const atual = await findConcedenteById(tx, id);
      if (!atual) throw naoEncontrada();
      if (atual.situacao === situacaoNova) {
        throw new DomainError({
          code: situacaoNova === "SUSPENSA" ? "CONCEDENTE_JA_SUSPENSA" : "CONCEDENTE_JA_ATIVA",
          kind: "CONFLICT",
          message: situacaoNova === "SUSPENSA" ? "A concedente já está suspensa." : "A concedente já está ativa.",
          requisito: "RF008",
        });
      }
      await insertHistoricoSituacao(tx, { concedenteId: id, situacaoNova, motivo, decididoPorUsuarioId: identity.userId });
      const atualizada = await updateConcedente(tx, id, { situacao: situacaoNova });
      if (!atualizada) throw acessoNegado("alterar a situação da concedente");
      return { concedente: atualizada, estagiosEmAndamentoPreservados: await contarEstagiosEmAndamento(tx, id) };
    });
  } catch (error) {
    throw translateWriteError(error, "alterar a situação da concedente");
  }
}

export async function listHistoricoSituacao(identity: Identity, id: string) {
  return withUser(identity, async (tx) => {
    if (!(await findConcedenteById(tx, id))) throw naoEncontrada();
    return findHistoricoSituacao(tx, id);
  });
}

// RF013: porte and setor catalogs
export async function listClassificacoes(identity: Identity, catalogo: Catalogo, incluirInativos: boolean) {
  return withUser(identity, (tx) => findClassificacoes(tx, catalogo, incluirInativos));
}

export async function createClassificacao(identity: Identity, catalogo: Catalogo, nome: string) {
  try {
    return await withUser(identity, (tx) => insertClassificacao(tx, catalogo, nome));
  } catch (error) {
    throw translateWriteError(error, "cadastrar classificação");
  }
}

export async function updateClassificacaoDados(identity: Identity, catalogo: Catalogo, id: string, values: { nome?: string; ativo?: boolean }) {
  try {
    const row = await withUser(identity, (tx) => updateClassificacao(tx, catalogo, id, values));
    if (!row) {
      throw new DomainError({
        code: "CLASSIFICACAO_NAO_ENCONTRADA",
        kind: "NOT_FOUND",
        message: "Valor não encontrado ou sem permissão para editá-lo.",
        requisito: "RF013",
      });
    }
    return row;
  } catch (error) {
    throw translateWriteError(error, "editar classificação");
  }
}
