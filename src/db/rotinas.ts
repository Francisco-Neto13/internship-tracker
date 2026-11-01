import { sql } from "drizzle-orm";
import { getAppDatabase } from "./client";

// Calls WITHOUT identity, as app_runtime: RLS shows them no rows, so they only act through
// SECURITY DEFINER functions of drizzle/sql. These are the only calls into the pool outside
// withUser, and they reach nothing else:
// - the daily routine (RF012, RF040, RF069), behind CRON_SECRET (src/app/api/cron/diaria);
// - the public check of a declaration by its verification code (RF058).

export type ResultadoRotina = Record<string, number>;

export async function executarRotinaDiaria(): Promise<ResultadoRotina> {
  const { rows } = await getAppDatabase().execute<{ resultado: ResultadoRotina }>(sql`select app.rotina_diaria() as resultado`);
  return rows[0].resultado;
}

export type DeclaracaoVerificada = { tipo: string; estudante: string; curso: string; emitida_em: string; sha256: string };

export async function verificarDeclaracao(codigo: string): Promise<DeclaracaoVerificada | null> {
  const { rows } = await getAppDatabase().execute<DeclaracaoVerificada>(
    sql`select tipo, estudante, curso, emitida_em, sha256 from app.verificar_declaracao(${codigo})`,
  );
  return rows[0] ?? null;
}
