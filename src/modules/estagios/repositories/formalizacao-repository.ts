import { and, asc, desc, eq, isNull, max, sql } from "drizzle-orm";
import { apoliceSeguro, assinatura, planoAtividades, responsavelEstagio, usuario } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// Plan, insurance, responsible people and signatures of an internship (RF016 to RF019,
// RF031, RF034). No authorization filter: RLS and the triggers decide.

export type PlanoRow = typeof planoAtividades.$inferSelect;
export type ApoliceRow = typeof apoliceSeguro.$inferSelect;
export type ResponsavelRow = typeof responsavelEstagio.$inferSelect & { usuarioNome?: string | null };
export type AssinaturaRow = typeof assinatura.$inferSelect;
type Papel = ResponsavelRow["papel"];

// ---------------------------------------------------------------- plano_atividades

export async function findPlanos(tx: Transaction, estagioId: string): Promise<PlanoRow[]> {
  return tx.select().from(planoAtividades).where(eq(planoAtividades.estagioId, estagioId)).orderBy(desc(planoAtividades.versao));
}

export async function findPlanoById(tx: Transaction, id: string): Promise<PlanoRow | undefined> {
  const [row] = await tx.select().from(planoAtividades).where(eq(planoAtividades.id, id));
  return row;
}

export async function insertPlano(
  tx: Transaction,
  values: { estagioId: string; atividadesPrevistas: string; justificativaCompatibilidade: string; elaboradoPorUsuarioId: string },
): Promise<PlanoRow> {
  const [{ ultima }] = await tx
    .select({ ultima: max(planoAtividades.versao) })
    .from(planoAtividades)
    .where(eq(planoAtividades.estagioId, values.estagioId));
  const [row] = await tx
    .insert(planoAtividades)
    .values({ ...values, versao: (ultima ?? 0) + 1 })
    .returning();
  return row;
}

export async function updatePlano(tx: Transaction, id: string, values: Partial<PlanoRow>): Promise<PlanoRow | undefined> {
  const [row] = await tx.update(planoAtividades).set(values).where(eq(planoAtividades.id, id)).returning();
  return row;
}

// ---------------------------------------------------------------- apolice_seguro

export async function findApolices(tx: Transaction, estagioId: string): Promise<ApoliceRow[]> {
  return tx.select().from(apoliceSeguro).where(eq(apoliceSeguro.estagioId, estagioId)).orderBy(asc(apoliceSeguro.vigenciaInicio));
}

export async function insertApolice(tx: Transaction, values: Omit<ApoliceRow, "id" | "criadoEm">): Promise<ApoliceRow> {
  const [row] = await tx.insert(apoliceSeguro).values(values).returning();
  return row;
}

// ---------------------------------------------------------------- responsavel_estagio

export async function findResponsaveis(tx: Transaction, estagioId: string): Promise<ResponsavelRow[]> {
  const linhas = await tx
    .select({ responsavel: responsavelEstagio, usuarioNome: usuario.nome })
    .from(responsavelEstagio)
    .leftJoin(usuario, eq(usuario.id, responsavelEstagio.usuarioId))
    .where(eq(responsavelEstagio.estagioId, estagioId))
    .orderBy(asc(responsavelEstagio.papel), asc(responsavelEstagio.vigenciaInicio), asc(responsavelEstagio.criadoEm));
  return linhas.map((linha) => ({ ...linha.responsavel, usuarioNome: linha.usuarioNome }));
}

/** Designation of the role not ended (current or starting later), excluding annulled ones. */
export async function findResponsavelAtual(tx: Transaction, estagioId: string, papel: Papel): Promise<ResponsavelRow | undefined> {
  const [row] = await tx
    .select()
    .from(responsavelEstagio)
    .where(
      and(
        eq(responsavelEstagio.estagioId, estagioId),
        eq(responsavelEstagio.papel, papel),
        sql`(${responsavelEstagio.vigenciaFim} is null or (${responsavelEstagio.vigenciaFim} > current_date and ${responsavelEstagio.vigenciaFim} > ${responsavelEstagio.vigenciaInicio}))`,
      ),
    )
    .orderBy(desc(responsavelEstagio.vigenciaInicio))
    .limit(1);
  return row;
}

/** RF032: a designation of the role in force on `data`. */
export async function temResponsavelEm(tx: Transaction, estagioId: string, papel: Papel, data: string): Promise<boolean> {
  const [row] = await tx
    .select({ id: responsavelEstagio.id })
    .from(responsavelEstagio)
    .where(
      and(
        eq(responsavelEstagio.estagioId, estagioId),
        eq(responsavelEstagio.papel, papel),
        sql`${responsavelEstagio.vigenciaInicio} <= ${data}::date`,
        sql`(${responsavelEstagio.vigenciaFim} is null or ${responsavelEstagio.vigenciaFim} > ${data}::date)`,
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function insertResponsavel(
  tx: Transaction,
  values: Omit<typeof responsavelEstagio.$inferInsert, "id" | "criadoEm" | "atualizadoEm">,
): Promise<ResponsavelRow> {
  const [row] = await tx.insert(responsavelEstagio).values(values).returning();
  return row;
}

export async function encerrarResponsavel(tx: Transaction, id: string, vigenciaFim: string): Promise<boolean> {
  const rows = await tx
    .update(responsavelEstagio)
    .set({ vigenciaFim })
    .where(and(eq(responsavelEstagio.id, id), isNull(responsavelEstagio.vigenciaFim)))
    .returning({ id: responsavelEstagio.id });
  return rows.length > 0;
}

// ---------------------------------------------------------------- assinatura

export async function findAssinaturas(tx: Transaction, estagioId: string): Promise<AssinaturaRow[]> {
  return tx.select().from(assinatura).where(eq(assinatura.estagioId, estagioId)).orderBy(asc(assinatura.criadoEm));
}

export async function insertAssinatura(tx: Transaction, values: Omit<AssinaturaRow, "id" | "criadoEm">): Promise<AssinaturaRow> {
  const [row] = await tx.insert(assinatura).values(values).returning();
  return row;
}

export async function nomeDoUsuario(tx: Transaction, usuarioId: string): Promise<string | null> {
  const [row] = await tx.select({ nome: usuario.nome }).from(usuario).where(eq(usuario.id, usuarioId));
  return row?.nome ?? null;
}
