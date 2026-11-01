import { asc, desc, eq, sql } from "drizzle-orm";
import { afastamento } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// RF059, RF060: leaves of the internship. No authorization filter: RLS decides (the row is
// read by student, advisor and coordination; the dates by anyone who reads the internship).

export type AfastamentoRow = typeof afastamento.$inferSelect;

export async function findAfastamentos(tx: Transaction, estagioId: string): Promise<AfastamentoRow[]> {
  return tx.select().from(afastamento).where(eq(afastamento.estagioId, estagioId)).orderBy(asc(afastamento.dataInicio), desc(afastamento.criadoEm));
}

export async function findAfastamentoById(tx: Transaction, id: string): Promise<AfastamentoRow | undefined> {
  const [row] = await tx.select().from(afastamento).where(eq(afastamento.id, id));
  return row;
}

export async function insertAfastamento(
  tx: Transaction,
  values: Pick<AfastamentoRow, "estagioId" | "tipo" | "descricao" | "dataInicio" | "dataFim" | "documentoId" | "registradoPorUsuarioId"> &
    Partial<Pick<AfastamentoRow, "substituiAfastamentoId" | "justificativaSubstituicao">> & { dataFimPrevista: string },
): Promise<AfastamentoRow> {
  const { dataFimPrevista, ...campos } = values;
  // The extension and the dates are decided by the trigger (app.validar_afastamento)
  const [row] = await tx
    .insert(afastamento)
    .values({ ...campos, diasExtensao: 0, dataFimPrevistaAnterior: dataFimPrevista, dataFimPrevistaNova: dataFimPrevista })
    .returning();
  return row;
}

/** Valid leave periods, dates only (app.periodos_afastamento). */
export async function periodosAfastamento(tx: Transaction, estagioId: string): Promise<{ dataInicio: string; dataFim: string }[]> {
  const result = await tx.execute<{ data_inicio: string; data_fim: string }>(
    sql`select data_inicio::text, data_fim::text from app.periodos_afastamento(${estagioId}::uuid)`,
  );
  return result.rows.map((row) => ({ dataInicio: row.data_inicio, dataFim: row.data_fim }));
}
