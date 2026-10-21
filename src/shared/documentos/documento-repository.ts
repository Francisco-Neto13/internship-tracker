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

/**
 * RF071, RF072: the permission to download and, for a sensitive document, the LEITURA row in
 * the audit trail, decided and written in one step by app.registrar_leitura_documento.
 */
export async function registrarLeituraDocumento(tx: Transaction, id: string): Promise<boolean> {
  const { rows } = await tx.execute<{ pode: boolean }>(sql`select app.registrar_leitura_documento(${id}::uuid) as pode`);
  return rows[0]?.pode === true;
}

export async function podeConsultarAcessosDocumento(tx: Transaction, id: string): Promise<boolean> {
  const { rows } = await tx.execute<{ pode: boolean }>(sql`select app.pode_consultar_acessos_documento(${id}::uuid) as pode`);
  return rows[0]?.pode === true;
}

export type AcessoDocumento = { ocorridoEm: Date; usuarioId: string | null; usuarioNome: string | null; perfil: string | null };

/** RF073: who read a sensitive document, when and under which profile. */
export async function findAcessosDocumento(tx: Transaction, id: string): Promise<AcessoDocumento[]> {
  const { rows } = await tx.execute<{ ocorrido_em: string | Date; usuario_id: string | null; usuario_nome: string | null; perfil: string | null }>(
    sql`select ocorrido_em, usuario_id, usuario_nome, perfil from app.acessos_documento(${id}::uuid)`,
  );
  return rows.map((row) => ({ ocorridoEm: new Date(row.ocorrido_em), usuarioId: row.usuario_id, usuarioNome: row.usuario_nome, perfil: row.perfil }));
}
