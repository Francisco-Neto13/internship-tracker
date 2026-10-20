import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { acompanhamento, avaliacaoDesempenho, criterioAvaliacao, respostaAvaliacao, usuario } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// Evaluation (RF042, RF043, RF014) and follow-up (RF033). No authorization filter: RLS and the
// triggers of functions/10_avaliacao_acompanhamento.sql decide.

export type CriterioRow = typeof criterioAvaliacao.$inferSelect;
export type AvaliacaoRow = typeof avaliacaoDesempenho.$inferSelect & { avaliadorNome?: string | null; media?: number | null };
export type RespostaRow = typeof respostaAvaliacao.$inferSelect;
export type AcompanhamentoRow = typeof acompanhamento.$inferSelect & { registradoPorNome?: string | null };

// ---------------------------------------------------------------- critérios

export async function findCriterios(tx: Transaction, apenasAtivos: boolean): Promise<CriterioRow[]> {
  return tx
    .select()
    .from(criterioAvaliacao)
    .where(apenasAtivos ? eq(criterioAvaliacao.ativo, true) : undefined)
    .orderBy(asc(criterioAvaliacao.ordem), asc(criterioAvaliacao.codigo));
}

export async function insertCriterio(tx: Transaction, values: Omit<typeof criterioAvaliacao.$inferInsert, "id" | "criadoEm" | "atualizadoEm">) {
  const [row] = await tx.insert(criterioAvaliacao).values(values).returning();
  return row;
}

export async function updateCriterio(
  tx: Transaction,
  id: string,
  values: Partial<Pick<CriterioRow, "descricao" | "escalaMinima" | "escalaMaxima" | "ordem" | "ativo">>,
): Promise<CriterioRow | undefined> {
  const [row] = await tx.update(criterioAvaliacao).set(values).where(eq(criterioAvaliacao.id, id)).returning();
  return row;
}

// ---------------------------------------------------------------- avaliações

export async function findAvaliacoes(tx: Transaction, estagioId: string): Promise<AvaliacaoRow[]> {
  const linhas = await tx
    .select({
      avaliacao: avaliacaoDesempenho,
      avaliadorNome: usuario.nome,
      media: sql<string | null>`app.media_avaliacao(${avaliacaoDesempenho.id})`,
    })
    .from(avaliacaoDesempenho)
    .leftJoin(usuario, eq(usuario.id, avaliacaoDesempenho.avaliadorUsuarioId))
    .where(eq(avaliacaoDesempenho.estagioId, estagioId))
    .orderBy(desc(avaliacaoDesempenho.criadoEm));
  return linhas.map((linha) => ({ ...linha.avaliacao, avaliadorNome: linha.avaliadorNome, media: linha.media === null ? null : Number(linha.media) }));
}

export async function findRespostas(tx: Transaction, avaliacaoIds: string[]): Promise<RespostaRow[]> {
  if (avaliacaoIds.length === 0) return [];
  return tx.select().from(respostaAvaliacao).where(inArray(respostaAvaliacao.avaliacaoId, avaliacaoIds));
}

/** The trigger sets the evaluator's profile (SUPERVISOR or CONCEDENTE); the value here is a placeholder. */
export async function insertAvaliacao(
  tx: Transaction,
  values: Pick<typeof avaliacaoDesempenho.$inferInsert, "estagioId" | "momento" | "periodoInicio" | "periodoFim" | "observacoes" | "avaliadorUsuarioId">,
) {
  const [row] = await tx
    .insert(avaliacaoDesempenho)
    .values({ ...values, avaliadorPerfil: "SUPERVISOR" })
    .returning();
  return row;
}

export async function insertRespostas(tx: Transaction, avaliacaoId: string, respostas: { criterioId: string; nota: number; comentario: string | null }[]) {
  return tx
    .insert(respostaAvaliacao)
    .values(respostas.map((resposta) => ({ ...resposta, avaliacaoId })))
    .returning();
}

/** RF014: average of the final evaluations of the concedente (aggregate only). */
export async function mediaAvaliacoesConcedente(tx: Transaction, concedenteId: string): Promise<{ media: number | null; avaliacoes: number }> {
  const { rows } = await tx.execute<{ media: string | null; avaliacoes: string }>(
    sql`select media, avaliacoes from app.media_avaliacoes_concedente(${concedenteId}::uuid)`,
  );
  return { media: rows[0]?.media === null || rows[0] === undefined ? null : Number(rows[0].media), avaliacoes: Number(rows[0]?.avaliacoes ?? 0) };
}

// ---------------------------------------------------------------- acompanhamento

export async function findAcompanhamentos(tx: Transaction, estagioId: string): Promise<AcompanhamentoRow[]> {
  const linhas = await tx
    .select({ acompanhamento, registradoPorNome: usuario.nome })
    .from(acompanhamento)
    .leftJoin(usuario, eq(usuario.id, acompanhamento.registradoPorUsuarioId))
    .where(eq(acompanhamento.estagioId, estagioId))
    .orderBy(desc(acompanhamento.dataOcorrencia), desc(acompanhamento.criadoEm));
  return linhas.map((linha) => ({ ...linha.acompanhamento, registradoPorNome: linha.registradoPorNome }));
}

export async function podeLerAcompanhamentos(tx: Transaction, estagioId: string): Promise<boolean> {
  const { rows } = await tx.execute<{ pode: boolean }>(
    sql`select (app.e_responsavel_vigente(${estagioId}::uuid, 'ORIENTADOR') or app.coordena_curso_do_estagio(${estagioId}::uuid)) as pode`,
  );
  return rows[0]?.pode === true;
}

export async function findAcompanhamentoById(tx: Transaction, id: string): Promise<AcompanhamentoRow | undefined> {
  const [row] = await tx.select().from(acompanhamento).where(eq(acompanhamento.id, id));
  return row;
}

export async function insertAcompanhamento(tx: Transaction, values: Omit<typeof acompanhamento.$inferInsert, "id" | "criadoEm" | "atualizadoEm">) {
  const [row] = await tx.insert(acompanhamento).values(values).returning();
  return row;
}

export async function updateAcompanhamento(
  tx: Transaction,
  id: string,
  values: Partial<Pick<AcompanhamentoRow, "tipo" | "dataOcorrencia" | "participantes" | "observacoes">>,
): Promise<AcompanhamentoRow | undefined> {
  const [row] = await tx.update(acompanhamento).set(values).where(eq(acompanhamento.id, id)).returning();
  return row;
}
