import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { padraoContendo } from "@/db/like";
import { concedente, historicoSituacaoConcedente, porteConcedente, setorAtuacao, usuario } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// No authorization filter: RLS decides who reads and writes (RF003, RN-37)

export type ConcedenteRow = typeof concedente.$inferSelect;
export type ConcedenteValues = Omit<ConcedenteRow, "id" | "situacao" | "criadoEm" | "atualizadoEm">;
type Situacao = ConcedenteRow["situacao"];

export async function findConcedentes(
  tx: Transaction,
  filtro: { situacao?: Situacao; porteId?: string; setorAtuacaoId?: string; busca?: string; limit: number; offset: number },
): Promise<{ items: ConcedenteRow[]; total: number }> {
  const condicoes: SQL[] = [];
  if (filtro.situacao) condicoes.push(eq(concedente.situacao, filtro.situacao));
  if (filtro.porteId) condicoes.push(eq(concedente.porteId, filtro.porteId));
  if (filtro.setorAtuacaoId) condicoes.push(eq(concedente.setorAtuacaoId, filtro.setorAtuacaoId));
  if (filtro.busca) {
    const padrao = padraoContendo(filtro.busca);
    condicoes.push(or(ilike(concedente.razaoSocial, padrao), ilike(concedente.nomeFantasia, padrao), ilike(concedente.cnpj, padrao))!);
  }
  const where = condicoes.length > 0 ? and(...condicoes) : undefined;
  const items = await tx
    .select()
    .from(concedente)
    .where(where)
    .orderBy(asc(concedente.razaoSocial))
    .limit(filtro.limit)
    .offset(filtro.offset);
  const [{ total }] = await tx.select({ total: count() }).from(concedente).where(where);
  return { items, total };
}

export async function findConcedenteById(tx: Transaction, id: string): Promise<ConcedenteRow | undefined> {
  const [row] = await tx.select().from(concedente).where(eq(concedente.id, id));
  return row;
}

export async function insertConcedente(tx: Transaction, values: ConcedenteValues): Promise<ConcedenteRow> {
  const [row] = await tx.insert(concedente).values(values).returning();
  return row;
}

/** Undefined when RLS hid the row or the caller may not write it. */
export async function updateConcedente(
  tx: Transaction,
  id: string,
  values: Partial<ConcedenteValues> & { situacao?: Situacao },
): Promise<ConcedenteRow | undefined> {
  const [row] = await tx.update(concedente).set(values).where(eq(concedente.id, id)).returning();
  return row;
}

export async function insertHistoricoSituacao(
  tx: Transaction,
  values: { concedenteId: string; situacaoNova: Situacao; motivo: string | null; decididoPorUsuarioId: string },
): Promise<void> {
  await tx.insert(historicoSituacaoConcedente).values(values);
}

export async function findHistoricoSituacao(tx: Transaction, concedenteId: string) {
  return tx
    .select({
      id: historicoSituacaoConcedente.id,
      situacaoNova: historicoSituacaoConcedente.situacaoNova,
      motivo: historicoSituacaoConcedente.motivo,
      decididoPorUsuarioId: historicoSituacaoConcedente.decididoPorUsuarioId,
      decididoPorNome: usuario.nome,
      criadoEm: historicoSituacaoConcedente.criadoEm,
    })
    .from(historicoSituacaoConcedente)
    .leftJoin(usuario, eq(usuario.id, historicoSituacaoConcedente.decididoPorUsuarioId))
    .where(eq(historicoSituacaoConcedente.concedenteId, concedenteId))
    .orderBy(desc(historicoSituacaoConcedente.criadoEm));
}

// RF013: classification catalogs, one repository for both tables (same shape)
export const CATALOGOS = { porte: porteConcedente, setor: setorAtuacao } as const;
export type Catalogo = keyof typeof CATALOGOS;
export type ClassificacaoRow = typeof porteConcedente.$inferSelect;

export async function findClassificacoes(tx: Transaction, catalogo: Catalogo, incluirInativos: boolean): Promise<ClassificacaoRow[]> {
  const tabela = CATALOGOS[catalogo];
  return tx
    .select()
    .from(tabela)
    .where(incluirInativos ? undefined : eq(tabela.ativo, true))
    .orderBy(asc(tabela.nome));
}

export async function insertClassificacao(tx: Transaction, catalogo: Catalogo, nome: string): Promise<ClassificacaoRow> {
  const [row] = await tx.insert(CATALOGOS[catalogo]).values({ nome }).returning();
  return row;
}

export async function updateClassificacao(
  tx: Transaction,
  catalogo: Catalogo,
  id: string,
  values: { nome?: string; ativo?: boolean },
): Promise<ClassificacaoRow | undefined> {
  const tabela = CATALOGOS[catalogo];
  const [row] = await tx.update(tabela).set(values).where(eq(tabela.id, id)).returning();
  return row;
}

export async function classificacaoAtiva(tx: Transaction, catalogo: Catalogo, id: string): Promise<boolean> {
  const tabela = CATALOGOS[catalogo];
  const [row] = await tx.select({ ativo: tabela.ativo }).from(tabela).where(eq(tabela.id, id));
  return row?.ativo === true;
}
