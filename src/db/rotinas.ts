import { sql } from "drizzle-orm";
import { getAppDatabase } from "./client";

// Scheduled routines (RF012, RF040, RF069) run as app_runtime WITHOUT identity: RLS shows them
// no rows, so they only act through SECURITY DEFINER functions of drizzle/sql that write
// notifications. This is the only call into the pool outside withUser, and it reaches nothing
// else; the route that calls it checks CRON_SECRET (src/app/api/cron/diaria/route.ts).

export type ResultadoRotina = Record<string, number>;

export async function executarRotinaDiaria(): Promise<ResultadoRotina> {
  const { rows } = await getAppDatabase().execute<{ resultado: ResultadoRotina }>(sql`select app.rotina_diaria() as resultado`);
  return rows[0].resultado;
}
