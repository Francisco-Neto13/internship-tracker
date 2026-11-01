import { asc, desc, eq, sql } from "drizzle-orm";
import { apuracaoCategoria, apuracaoIntegralizacao, categoriaAtividade } from "@/db/schema";
import type { Transaction } from "@/db/with-user";
import type { Apuracao } from "../domain/progresso";

// Assessments of integralization (RF056, RF057). Written only by app.apurar_integralizacao;
// read under RLS (the student and the coordination of its course).

export type ApuracaoRow = typeof apuracaoIntegralizacao.$inferSelect;
export type CategoriaApuradaRow = { categoriaId: string; categoriaNome: string | null; limiteMinutos: number; aproveitadoMinutos: number };

export async function estudanteVisivel(tx: Transaction, estudanteId: string): Promise<boolean> {
  const { rows } = await tx.execute<{ visivel: boolean }>(sql`select ${estudanteId}::uuid in (select app.estudantes_legiveis()) as visivel`);
  return rows[0]?.visivel === true;
}

export async function estudanteAtualId(tx: Transaction): Promise<string | null> {
  const { rows } = await tx.execute<{ id: string | null }>(sql`select app.estudante_atual_id() as id`);
  return rows[0]?.id ?? null;
}

export async function findApuracaoVigente(tx: Transaction, estudanteId: string): Promise<{ apuracao: ApuracaoRow; categorias: CategoriaApuradaRow[] } | undefined> {
  const [apuracao] = await tx
    .select()
    .from(apuracaoIntegralizacao)
    .where(eq(apuracaoIntegralizacao.estudanteId, estudanteId))
    .orderBy(desc(apuracaoIntegralizacao.criadoEm), desc(apuracaoIntegralizacao.id))
    .limit(1);
  if (!apuracao) return undefined;
  const categorias = await tx
    .select({
      categoriaId: apuracaoCategoria.categoriaId,
      categoriaNome: categoriaAtividade.nome,
      limiteMinutos: apuracaoCategoria.limiteMinutos,
      aproveitadoMinutos: apuracaoCategoria.aproveitadoMinutos,
    })
    .from(apuracaoCategoria)
    .leftJoin(categoriaAtividade, eq(categoriaAtividade.id, apuracaoCategoria.categoriaId))
    .where(eq(apuracaoCategoria.apuracaoId, apuracao.id))
    .orderBy(asc(categoriaAtividade.nome));
  return { apuracao, categorias };
}

export async function countApuracoes(tx: Transaction, estudanteId: string): Promise<number> {
  const [row] = await tx.select({ total: sql<string>`count(*)` }).from(apuracaoIntegralizacao).where(eq(apuracaoIntegralizacao.estudanteId, estudanteId));
  return Number(row.total);
}

type CalculoSql = {
  curso_id: string;
  estagio_exigido: number;
  estagio_concluido: number;
  atividades_exigido: number;
  atividades_aproveitado: number;
  categorias: { categoria_id: string; limite: number; aproveitado: number }[];
};

/** The same calculation the stored assessments come from, without writing (RF057 "a qualquer momento"). */
export async function calcular(tx: Transaction, estudanteId: string): Promise<(Apuracao & { cursoId: string }) | null> {
  const { rows } = await tx.execute<{ calculo: CalculoSql | null }>(sql`select app.calcular_integralizacao(${estudanteId}::uuid) as calculo`);
  const calculo = rows[0]?.calculo;
  if (!calculo) return null;
  return {
    cursoId: calculo.curso_id,
    estagioExigidoMinutos: calculo.estagio_exigido,
    estagioConcluidoMinutos: calculo.estagio_concluido,
    atividadesExigidoMinutos: calculo.atividades_exigido,
    atividadesAproveitadoMinutos: calculo.atividades_aproveitado,
    categorias: calculo.categorias.map((categoria) => ({ categoriaId: categoria.categoria_id, limiteMinutos: categoria.limite, aproveitadoMinutos: categoria.aproveitado })),
  };
}

export async function apurar(tx: Transaction, estudanteId: string): Promise<string> {
  const { rows } = await tx.execute<{ id: string }>(sql`select app.apurar_integralizacao(${estudanteId}::uuid, 'MANUAL') as id`);
  return rows[0].id;
}

export async function nomesDasCategorias(tx: Transaction, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const linhas = await tx
    .select({ id: categoriaAtividade.id, nome: categoriaAtividade.nome })
    .from(categoriaAtividade)
    .where(sql`${categoriaAtividade.id} in (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)})`);
  return new Map(linhas.map((linha) => [linha.id, linha.nome]));
}
