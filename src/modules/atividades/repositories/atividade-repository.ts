import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { analiseAtividade, atividadeComplementar, categoriaAtividade, comprovanteAtividade, documento, estudante, usuario } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// Complementary activities (RF049 to RF055). No authorization filter: RLS and the triggers of
// functions/13_atividades.sql decide who registers, complements and analyzes.

export type AtividadeRow = typeof atividadeComplementar.$inferSelect & { categoriaNome?: string | null; estudanteNome?: string | null; matricula?: string | null };
export type ComprovanteRow = typeof comprovanteAtividade.$inferSelect & { nomeOriginal?: string | null };
export type AnaliseRow = typeof analiseAtividade.$inferSelect & { analisadoPorNome?: string | null };
export type SituacaoAtividade = AtividadeRow["situacao"];

export async function estudanteAtualId(tx: Transaction): Promise<string | null> {
  const { rows } = await tx.execute<{ id: string | null }>(sql`select app.estudante_atual_id() as id`);
  return rows[0]?.id ?? null;
}

export type FiltrosAtividade = { estudanteId?: string; categoriaId?: string; situacao?: SituacaoAtividade };

export async function findAtividades(tx: Transaction, filtros: FiltrosAtividade): Promise<AtividadeRow[]> {
  const linhas = await tx
    .select({ atividade: atividadeComplementar, categoriaNome: categoriaAtividade.nome, estudanteNome: usuario.nome, matricula: estudante.matricula })
    .from(atividadeComplementar)
    .innerJoin(categoriaAtividade, eq(categoriaAtividade.id, atividadeComplementar.categoriaId))
    .innerJoin(estudante, eq(estudante.id, atividadeComplementar.estudanteId))
    .leftJoin(usuario, eq(usuario.id, estudante.usuarioId))
    .where(
      and(
        filtros.estudanteId ? eq(atividadeComplementar.estudanteId, filtros.estudanteId) : undefined,
        filtros.categoriaId ? eq(atividadeComplementar.categoriaId, filtros.categoriaId) : undefined,
        filtros.situacao ? eq(atividadeComplementar.situacao, filtros.situacao) : undefined,
      ),
    )
    .orderBy(desc(atividadeComplementar.enviadaEm));
  return linhas.map((linha) => ({ ...linha.atividade, categoriaNome: linha.categoriaNome, estudanteNome: linha.estudanteNome, matricula: linha.matricula }));
}

export async function findAtividadeById(tx: Transaction, id: string): Promise<AtividadeRow | undefined> {
  const [row] = await tx.select().from(atividadeComplementar).where(eq(atividadeComplementar.id, id));
  return row;
}

export type NovaAtividade = Pick<
  typeof atividadeComplementar.$inferInsert,
  "estudanteId" | "categoriaId" | "descricao" | "instituicaoPromotora" | "dataInicio" | "dataFim" | "horasDeclaradasMinutos" | "origemEstagioId" | "registradaPorUsuarioId"
>;

export async function insertAtividade(tx: Transaction, values: NovaAtividade): Promise<AtividadeRow> {
  const [row] = await tx.insert(atividadeComplementar).values(values).returning();
  return row;
}

export async function updateAtividade(
  tx: Transaction,
  id: string,
  values: Partial<Pick<AtividadeRow, "categoriaId" | "descricao" | "instituicaoPromotora" | "dataInicio" | "dataFim" | "horasDeclaradasMinutos" | "situacao">>,
): Promise<AtividadeRow | undefined> {
  const [row] = await tx.update(atividadeComplementar).set(values).where(eq(atividadeComplementar.id, id)).returning();
  return row;
}

// ---------------------------------------------------------------- comprovantes

/** The trigger copies estudante_id and sha256 from the activity and the document. */
export async function insertComprovantes(tx: Transaction, atividadeId: string, estudanteId: string, documentos: { id: string; sha256: string }[]) {
  if (documentos.length === 0) return [];
  return tx
    .insert(comprovanteAtividade)
    .values(documentos.map((doc) => ({ atividadeId, estudanteId, documentoId: doc.id, sha256: doc.sha256 })))
    .returning();
}

export async function retirarComprovantes(tx: Transaction, atividadeId: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const rows = await tx
    .update(comprovanteAtividade)
    .set({ valido: false })
    .where(and(eq(comprovanteAtividade.atividadeId, atividadeId), inArray(comprovanteAtividade.id, ids), eq(comprovanteAtividade.valido, true)))
    .returning({ id: comprovanteAtividade.id });
  return rows.length;
}

export async function findComprovantes(tx: Transaction, atividadeId: string): Promise<ComprovanteRow[]> {
  const linhas = await tx
    .select({ comprovante: comprovanteAtividade, nomeOriginal: documento.nomeOriginal })
    .from(comprovanteAtividade)
    .leftJoin(documento, eq(documento.id, comprovanteAtividade.documentoId))
    .where(eq(comprovanteAtividade.atividadeId, atividadeId))
    .orderBy(asc(comprovanteAtividade.criadoEm));
  return linhas.map((linha) => ({ ...linha.comprovante, nomeOriginal: linha.nomeOriginal }));
}

/** RF052: a valid proof of the student with the same file, wherever it is attached. */
export async function findComprovantePorHash(tx: Transaction, estudanteId: string, sha256s: string[]) {
  if (sha256s.length === 0) return undefined;
  const [row] = await tx
    .select({ atividadeId: comprovanteAtividade.atividadeId, sha256: comprovanteAtividade.sha256 })
    .from(comprovanteAtividade)
    .where(and(eq(comprovanteAtividade.estudanteId, estudanteId), eq(comprovanteAtividade.valido, true), inArray(comprovanteAtividade.sha256, sha256s)))
    .limit(1);
  return row;
}

// ---------------------------------------------------------------- análise

export async function findAnalises(tx: Transaction, atividadeId: string): Promise<AnaliseRow[]> {
  const linhas = await tx
    .select({ analise: analiseAtividade, analisadoPorNome: usuario.nome })
    .from(analiseAtividade)
    .leftJoin(usuario, eq(usuario.id, analiseAtividade.analisadoPorUsuarioId))
    .where(eq(analiseAtividade.atividadeId, atividadeId))
    .orderBy(desc(analiseAtividade.criadoEm));
  return linhas.map((linha) => ({ ...linha.analise, analisadoPorNome: linha.analisadoPorNome }));
}

/** The trigger fills the minutes counted, the excess and its reason, and applies the decision. */
export async function insertAnalise(
  tx: Transaction,
  values: { atividadeId: string; decisao: AnaliseRow["decisao"]; motivo: string | null; analisadoPorUsuarioId: string },
): Promise<AnaliseRow> {
  const [row] = await tx.insert(analiseAtividade).values(values).returning();
  return row;
}

export type SaldoDaAtividade = {
  atividadeId: string;
  limiteCategoriaMinutos: number;
  jaAproveitadoNaCategoriaMinutos: number;
  totalCursoMinutos: number;
  jaAproveitadoNoTotalMinutos: number;
};

/** Balances that the approval of each activity would face (RF051 preview), in one query. */
export async function findSaldos(tx: Transaction, atividadeIds: string[]): Promise<SaldoDaAtividade[]> {
  if (atividadeIds.length === 0) return [];
  const { rows } = await tx.execute<{
    atividade_id: string;
    limite: number | null;
    ja_categoria: string;
    total: number;
    ja_total: string;
  }>(sql`
    select a.id as atividade_id, x.limite_minutos as limite, cu.carga_atividades_complementares_minutos as total,
           coalesce((select sum(o.horas_aproveitadas_minutos) from public.atividade_complementar o
                     where o.estudante_id = a.estudante_id and o.situacao = 'APROVADA' and o.categoria_id = a.categoria_id), 0) as ja_categoria,
           coalesce((select sum(o.horas_aproveitadas_minutos) from public.atividade_complementar o
                     where o.estudante_id = a.estudante_id and o.situacao = 'APROVADA'), 0) as ja_total
    from public.atividade_complementar a
    join public.estudante e on e.id = a.estudante_id
    join public.curso cu on cu.id = e.curso_id
    left join public.exigencia_categoria x on x.curso_id = e.curso_id and x.categoria_id = a.categoria_id
    where a.id in (${sql.join(atividadeIds.map((id) => sql`${id}::uuid`), sql`, `)})
  `);
  return rows.map((row) => ({
    atividadeId: row.atividade_id,
    limiteCategoriaMinutos: row.limite ?? 0,
    jaAproveitadoNaCategoriaMinutos: Number(row.ja_categoria),
    totalCursoMinutos: row.total,
    jaAproveitadoNoTotalMinutos: Number(row.ja_total),
  }));
}
