import { sql } from "drizzle-orm";
import type { Transaction } from "@/db/with-user";

// RF069: the retention functions of functions/18_guarda.sql. They answer only to the
// administrator and expose metadata, never names nor content (RN-38).

export type DocumentoEmGuarda = {
  id: string;
  tipo: string;
  sensivel: boolean;
  escopo: "ESTAGIO" | "CONCEDENTE" | "ESTUDANTE";
  dataLiberacaoGuarda: string;
  criadoEm: Date;
};

export async function findDocumentosEmGuarda(tx: Transaction, ate: string | null): Promise<DocumentoEmGuarda[]> {
  const { rows } = await tx.execute<{ id: string; tipo: string; sensivel: boolean; escopo: DocumentoEmGuarda["escopo"]; data_liberacao_guarda: string; criado_em: string }>(
    sql`select id, tipo, sensivel, escopo, data_liberacao_guarda::text, criado_em from app.documentos_em_guarda(${ate}::date)`,
  );
  return rows.map((row) => ({
    id: row.id,
    tipo: row.tipo,
    sensivel: row.sensivel,
    escopo: row.escopo,
    dataLiberacaoGuarda: row.data_liberacao_guarda,
    criadoEm: new Date(row.criado_em),
  }));
}

export async function chaveParaEliminacao(tx: Transaction, documentoId: string): Promise<string> {
  const { rows } = await tx.execute<{ chave: string }>(sql`select app.chave_para_eliminacao(${documentoId}::uuid) as chave`);
  return rows[0].chave;
}

export async function eliminarDocumento(tx: Transaction, documentoId: string): Promise<Date> {
  const { rows } = await tx.execute<{ eliminado_em: string }>(sql`select app.eliminar_documento(${documentoId}::uuid) as eliminado_em`);
  return new Date(rows[0].eliminado_em);
}
