import { sql } from "drizzle-orm";
import { getAppDatabase } from "./client";

// Calls WITHOUT identity, as app_runtime: RLS shows them no rows, so they only act through
// SECURITY DEFINER functions of drizzle/sql. These are the only calls into the pool outside
// withUser, and they reach nothing else:
// - the daily routine (RF012, RF040, RF069), behind CRON_SECRET (src/app/api/cron/diaria);
// - the public check of a declaration by its verification code (RF058);
// - the request for a temporary password from the sign-in screen (RF002).

export type ResultadoRotina = Record<string, number>;

export async function executarRotinaDiaria(): Promise<ResultadoRotina> {
  const { rows } = await getAppDatabase().execute<{ resultado: ResultadoRotina }>(sql`select app.rotina_diaria() as resultado`);
  return rows[0].resultado;
}

/** RF002: warns the administrators. Says nothing back, whether the account exists or not. */
export async function solicitarRecuperacaoSenha(email: string): Promise<void> {
  await getAppDatabase().execute(sql`select app.solicitar_recuperacao_senha(${email})`);
}

export type DeclaracaoVerificada = { tipo: string; estudante: string; curso: string; emitida_em: string; sha256: string };

export async function verificarDeclaracao(codigo: string): Promise<DeclaracaoVerificada | null> {
  const { rows } = await getAppDatabase().execute<DeclaracaoVerificada>(
    sql`select tipo, estudante, curso, emitida_em, sha256 from app.verificar_declaracao(${codigo})`,
  );
  return rows[0] ?? null;
}
