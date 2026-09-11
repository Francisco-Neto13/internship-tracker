import { isForeignKeyViolation, isRlsViolation, isUniqueViolation } from "@/db/errors";
import { withUser } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { findEstudantes, insertEstudante } from "../repositories/estudante-repository";

export async function listEstudantes(identity: Identity, query: { page: number; limit: number; cursoId?: string }) {
  return withUser(identity, (tx) =>
    findEstudantes(tx, { cursoId: query.cursoId, limit: query.limit, offset: (query.page - 1) * query.limit }),
  );
}

export async function createEstudante(
  identity: Identity,
  input: { usuarioId: string; cursoId: string; matricula: string; periodo: number },
) {
  try {
    return await withUser(identity, (tx) => insertEstudante(tx, input));
  } catch (error) {
    throw translateWriteError(error);
  }
}

function translateWriteError(error: unknown): unknown {
  if (isRlsViolation(error)) {
    return new DomainError({
      code: "ACESSO_NEGADO",
      kind: "FORBIDDEN",
      message: "O perfil atual nao permite cadastrar estudante neste curso.",
      requisito: "RF003",
    });
  }
  if (isUniqueViolation(error, "estudante_matricula_unique")) {
    return new DomainError({
      code: "MATRICULA_DUPLICADA",
      kind: "CONFLICT",
      message: "Ja existe estudante com esta matricula.",
      requisito: "RF005",
    });
  }
  if (isUniqueViolation(error, "estudante_usuario_id_unique")) {
    return new DomainError({
      code: "USUARIO_JA_ESTUDANTE",
      kind: "CONFLICT",
      message: "Este usuario ja possui cadastro de estudante.",
      requisito: "RF005",
    });
  }
  if (isForeignKeyViolation(error, "estudante_usuario_id_usuario_id_fk")) {
    return new DomainError({
      code: "USUARIO_INEXISTENTE",
      kind: "UNPROCESSABLE",
      message: "O usuario informado nao existe.",
      requisito: "RF005",
    });
  }
  if (isForeignKeyViolation(error, "estudante_curso_id_curso_id_fk")) {
    return new DomainError({
      code: "CURSO_INEXISTENTE",
      kind: "UNPROCESSABLE",
      message: "O curso informado nao existe.",
      requisito: "RF005",
    });
  }
  return error;
}
