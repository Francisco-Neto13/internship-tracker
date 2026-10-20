import { and, asc, eq, max, sql } from "drizzle-orm";
import { aditivo, assinatura } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// RF020, RF021: amendments. No authorization filter: RLS decides.

export type AditivoRow = typeof aditivo.$inferSelect;

export async function findAditivos(tx: Transaction, estagioId: string): Promise<AditivoRow[]> {
  return tx.select().from(aditivo).where(eq(aditivo.estagioId, estagioId)).orderBy(asc(aditivo.numero));
}

export async function findAditivoById(tx: Transaction, id: string): Promise<AditivoRow | undefined> {
  const [row] = await tx.select().from(aditivo).where(eq(aditivo.id, id));
  return row;
}

export async function insertAditivo(
  tx: Transaction,
  values: Omit<AditivoRow, "id" | "numero" | "situacao" | "efetivadoEm" | "motivoCancelamento" | "documentoId" | "criadoEm" | "atualizadoEm">,
): Promise<AditivoRow> {
  const [{ ultimo }] = await tx.select({ ultimo: max(aditivo.numero) }).from(aditivo).where(eq(aditivo.estagioId, values.estagioId));
  const [row] = await tx
    .insert(aditivo)
    .values({ ...values, numero: (ultimo ?? 0) + 1 })
    .returning();
  return row;
}

export async function cancelarAditivo(tx: Transaction, id: string, motivo: string): Promise<AditivoRow | undefined> {
  const [row] = await tx
    .update(aditivo)
    .set({ situacao: "CANCELADO", motivoCancelamento: motivo })
    .where(and(eq(aditivo.id, id), eq(aditivo.situacao, "AGUARDANDO_ASSINATURAS")))
    .returning();
  return row;
}

export async function findAssinaturasAditivo(tx: Transaction, aditivoId: string) {
  return tx.select().from(assinatura).where(eq(assinatura.aditivoId, aditivoId)).orderBy(asc(assinatura.criadoEm));
}

/** app.efetivar_aditivo: with the three signatures, makes it VIGENTE and applies its effect. */
export async function efetivarAditivo(tx: Transaction, aditivoId: string): Promise<boolean> {
  const { rows } = await tx.execute<{ efetivado: boolean }>(sql`select app.efetivar_aditivo(${aditivoId}::uuid) as efetivado`);
  return rows[0]?.efetivado === true;
}
