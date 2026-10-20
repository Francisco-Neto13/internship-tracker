import { and, eq } from "drizzle-orm";
import { periodicidadeRelatorio } from "@/db/schema";
import type { Transaction } from "@/db/with-user";
import type { Periodicidade, TipoEstagio } from "../domain/periodicidade";

// No authorization filter: RLS decides who sets the periodicity of a course (RF036)

export type PeriodicidadeRow = typeof periodicidadeRelatorio.$inferSelect;

export async function findPeriodicidades(tx: Transaction, cursoId: string): Promise<PeriodicidadeRow[]> {
  return tx.select().from(periodicidadeRelatorio).where(eq(periodicidadeRelatorio.cursoId, cursoId));
}

/** One row per course and type: updated in place (audited), since reports keep their own deadlines. */
export async function upsertPeriodicidade(tx: Transaction, cursoId: string, tipoEstagio: TipoEstagio, valores: Periodicidade): Promise<PeriodicidadeRow | undefined> {
  const [existente] = await tx
    .select({ id: periodicidadeRelatorio.id })
    .from(periodicidadeRelatorio)
    .where(and(eq(periodicidadeRelatorio.cursoId, cursoId), eq(periodicidadeRelatorio.tipoEstagio, tipoEstagio)));
  if (existente) {
    const [row] = await tx.update(periodicidadeRelatorio).set(valores).where(eq(periodicidadeRelatorio.id, existente.id)).returning();
    return row;
  }
  const [row] = await tx.insert(periodicidadeRelatorio).values({ cursoId, tipoEstagio, ...valores }).returning();
  return row;
}
