import { isForeignKeyViolation, isRlsViolation, isUniqueViolation } from "@/db/errors";
import { withUser } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { findCursoById } from "../repositories/curso-repository";
import {
  clearDestinoEstagio,
  findCategoriaById,
  findCategorias,
  findExigencias,
  insertCategoria,
  updateCategoria,
  upsertExigencia,
  type CategoriaRow,
} from "../repositories/categoria-repository";

function translateWriteError(error: unknown, acao: string): unknown {
  if (isRlsViolation(error)) {
    return new DomainError({ code: "ACESSO_NEGADO", kind: "FORBIDDEN", message: `O perfil atual não permite ${acao}.`, requisito: "RF003" });
  }
  if (isUniqueViolation(error, "categoria_atividade_nome_unique")) {
    return new DomainError({ code: "CATEGORIA_DUPLICADA", kind: "CONFLICT", message: "Já existe categoria com este nome.", requisito: "RF048" });
  }
  if (isUniqueViolation(error, "exigencia_categoria_um_destino_estagio")) {
    return new DomainError({
      code: "DESTINO_ESTAGIO_DUPLICADO",
      kind: "UNPROCESSABLE",
      message: "Só uma categoria do curso pode receber o aproveitamento de estágio não obrigatório.",
      requisito: "RN-18",
    });
  }
  if (isForeignKeyViolation(error, "exigencia_categoria_categoria_id_categoria_atividade_id_fk")) {
    return new DomainError({ code: "CATEGORIA_INEXISTENTE", kind: "UNPROCESSABLE", message: "Categoria inexistente.", requisito: "RF004" });
  }
  return error;
}

export async function listCategorias(identity: Identity, filtro: { incluirInativas: boolean }) {
  return withUser(identity, (tx) => findCategorias(tx, filtro));
}

export async function createCategoria(identity: Identity, input: { nome: string; descricao: string | null }) {
  try {
    return await withUser(identity, (tx) => insertCategoria(tx, input));
  } catch (error) {
    throw translateWriteError(error, "cadastrar categoria");
  }
}

export async function updateCategoriaDados(
  identity: Identity,
  id: string,
  input: Partial<Pick<CategoriaRow, "nome" | "descricao" | "ativa">>,
): Promise<CategoriaRow> {
  try {
    return await withUser(identity, async (tx) => {
      const atualizada = await updateCategoria(tx, id, input);
      if (atualizada) return atualizada;
      if (await findCategoriaById(tx, id)) {
        throw new DomainError({ code: "ACESSO_NEGADO", kind: "FORBIDDEN", message: "O perfil atual não permite editar categoria.", requisito: "RF003" });
      }
      throw new DomainError({ code: "CATEGORIA_NAO_ENCONTRADA", kind: "NOT_FOUND", message: "Categoria não encontrada.", requisito: "RF048" });
    });
  } catch (error) {
    throw translateWriteError(error, "editar categoria");
  }
}

/** RF004: course requirements in one view: minimum internship, total and limit per category. */
export async function getExigenciasCurso(identity: Identity, cursoId: string) {
  return withUser(identity, async (tx) => {
    const curso = await findCursoById(tx, cursoId);
    if (!curso) {
      throw new DomainError({ code: "CURSO_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Curso não encontrado.", requisito: "RF004" });
    }
    return { curso, categorias: await findExigencias(tx, cursoId) };
  });
}

/**
 * RF004: sets the limit of each listed category. Categories left out keep their limit;
 * rows are never deleted (AGENTS.md). At most one category accepts a non-mandatory
 * internship (RN-18); naming a new one turns the previous one off.
 */
export async function definirExigencias(
  identity: Identity,
  cursoId: string,
  exigencias: { categoriaId: string; limiteMinutos: number; admiteEstagioNaoObrigatorio: boolean }[],
) {
  const destinos = exigencias.filter((item) => item.admiteEstagioNaoObrigatorio);
  if (destinos.length > 1) {
    throw new DomainError({
      code: "DESTINO_ESTAGIO_DUPLICADO",
      kind: "UNPROCESSABLE",
      message: "Só uma categoria do curso pode receber o aproveitamento de estágio não obrigatório.",
      requisito: "RN-18",
    });
  }
  try {
    await withUser(identity, async (tx) => {
      if (!(await findCursoById(tx, cursoId))) {
        throw new DomainError({ code: "CURSO_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Curso não encontrado.", requisito: "RF004" });
      }
      if (destinos.length === 1) await clearDestinoEstagio(tx, cursoId, [destinos[0].categoriaId]);
      for (const item of exigencias) await upsertExigencia(tx, { cursoId, ...item });
    });
  } catch (error) {
    throw translateWriteError(error, "definir exigências do curso");
  }
  return getExigenciasCurso(identity, cursoId);
}
