import { eq } from "drizzle-orm";
import { rescisao } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// RF063, RF064: the rescission of an internship (at most one). No authorization filter: RLS decides.

export type RescisaoRow = typeof rescisao.$inferSelect;

export async function findRescisao(tx: Transaction, estagioId: string): Promise<RescisaoRow | undefined> {
  const [row] = await tx.select().from(rescisao).where(eq(rescisao.estagioId, estagioId));
  return row;
}

export async function insertRescisao(
  tx: Transaction,
  values: Pick<RescisaoRow, "estagioId" | "dataRescisao" | "solicitante" | "motivo" | "documentoId" | "decididoPorUsuarioId">,
): Promise<RescisaoRow> {
  // The consolidated hours are decided by the trigger (app.validar_rescisao)
  const [row] = await tx
    .insert(rescisao)
    .values({ ...values, minutosCumpridosConsolidados: 0, minutosHomologadosConsolidados: 0 })
    .returning();
  return row;
}
