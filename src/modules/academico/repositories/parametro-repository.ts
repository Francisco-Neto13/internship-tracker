import { desc, lte } from "drizzle-orm";
import { parametroInstitucional } from "@/db/schema";
import type { Transaction } from "@/db/with-user";
import type { Parametros } from "../domain/parametros";

// No authorization filter: RLS decides who reads and who inserts (RF003, RF006)

const colunas = {
  id: parametroInstitucional.id,
  vigenciaInicio: parametroInstitucional.vigenciaInicio,
  limiteDiarioObrigatorioMinutos: parametroInstitucional.limiteDiarioObrigatorioMinutos,
  limiteDiarioNaoObrigatorioMinutos: parametroInstitucional.limiteDiarioNaoObrigatorioMinutos,
  limiteSemanalMinutos: parametroInstitucional.limiteSemanalMinutos,
  bloquearExcedente: parametroInstitucional.bloquearExcedente,
  duracaoMaximaMeses: parametroInstitucional.duracaoMaximaMeses,
  toleranciaDivergenciaPercentual: parametroInstitucional.toleranciaDivergenciaPercentual,
  prazoGuardaAnos: parametroInstitucional.prazoGuardaAnos,
  antecedenciaAlertaConvenioDias: parametroInstitucional.antecedenciaAlertaConvenioDias,
  definidoPorUsuarioId: parametroInstitucional.definidoPorUsuarioId,
  criadoEm: parametroInstitucional.criadoEm,
};

export type ParametroRow = Parametros & { id: string; definidoPorUsuarioId: string; criadoEm: Date };

// numeric arrives from pg as a string; the domain works with a number
function paraDominio(
  row: Omit<ParametroRow, "toleranciaDivergenciaPercentual"> & { toleranciaDivergenciaPercentual: string },
): ParametroRow {
  return { ...row, toleranciaDivergenciaPercentual: Number(row.toleranciaDivergenciaPercentual) };
}

/** Version in force on `data` (YYYY-MM-DD): the greatest vigencia_inicio <= data. */
export async function findParametroVigente(tx: Transaction, data: string): Promise<ParametroRow | undefined> {
  const [row] = await tx
    .select(colunas)
    .from(parametroInstitucional)
    .where(lte(parametroInstitucional.vigenciaInicio, data))
    .orderBy(desc(parametroInstitucional.vigenciaInicio))
    .limit(1);
  return row ? paraDominio(row) : undefined;
}

export async function findHistoricoParametros(tx: Transaction): Promise<ParametroRow[]> {
  const rows = await tx.select(colunas).from(parametroInstitucional).orderBy(desc(parametroInstitucional.vigenciaInicio));
  return rows.map(paraDominio);
}

export async function insertParametro(
  tx: Transaction,
  values: Omit<Parametros, "vigenciaInicio"> & { vigenciaInicio: string; definidoPorUsuarioId: string },
): Promise<ParametroRow> {
  const [row] = await tx
    .insert(parametroInstitucional)
    .values({ ...values, toleranciaDivergenciaPercentual: values.toleranciaDivergenciaPercentual.toFixed(2) })
    .returning(colunas);
  return paraDominio(row);
}
