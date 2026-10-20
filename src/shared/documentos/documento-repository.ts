import { eq, sql } from "drizzle-orm";
import { documento } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// No authorization filter: RLS decides which metadata the caller sees and what it may insert

export type DocumentoRow = typeof documento.$inferSelect;
export type TipoDocumento = DocumentoRow["tipo"];

export async function findDocumentoById(tx: Transaction, id: string): Promise<DocumentoRow | undefined> {
  const [row] = await tx.select().from(documento).where(eq(documento.id, id));
  return row;
}

export async function insertDocumento(
  tx: Transaction,
  values: Omit<DocumentoRow, "id" | "criadoEm" | "atualizadoEm" | "dataLiberacaoGuarda" | "eliminadoEm" | "eliminadoPorUsuarioId">,
): Promise<DocumentoRow> {
  const [row] = await tx.insert(documento).values(values).returning();
  return row;
}

/** app.pode_enviar_documento: the same rule the insert policy applies. */
export async function podeEnviarDocumento(
  tx: Transaction,
  escopo: { tipo: TipoDocumento; concedenteId: string | null; estagioId: string | null; estudanteId: string | null },
): Promise<boolean> {
  const { rows } = await tx.execute<{ pode: boolean }>(
    sql`select app.pode_enviar_documento(${escopo.tipo}::public.tipo_documento, ${escopo.concedenteId}::uuid, ${escopo.estagioId}::uuid, ${escopo.estudanteId}::uuid) as pode`,
  );
  return rows[0]?.pode === true;
}

export async function podeBaixarDocumento(tx: Transaction, id: string): Promise<boolean> {
  const { rows } = await tx.execute<{ pode: boolean }>(sql`select app.pode_baixar_documento(${id}::uuid) as pode`);
  return rows[0]?.pode === true;
}
