import { asc, count, eq, ilike, or, sql } from "drizzle-orm";
import { padraoContendo } from "@/db/like";
import { curso } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// No authorization filter here on purpose: RLS decides which rows exist for the
// transaction's identity (RF003). Adding a WHERE on the user would hide policy bugs.

export type CursoRow = {
  id: string;
  codigo: string;
  nome: string;
  cargaMinimaEstagioMinutos: number;
  cargaAtividadesComplementaresMinutos: number;
};

type CursoValues = Omit<CursoRow, "id">;

const colunas = {
  id: curso.id,
  codigo: curso.codigo,
  nome: curso.nome,
  cargaMinimaEstagioMinutos: curso.cargaMinimaEstagioMinutos,
  cargaAtividadesComplementaresMinutos: curso.cargaAtividadesComplementaresMinutos,
};

export type CursoResumo = CursoRow & { estudantesMatriculados: number | null; estagiosAtivos: number | null };

export async function findCursos(
  tx: Transaction,
  filter: { busca?: string; comContagens?: boolean; limit: number; offset: number },
): Promise<{ items: CursoResumo[]; total: number }> {
  const where = filter.busca ? or(ilike(curso.nome, padraoContendo(filter.busca)), ilike(curso.codigo, padraoContendo(filter.busca))) : undefined;
  // Counts run under the caller's RLS: a course outside the coordination's reach counts zero
  const items = await tx
    .select({
      ...colunas,
      estudantesMatriculados: filter.comContagens
        ? sql<number>`(select count(*) from public.estudante e where e.curso_id = "curso"."id" and e.situacao_academica = 'MATRICULADO')::int`
        : sql<null>`null::int`,
      estagiosAtivos: filter.comContagens ? sql<number>`(select count(*) from public.estagio g where g.curso_id = "curso"."id" and g.situacao = 'ATIVO')::int` : sql<null>`null::int`,
    })
    .from(curso)
    .where(where)
    .orderBy(asc(curso.nome))
    .limit(filter.limit)
    .offset(filter.offset);
  const [{ total }] = await tx.select({ total: count() }).from(curso).where(where);

  return { items, total };
}

export async function findCursoById(tx: Transaction, id: string): Promise<CursoRow | undefined> {
  const [row] = await tx.select(colunas).from(curso).where(eq(curso.id, id));
  return row;
}

export async function insertCurso(tx: Transaction, values: CursoValues): Promise<CursoRow> {
  const [row] = await tx.insert(curso).values(values).returning(colunas);
  return row;
}

/** Returns the updated row, or undefined when RLS hid it or the id does not exist. */
export async function updateCurso(tx: Transaction, id: string, values: Partial<CursoValues>): Promise<CursoRow | undefined> {
  const [row] = await tx.update(curso).set(values).where(eq(curso.id, id)).returning(colunas);
  return row;
}
