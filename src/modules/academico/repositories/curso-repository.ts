import { asc, count, eq } from "drizzle-orm";
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

export async function findCursos(
  tx: Transaction,
  filter: { limit: number; offset: number },
): Promise<{ items: CursoRow[]; total: number }> {
  const items = await tx.select(colunas).from(curso).orderBy(asc(curso.nome)).limit(filter.limit).offset(filter.offset);
  const [{ total }] = await tx.select({ total: count() }).from(curso);

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
