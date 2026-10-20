import { and, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { auditoria, usuario } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// No authorization filter here on purpose: the auditoria_leitura policy already
// restricts rows to ADMINISTRADOR (RF065, RF066, RN-28); other profiles get zero rows.

// Calendar days in the filters are days at the institution. A parameter of its own when
// RF006 (parametros institucionais) lands.
const FUSO_INSTITUCIONAL = "America/Sao_Paulo";

export type AuditoriaRow = {
  id: number;
  ocorridoEm: Date;
  usuarioId: string | null;
  tabela: string;
  registroId: string;
  operacao: string;
  camposAlterados: string[] | null;
};

export type AuditoriaDetalhadaRow = AuditoriaRow & {
  autorNome: string | null;
  autorEmail: string | null;
  dadosAnteriores: unknown;
  dadosNovos: unknown;
};

export type FiltroAuditoria = {
  tabela?: string;
  registroId?: string;
  usuarioId?: string;
  operacao?: "INSERT" | "UPDATE" | "DELETE";
  /** YYYY-MM-DD, inclusive */
  de?: string;
  /** YYYY-MM-DD, inclusive */
  ate?: string;
};

const colunas = {
  id: auditoria.id,
  ocorridoEm: auditoria.ocorridoEm,
  usuarioId: auditoria.usuarioId,
  tabela: auditoria.tabela,
  registroId: auditoria.registroId,
  operacao: auditoria.operacao,
  camposAlterados: auditoria.camposAlterados,
};

function condicoes(filtro: FiltroAuditoria): SQL | undefined {
  const lista: SQL[] = [];
  if (filtro.tabela) lista.push(eq(auditoria.tabela, filtro.tabela));
  if (filtro.registroId) lista.push(eq(auditoria.registroId, filtro.registroId));
  if (filtro.usuarioId) lista.push(eq(auditoria.usuarioId, filtro.usuarioId));
  if (filtro.operacao) lista.push(eq(auditoria.operacao, filtro.operacao));
  // Day boundaries computed by Postgres in the institution's zone, daylight saving included;
  // the upper bound is the start of the next day, so the whole last day is in
  if (filtro.de) {
    lista.push(sql`${auditoria.ocorridoEm} >= (${filtro.de}::date)::timestamp at time zone ${FUSO_INSTITUCIONAL}`);
  }
  if (filtro.ate) {
    lista.push(sql`${auditoria.ocorridoEm} < (${filtro.ate}::date + 1)::timestamp at time zone ${FUSO_INSTITUCIONAL}`);
  }
  return lista.length > 0 ? and(...lista) : undefined;
}

export async function findUltimosRegistros(tx: Transaction, limit: number): Promise<AuditoriaRow[]> {
  return tx.select(colunas).from(auditoria).orderBy(desc(auditoria.id)).limit(limit);
}

/** Newest first, with the author's name and the row data before and after (RF066). */
export async function findRegistros(
  tx: Transaction,
  filtro: FiltroAuditoria,
  pagina: { limit: number; offset: number },
): Promise<AuditoriaDetalhadaRow[]> {
  return tx
    .select({
      ...colunas,
      autorNome: usuario.nome,
      autorEmail: usuario.email,
      dadosAnteriores: auditoria.dadosAnteriores,
      dadosNovos: auditoria.dadosNovos,
    })
    .from(auditoria)
    .leftJoin(usuario, eq(usuario.id, auditoria.usuarioId))
    .where(condicoes(filtro))
    .orderBy(desc(auditoria.id))
    .limit(pagina.limit)
    .offset(pagina.offset);
}

export async function countRegistros(tx: Transaction, filtro: FiltroAuditoria): Promise<number> {
  const [{ total }] = await tx.select({ total: count() }).from(auditoria).where(condicoes(filtro));
  return total;
}
