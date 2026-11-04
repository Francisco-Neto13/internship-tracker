import { and, asc, desc, eq, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { anexoRelatorio, documento, estagio, estudante, parecerRelatorio, relatorio, usuario, versaoRelatorio } from "@/db/schema";
import type { Transaction } from "@/db/with-user";
import type { VisaoRelatorio } from "../domain/relatorio";

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
    .select({ relatorio, estagioTipo: estagio.tipo, estudanteId: estagio.estudanteId, estudanteNome: usuario.nome })
    .from(relatorio)
    .innerJoin(estagio, eq(estagio.id, relatorio.estagioId))
    // Name for the lists; left join so a student hidden by its own policy keeps the report
    .leftJoin(estudante, eq(estudante.id, estagio.estudanteId))
    .leftJoin(usuario, eq(usuario.id, estudante.usuarioId))
    .where(and(eq(estagio.situacao, "ATIVO"), inArray(relatorio.situacao, ["PENDENTE", "DEVOLVIDO", "EM_ANALISE"])))
    .orderBy(asc(relatorio.prazoEntrega));
}

// RF040: what is waiting now, in SQL so the list screen pages on the server (RNF-11). A report is
// due once its period has ended; in analysis, it waits for the advisor. "atraso" mirrors
// relatorioEmAtraso of the domain, and a test holds the two together.
function pendenteAgora(diaAtual: string): SQL {
  return and(
    eq(estagio.situacao, "ATIVO"),
    or(eq(relatorio.situacao, "EM_ANALISE"), and(inArray(relatorio.situacao, ["PENDENTE", "DEVOLVIDO"]), lt(relatorio.periodoFim, diaAtual))),
  )!;
}

function naVisao(visao: VisaoRelatorio, diaAtual: string): SQL | undefined {
  if (visao === "orientador") return eq(relatorio.situacao, "EM_ANALISE");
  if (visao === "estudante") return inArray(relatorio.situacao, ["PENDENTE", "DEVOLVIDO"]);
  if (visao === "atraso") return and(inArray(relatorio.situacao, ["PENDENTE", "DEVOLVIDO"]), lt(relatorio.prazoEntrega, diaAtual));
  return undefined;
}

export async function findRelatoriosPendentesPagina(tx: Transaction, diaAtual: string, visao: VisaoRelatorio, limit: number, offset: number) {
  return tx
    .select({ relatorio, estudanteNome: usuario.nome })
    .from(relatorio)
    .innerJoin(estagio, eq(estagio.id, relatorio.estagioId))
    .leftJoin(estudante, eq(estudante.id, estagio.estudanteId))
    .leftJoin(usuario, eq(usuario.id, estudante.usuarioId))
    .where(and(pendenteAgora(diaAtual), naVisao(visao, diaAtual)))
    .orderBy(asc(relatorio.prazoEntrega), asc(relatorio.id))
    .limit(limit)
    .offset(offset);
}

/** Total of each view, read at once: the filter chips show all of them. */
export async function countRelatoriosPendentes(tx: Transaction, diaAtual: string): Promise<Record<VisaoRelatorio, number>> {
  const contar = (visao: VisaoRelatorio) => {
    const condicao = naVisao(visao, diaAtual);
    return (condicao ? sql<number>`count(*) filter (where ${condicao})` : sql<number>`count(*)`).mapWith(Number);
  };
  const [linha] = await tx
    .select({ todos: contar("todos"), orientador: contar("orientador"), estudante: contar("estudante"), atraso: contar("atraso") })
    .from(relatorio)
    .innerJoin(estagio, eq(estagio.id, relatorio.estagioId))
    .where(pendenteAgora(diaAtual));
  return linha;
}
