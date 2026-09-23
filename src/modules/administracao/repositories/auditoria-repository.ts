import { desc } from "drizzle-orm";
import { auditoria } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// No authorization filter here on purpose: the auditoria_leitura policy already
// restricts rows to ADMINISTRADOR (RF065, RF066, RN-28); other profiles get zero rows.

export type AuditoriaRow = {
  id: number;
  ocorridoEm: Date;
  usuarioId: string | null;
  tabela: string;
  registroId: string;
  operacao: string;
  camposAlterados: string[] | null;
};

export async function findUltimosRegistros(tx: Transaction, limit: number): Promise<AuditoriaRow[]> {
  return tx
    .select({
      id: auditoria.id,
      ocorridoEm: auditoria.ocorridoEm,
      usuarioId: auditoria.usuarioId,
      tabela: auditoria.tabela,
      registroId: auditoria.registroId,
      operacao: auditoria.operacao,
      camposAlterados: auditoria.camposAlterados,
    })
    .from(auditoria)
    .orderBy(desc(auditoria.id))
    .limit(limit);
}
