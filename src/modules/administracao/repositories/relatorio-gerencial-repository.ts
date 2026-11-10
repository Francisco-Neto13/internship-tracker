import { eq, sql } from "drizzle-orm";
import { concedente, curso } from "@/db/schema";
import type { Transaction } from "@/db/with-user";

// RF067: the management report functions of functions/19_relatorios_gerenciais.sql. Scope is
// decided there (administrator: every course; coordination: its courses; others: nothing).

export type FiltroGerencial = { cursoId: string | null; concedenteId: string | null; de: string | null; ate: string | null };

export type Linha = Record<string, string | number | null>;

const parametros = (filtro: FiltroGerencial) =>
  sql`${filtro.cursoId}::uuid, ${filtro.concedenteId}::uuid, ${filtro.de}::date, ${filtro.ate}::date`;

/** Names of the filtered course and concedente, for the header of the export (catalogs read by all). */
export async function nomesDosFiltros(tx: Transaction, filtro: FiltroGerencial): Promise<{ curso?: string; concedente?: string }> {
  const [cursoFiltrado] = filtro.cursoId ? await tx.select({ nome: curso.nome }).from(curso).where(eq(curso.id, filtro.cursoId)) : [];
  const [concedenteFiltrada] = filtro.concedenteId ? await tx.select({ nome: concedente.razaoSocial }).from(concedente).where(eq(concedente.id, filtro.concedenteId)) : [];
  return { curso: cursoFiltrado?.nome, concedente: concedenteFiltrada?.nome };
}

export async function estagiariosAtivos(tx: Transaction, filtro: FiltroGerencial): Promise<Linha[]> {
  const { rows } = await tx.execute<Linha>(
    sql`select curso_id, curso, concedente_id, concedente, tipo, estagiarios::integer from app.relatorio_estagiarios_ativos(${parametros(filtro)})`,
  );
  return rows;
}

export async function concedentesParceiras(tx: Transaction, filtro: FiltroGerencial): Promise<Linha[]> {
  const { rows } = await tx.execute<Linha>(
    sql`select concedente_id, concedente, situacao, convenios_vigentes::integer, estagios::integer from app.relatorio_concedentes_parceiras(${parametros(filtro)})`,
  );
  return rows;
}

export async function taxaConclusao(tx: Transaction, filtro: FiltroGerencial): Promise<Linha[]> {
  const { rows } = await tx.execute<Linha>(
    sql`select curso_id, curso, concluidos::integer, rescindidos::integer, taxa_conclusao_percentual::float8 from app.relatorio_taxa_conclusao(${parametros(filtro)})`,
  );
  return rows;
}

export async function pendenciasIntegralizacao(tx: Transaction, filtro: FiltroGerencial): Promise<Linha[]> {
  const { rows } = await tx.execute<Linha>(sql`
    select estudante_id, matricula, nome, curso_id, curso, estagio_faltante_minutos, atividades_faltante_minutos, apurado_em::text
    from app.relatorio_pendencias_integralizacao(${filtro.cursoId}::uuid, ${filtro.ate}::date)
  `);
  return rows;
}
