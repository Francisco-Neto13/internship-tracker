import { isRlsViolation, isUniqueViolation } from "@/db/errors";
import { withUser } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { findCursos, insertCurso } from "../repositories/curso-repository";

export async function listCursos(identity: Identity, query: { page: number; limit: number }) {
  return withUser(identity, (tx) => findCursos(tx, { limit: query.limit, offset: (query.page - 1) * query.limit }));
}

export async function createCurso(
  identity: Identity,
  input: { codigo: string; nome: string; cargaMinimaEstagioMinutos: number; cargaAtividadesComplementaresMinutos: number },
) {
  try {
    return await withUser(identity, (tx) => insertCurso(tx, input));
  } catch (error) {
    throw translateWriteError(error);
  }
}

function translateWriteError(error: unknown): unknown {
  if (isRlsViolation(error)) {
    return new DomainError({
      code: "ACESSO_NEGADO",
      kind: "FORBIDDEN",
      message: "O perfil atual não permite cadastrar curso.",
      requisito: "RF003",
    });
  }
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
