import { isForeignKeyViolation, isRlsViolation, isUniqueViolation } from "@/db/errors";
import { withUser } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import {
  findEstudanteById,
  findEstudantes,
  insertEstudante,
  updateEstudante,
  type EstudanteRow,
} from "../repositories/estudante-repository";

type SituacaoAcademica = EstudanteRow["situacaoAcademica"];

const naoEncontrado = () =>
  new DomainError({
    code: "ESTUDANTE_NAO_ENCONTRADO",
    kind: "NOT_FOUND",
    message: "Estudante não encontrado.",
    requisito: "RF005",
  });

export async function listEstudantes(
  identity: Identity,
  query: { page: number; limit: number; cursoId?: string; situacao?: SituacaoAcademica; busca?: string },
) {
  return withUser(identity, (tx) =>
    findEstudantes(tx, {
      cursoId: query.cursoId,
      situacao: query.situacao,
      busca: query.busca,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    }),
  );
}

/** RF005: a student hidden by RLS answers 404, the same as one that does not exist. */
export async function getEstudante(identity: Identity, id: string): Promise<EstudanteRow> {
  const row = await withUser(identity, (tx) => findEstudanteById(tx, id));
  if (!row) throw naoEncontrado();
  return row;
}

export async function createEstudante(
  identity: Identity,
  input: { usuarioId: string; cursoId: string; matricula: string; periodo: number },
) {
  try {
    return await withUser(identity, (tx) => insertEstudante(tx, input));
  } catch (error) {
    throw translateWriteError(error, "cadastrar estudante neste curso");
  }
}

/**
 * RF005: the administrator, or the coordination of the student's course, edits course,
 * enrolment number, period and academic situation. RLS checks the row before and after
 * the change, so coordination cannot move a student into a course it does not coordinate.
 * A visible student that the caller cannot edit (the student itself) is 403, not 404.
 */
export async function updateEstudanteDados(
  identity: Identity,
  id: string,
  input: { cursoId?: string; matricula?: string; periodo?: number; situacaoAcademica?: SituacaoAcademica },
): Promise<EstudanteRow> {
  try {
    return await withUser(identity, async (tx) => {
      const atualizado = await updateEstudante(tx, id, input);
      const row = await findEstudanteById(tx, id);
      if (!row) throw naoEncontrado();
      if (!atualizado) throw acessoNegado("editar este estudante");
      return row;
    });
  } catch (error) {
    throw translateWriteError(error, "mover o estudante para este curso");
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
  if (isUniqueViolation(error, "estudante_matricula_unique")) {
    return new DomainError({
      code: "MATRICULA_DUPLICADA",
      kind: "CONFLICT",
      message: "Já existe estudante com esta matrícula.",
      requisito: "RF005",
    });
  }
  if (isUniqueViolation(error, "estudante_usuario_id_unique")) {
    return new DomainError({
      code: "USUARIO_JA_ESTUDANTE",
      kind: "CONFLICT",
      message: "Este usuário já possui cadastro de estudante.",
      requisito: "RF005",
    });
  }
  if (isForeignKeyViolation(error, "estudante_usuario_id_usuario_id_fk")) {
    return new DomainError({
      code: "USUARIO_INEXISTENTE",
      kind: "UNPROCESSABLE",
      message: "O usuário informado não existe.",
      requisito: "RF005",
    });
  }
  if (isForeignKeyViolation(error, "estudante_curso_id_curso_id_fk")) {
    return new DomainError({
      code: "CURSO_INEXISTENTE",
      kind: "UNPROCESSABLE",
      message: "O curso informado não existe.",
      requisito: "RF005",
    });
  }
  return error;
}
