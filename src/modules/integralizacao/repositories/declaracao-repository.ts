import { desc, eq, sql } from "drizzle-orm";
import { declaracao } from "@/db/schema";
import type { Transaction } from "@/db/with-user";
import type { DadosDeclaracao } from "../domain/declaracao";

// RF058: declarations of a student. No authorization filter: RLS decides.

export type DeclaracaoRow = typeof declaracao.$inferSelect;

/** app.dados_declaracao: checks the fact and the caller, and returns what the PDF says. */
export async function dadosDeclaracao(tx: Transaction, tipo: DadosDeclaracao["tipo"], estudanteId: string, estagioId: string | null): Promise<DadosDeclaracao> {
  const { rows } = await tx.execute<{ dados: DadosDeclaracao }>(
    sql`select app.dados_declaracao(${tipo}::public.tipo_declaracao, ${estudanteId}::uuid, ${estagioId}::uuid) as dados`,
  );
  return rows[0].dados;
}

export async function findDeclaracoes(tx: Transaction, estudanteId: string): Promise<DeclaracaoRow[]> {
  return tx.select().from(declaracao).where(eq(declaracao.estudanteId, estudanteId)).orderBy(desc(declaracao.criadoEm));
}

export async function insertDeclaracao(tx: Transaction, values: Omit<DeclaracaoRow, "id" | "criadoEm">): Promise<DeclaracaoRow> {
  const [row] = await tx.insert(declaracao).values(values).returning();
  return row;
}
