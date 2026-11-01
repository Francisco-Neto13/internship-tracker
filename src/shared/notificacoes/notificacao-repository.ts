import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { notificacao } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// RF070: notifications of the caller (RLS: only the recipient reads and marks as read)

export type NotificacaoRow = typeof notificacao.$inferSelect;

export async function findNotificacoes(tx: Transaction, apenasNaoLidas: boolean, limite: number): Promise<NotificacaoRow[]> {
  return tx
    .select()
    .from(notificacao)
    .where(apenasNaoLidas ? isNull(notificacao.lidaEm) : undefined)
    .orderBy(desc(notificacao.criadoEm))
    .limit(limite);
}

export async function contarNaoLidas(tx: Transaction): Promise<number> {
  const [row] = await tx.select({ total: sql<string>`count(*)` }).from(notificacao).where(isNull(notificacao.lidaEm));
  return Number(row.total);
}

export async function marcarLida(tx: Transaction, id: string): Promise<NotificacaoRow | undefined> {
  const [row] = await tx
    .update(notificacao)
    .set({ lidaEm: new Date() })
    .where(and(eq(notificacao.id, id), isNull(notificacao.lidaEm)))
    .returning();
  return row;
}

export async function marcarTodasLidas(tx: Transaction): Promise<number> {
  const rows = await tx.update(notificacao).set({ lidaEm: new Date() }).where(isNull(notificacao.lidaEm)).returning({ id: notificacao.id });
  return rows.length;
}
