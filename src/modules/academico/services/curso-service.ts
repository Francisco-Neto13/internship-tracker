import { isRlsViolation, isUniqueViolation } from "@/db/errors";
import { withUser } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { findCursoById, findCursos, insertCurso, updateCurso, type CursoRow } from "../repositories/curso-repository";

type CursoInput = Omit<CursoRow, "id">;

const naoEncontrado = () =>
  new DomainError({ code: "CURSO_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Curso não encontrado.", requisito: "RF004" });

export async function listCursos(identity: Identity, query: { page: number; limit: number }) {
  return withUser(identity, (tx) => findCursos(tx, { limit: query.limit, offset: (query.page - 1) * query.limit }));
}

export async function getCurso(identity: Identity, id: string): Promise<CursoRow> {
  const row = await withUser(identity, (tx) => findCursoById(tx, id));
  if (!row) throw naoEncontrado();
  return row;
}

export async function createCurso(identity: Identity, input: CursoInput) {
  try {
    return await withUser(identity, (tx) => insertCurso(tx, input));
  } catch (error) {
    throw translateWriteError(error, "cadastrar curso");
  }
}

/**
 * RF004: the administrator edits a course. The catalog is readable by every authenticated
 * user, so a write that matched no row on an existing course means the caller lacks the
 * profile (403), and a missing course is 404.
 */
export async function updateCursoDados(identity: Identity, id: string, input: Partial<CursoInput>): Promise<CursoRow> {
  try {
    return await withUser(identity, async (tx) => {
      const atualizado = await updateCurso(tx, id, input);
      if (atualizado) return atualizado;
      if (!(await findCursoById(tx, id))) throw naoEncontrado();
      throw acessoNegado("editar curso");
    });
  } catch (error) {
    throw translateWriteError(error, "editar curso");
  }
}

function acessoNegado(acao: string) {
  return new DomainError({
    code: "ACESSO_NEGADO",
    kind: "FORBIDDEN",
    message: `O perfil atual não permite ${acao}.`,
    requisito: "RF003",
  });
}

function translateWriteError(error: unknown, acao: string): unknown {
  if (isRlsViolation(error)) return acessoNegado(acao);
  if (isUniqueViolation(error, "curso_codigo_unique")) {
    return new DomainError({
      code: "CODIGO_DUPLICADO",
      kind: "CONFLICT",
      message: "Já existe curso com este código.",
      requisito: "RF004",
    });
  }
  return error;
}
