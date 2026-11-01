import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { anexoRelatorio, documento, estagio, parecerRelatorio, relatorio, usuario, versaoRelatorio } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// Reports (RF036 to RF041). No authorization filter: RLS decides who reads, and the triggers of
// functions/09_relatorios.sql decide who sends and who analyzes.

export type RelatorioRow = typeof relatorio.$inferSelect;
export type VersaoRow = typeof versaoRelatorio.$inferSelect & { enviadoEmLocal: string };
export type AnexoRow = { id: string; versaoRelatorioId: string; documentoId: string; nomeOriginal: string | null };
export type ParecerRow = typeof parecerRelatorio.$inferSelect & { emitidoPorNome: string | null };

export async function findRelatorios(tx: Transaction, estagioId: string): Promise<RelatorioRow[]> {
  return tx
    .select()
    .from(relatorio)
    .where(eq(relatorio.estagioId, estagioId))
    .orderBy(asc(relatorio.tipo), asc(relatorio.sequencia));
}

export async function findRelatorioById(tx: Transaction, id: string): Promise<RelatorioRow | undefined> {
  const [row] = await tx.select().from(relatorio).where(eq(relatorio.id, id));
  return row;
}

// Calendar date of the sending in America/Sao_Paulo, compared with the deadline (RF037)
const dataLocal = sql<string>`(${versaoRelatorio.criadoEm} at time zone 'America/Sao_Paulo')::date::text`;

export async function findVersoes(tx: Transaction, relatorioId: string): Promise<VersaoRow[]> {
  const linhas = await tx
    .select({ versao: versaoRelatorio, enviadoEmLocal: dataLocal })
    .from(versaoRelatorio)
    .where(eq(versaoRelatorio.relatorioId, relatorioId))
    .orderBy(desc(versaoRelatorio.numero));
  return linhas.map((linha) => ({ ...linha.versao, enviadoEmLocal: linha.enviadoEmLocal }));
}

export async function findAnexos(tx: Transaction, versaoIds: string[]): Promise<AnexoRow[]> {
  if (versaoIds.length === 0) return [];
  return tx
    .select({
      id: anexoRelatorio.id,
      versaoRelatorioId: anexoRelatorio.versaoRelatorioId,
      documentoId: anexoRelatorio.documentoId,
      nomeOriginal: documento.nomeOriginal,
    })
    .from(anexoRelatorio)
    .leftJoin(documento, eq(documento.id, anexoRelatorio.documentoId))
    .where(inArray(anexoRelatorio.versaoRelatorioId, versaoIds));
}

export async function findPareceres(tx: Transaction, versaoIds: string[]): Promise<ParecerRow[]> {
  if (versaoIds.length === 0) return [];
  const linhas = await tx
    .select({ parecer: parecerRelatorio, emitidoPorNome: usuario.nome })
    .from(parecerRelatorio)
    .leftJoin(usuario, eq(usuario.id, parecerRelatorio.emitidoPorUsuarioId))
    .where(inArray(parecerRelatorio.versaoRelatorioId, versaoIds));
  return linhas.map((linha) => ({ ...linha.parecer, emitidoPorNome: linha.emitidoPorNome }));
}

/** The trigger assigns the number of the version and moves the report to EM_ANALISE. */
export async function insertVersao(tx: Transaction, values: { relatorioId: string; conteudo: string | null; enviadoPorUsuarioId: string }) {
  const [row] = await tx
    .insert(versaoRelatorio)
    .values({ ...values, numero: 1 })
    .returning();
  return row;
}

export async function insertAnexos(tx: Transaction, versaoRelatorioId: string, documentoIds: string[]) {
  if (documentoIds.length === 0) return;
  await tx.insert(anexoRelatorio).values(documentoIds.map((documentoId) => ({ versaoRelatorioId, documentoId })));
}

/** The trigger applies the decision to the report. */
export async function insertParecer(
  tx: Transaction,
  values: { versaoRelatorioId: string; decisao: "APROVADO" | "DEVOLVIDO"; texto: string | null; emitidoPorUsuarioId: string },
) {
  const [row] = await tx.insert(parecerRelatorio).values(values).returning();
  return row;
}

export async function podeLerRelatorios(tx: Transaction, estagioId: string): Promise<boolean> {
  const { rows } = await tx.execute<{ pode: boolean }>(sql`select app.pode_ler_relatorios(${estagioId}::uuid) as pode`);
  return rows[0]?.pode === true;
}

/**
 * RF040: reports of ATIVO internships waiting for someone (the student or the advisor), as the
 * RLS of relatorio shows them to the caller, earliest deadline first.
 */
export async function findRelatoriosEmAberto(tx: Transaction) {
  return tx
    .select({ relatorio, estagioTipo: estagio.tipo, estudanteId: estagio.estudanteId })
    .from(relatorio)
    .innerJoin(estagio, eq(estagio.id, relatorio.estagioId))
    .where(and(eq(estagio.situacao, "ATIVO"), inArray(relatorio.situacao, ["PENDENTE", "DEVOLVIDO", "EM_ANALISE"])))
    .orderBy(asc(relatorio.prazoEntrega));
}
