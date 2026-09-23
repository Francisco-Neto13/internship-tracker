import { asc, count } from "drizzle-orm";
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

export async function findCursos(
  tx: Transaction,
  filter: { limit: number; offset: number },
): Promise<{ items: CursoRow[]; total: number }> {
  const columns = {
    id: curso.id,
    codigo: curso.codigo,
    nome: curso.nome,
    cargaMinimaEstagioMinutos: curso.cargaMinimaEstagioMinutos,
    cargaAtividadesComplementaresMinutos: curso.cargaAtividadesComplementaresMinutos,
  };

  const items = await tx.select(columns).from(curso).orderBy(asc(curso.nome)).limit(filter.limit).offset(filter.offset);
  const [{ total }] = await tx.select({ total: count() }).from(curso);

  return { items, total };
}

export async function insertCurso(
  tx: Transaction,
  values: { codigo: string; nome: string; cargaMinimaEstagioMinutos: number; cargaAtividadesComplementaresMinutos: number },
): Promise<CursoRow> {
  const [row] = await tx.insert(curso).values(values).returning({
    id: curso.id,
    codigo: curso.codigo,
    nome: curso.nome,
    cargaMinimaEstagioMinutos: curso.cargaMinimaEstagioMinutos,
    cargaAtividadesComplementaresMinutos: curso.cargaAtividadesComplementaresMinutos,
  });
  return row;
}
