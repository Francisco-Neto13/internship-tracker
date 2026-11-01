import { and, asc, eq, sql } from "drizzle-orm";
import { categoriaAtividade, exigenciaCategoria } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// No authorization filter: RLS decides who reads and writes (RF003, RF004, RF048)

export type CategoriaRow = typeof categoriaAtividade.$inferSelect;

export type ExigenciaRow = {
  id: string;
  cursoId: string;
  categoriaId: string;
  categoriaNome: string | null;
  limiteMinutos: number;
  admiteEstagioNaoObrigatorio: boolean;
};

export async function findCategorias(tx: Transaction, filtro: { incluirInativas: boolean }): Promise<CategoriaRow[]> {
  return tx
    .select()
    .from(categoriaAtividade)
    .where(filtro.incluirInativas ? undefined : eq(categoriaAtividade.ativa, true))
    .orderBy(asc(categoriaAtividade.nome));
}

export async function findCategoriaById(tx: Transaction, id: string): Promise<CategoriaRow | undefined> {
  const [row] = await tx.select().from(categoriaAtividade).where(eq(categoriaAtividade.id, id));
  return row;
}

export async function insertCategoria(tx: Transaction, values: { nome: string; descricao: string | null }): Promise<CategoriaRow> {
  const [row] = await tx.insert(categoriaAtividade).values(values).returning();
  return row;
}

export async function updateCategoria(
  tx: Transaction,
  id: string,
  values: Partial<Pick<CategoriaRow, "nome" | "descricao" | "ativa">>,
): Promise<CategoriaRow | undefined> {
  const [row] = await tx.update(categoriaAtividade).set(values).where(eq(categoriaAtividade.id, id)).returning();
  return row;
}

export async function findExigencias(tx: Transaction, cursoId: string): Promise<ExigenciaRow[]> {
  return tx
    .select({
      id: exigenciaCategoria.id,
      cursoId: exigenciaCategoria.cursoId,
      categoriaId: exigenciaCategoria.categoriaId,
      categoriaNome: categoriaAtividade.nome,
      limiteMinutos: exigenciaCategoria.limiteMinutos,
      admiteEstagioNaoObrigatorio: exigenciaCategoria.admiteEstagioNaoObrigatorio,
    })
    .from(exigenciaCategoria)
    .leftJoin(categoriaAtividade, eq(categoriaAtividade.id, exigenciaCategoria.categoriaId))
    .where(eq(exigenciaCategoria.cursoId, cursoId))
    .orderBy(asc(categoriaAtividade.nome));
}

/** Insert or update the limit of one category in one course (rows are never deleted). */
export async function upsertExigencia(
  tx: Transaction,
  values: { cursoId: string; categoriaId: string; limiteMinutos: number; admiteEstagioNaoObrigatorio: boolean },
): Promise<void> {
  await tx
    .insert(exigenciaCategoria)
    .values(values)
    .onConflictDoUpdate({
      target: [exigenciaCategoria.cursoId, exigenciaCategoria.categoriaId],
      set: {
        limiteMinutos: sql`excluded.limite_minutos`,
        admiteEstagioNaoObrigatorio: sql`excluded.admite_estagio_nao_obrigatorio`,
      },
    });
}

export async function clearDestinoEstagio(tx: Transaction, cursoId: string, exceto: string[]): Promise<void> {
  // The partial unique index allows one destination category per course: switching it
  // turns the previous one off first, inside the same transaction
  const atuais = await tx
    .select({ categoriaId: exigenciaCategoria.categoriaId })
    .from(exigenciaCategoria)
    .where(and(eq(exigenciaCategoria.cursoId, cursoId), eq(exigenciaCategoria.admiteEstagioNaoObrigatorio, true)));
  for (const { categoriaId } of atuais) {
    if (exceto.includes(categoriaId)) continue;
    await tx
      .update(exigenciaCategoria)
      .set({ admiteEstagioNaoObrigatorio: false })
      .where(and(eq(exigenciaCategoria.cursoId, cursoId), eq(exigenciaCategoria.categoriaId, categoriaId)));
  }
}
