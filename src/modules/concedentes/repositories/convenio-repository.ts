import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { concedente, convenio, convenioVigencia } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// No authorization filter: RLS decides who reads and writes agreements (RF009, RN-37)

export type ConvenioRow = typeof convenio.$inferSelect;
export type VigenciaRow = typeof convenioVigencia.$inferSelect;

export async function findConvenioById(tx: Transaction, id: string): Promise<ConvenioRow | undefined> {
  const [row] = await tx.select().from(convenio).where(eq(convenio.id, id));
  return row;
}

export async function findConveniosDaConcedente(tx: Transaction, concedenteId: string): Promise<ConvenioRow[]> {
  return tx.select().from(convenio).where(eq(convenio.concedenteId, concedenteId)).orderBy(desc(convenio.criadoEm));
}

export async function findVigencias(tx: Transaction, convenioIds: string[]): Promise<VigenciaRow[]> {
  if (convenioIds.length === 0) return [];
  return tx
    .select()
    .from(convenioVigencia)
    .where(inArray(convenioVigencia.convenioId, convenioIds))
    .orderBy(asc(convenioVigencia.vigenciaInicio));
}

export async function insertConvenio(
  tx: Transaction,
  values: { concedenteId: string; numero: string; observacao: string | null },
): Promise<ConvenioRow> {
  const [row] = await tx.insert(convenio).values(values).returning();
  return row;
}

export async function insertVigencia(
  tx: Transaction,
  values: Omit<VigenciaRow, "id" | "criadoEm">,
): Promise<VigenciaRow> {
  const [row] = await tx.insert(convenioVigencia).values(values).returning();
  return row;
}

export async function updateConvenio(
  tx: Transaction,
  id: string,
  values: Partial<Pick<ConvenioRow, "observacao" | "situacao" | "motivoEncerramento">>,
): Promise<ConvenioRow | undefined> {
  const [row] = await tx.update(convenio).set(values).where(eq(convenio.id, id)).returning();
  return row;
}

/**
 * RF012: active agreements whose latest period ends between `de` and `ate` (inclusive) and
 * that have no later period recorded, i.e. that will lapse unless renewed.
 */
export async function findConveniosAVencer(tx: Transaction, de: string, ate: string) {
  const ultimaVigencia = tx
    .select({
      convenioId: convenioVigencia.convenioId,
      vigenciaFim: sql<string>`max(${convenioVigencia.vigenciaFim})`.as("vigencia_fim"),
    })
    .from(convenioVigencia)
    .groupBy(convenioVigencia.convenioId)
    .as("ultima");

  return tx
    .select({
      id: convenio.id,
      numero: convenio.numero,
      concedenteId: convenio.concedenteId,
      concedenteRazaoSocial: concedente.razaoSocial,
      vigenciaFim: ultimaVigencia.vigenciaFim,
    })
    .from(convenio)
    .innerJoin(ultimaVigencia, eq(ultimaVigencia.convenioId, convenio.id))
    .innerJoin(concedente, eq(concedente.id, convenio.concedenteId))
    .where(and(eq(convenio.situacao, "ATIVO"), gte(ultimaVigencia.vigenciaFim, de), lte(ultimaVigencia.vigenciaFim, ate)))
    .orderBy(asc(ultimaVigencia.vigenciaFim));
}
