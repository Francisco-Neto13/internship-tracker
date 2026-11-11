import { and, asc, eq, exists, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { contextoAdministrador, usuario, vinculoPerfil } from "@/db/schema";
import { padraoContendo } from "@/db/like";
import type { Transaction } from "@/db/with-user";
import { vinculoVigente } from "./vinculo-perfil-repository";

type Perfil = (typeof vinculoPerfil.perfil.enumValues)[number];

export type ContextoAberto = { id: string; usuarioId: string; nome: string; email: string };

export type ContaParaContexto = { id: string; nome: string; email: string; perfis: Perfil[] };

/**
 * The switch open in this session, if the caller is still an administrator in force and the
 * account is still active (RF003). Losing either ends what the screen shows at the next request.
 */
export async function findContextoAberto(tx: Transaction, sessaoId: string): Promise<ContextoAberto | null> {
  const [row] = await tx
    .select({ id: contextoAdministrador.id, usuarioId: usuario.id, nome: usuario.nome, email: usuario.email })
    .from(contextoAdministrador)
    .innerJoin(usuario, eq(usuario.id, contextoAdministrador.usuarioId))
    .where(
      and(
        eq(contextoAdministrador.sessaoId, sessaoId),
        isNull(contextoAdministrador.encerradoEm),
        eq(usuario.situacao, "ATIVO"),
        sql`app.tem_perfil_vigente('ADMINISTRADOR')`,
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertContexto(tx: Transaction, dados: { administradorId: string; usuarioId: string; sessaoId: string }) {
  const [row] = await tx.insert(contextoAdministrador).values(dados).returning({ id: contextoAdministrador.id });
  return row;
}

/** The trigger stamps the instant; the value sent only marks the column as changed. */
export async function encerrarContextos(tx: Transaction, sessaoId: string): Promise<number> {
  const rows = await tx
    .update(contextoAdministrador)
    .set({ encerradoEm: sql`now()` })
    .where(and(eq(contextoAdministrador.sessaoId, sessaoId), isNull(contextoAdministrador.encerradoEm)))
    .returning({ id: contextoAdministrador.id });
  return rows.length;
}

/** Active accounts other than the caller's, with their profiles in force, to view the system as. */
export async function findContasParaContexto(
  tx: Transaction,
  filtros: { administradorId: string; busca?: string; perfil?: Perfil; limite: number },
): Promise<ContaParaContexto[]> {
  const perfis = sql<Perfil[]>`coalesce(array_agg(distinct ${vinculoPerfil.perfil} order by ${vinculoPerfil.perfil}) filter (where ${vinculoPerfil.id} is not null), '{}')::text[]`;
  const busca = filtros.busca?.trim();
  const rows = await tx
    .select({ id: usuario.id, nome: usuario.nome, email: usuario.email, perfis })
    .from(usuario)
    .leftJoin(vinculoPerfil, and(eq(vinculoPerfil.usuarioId, usuario.id), vinculoVigente()))
    .where(
      and(
        eq(usuario.situacao, "ATIVO"),
        ne(usuario.id, filtros.administradorId),
        busca ? or(ilike(usuario.nome, padraoContendo(busca)), ilike(usuario.email, padraoContendo(busca))) : undefined,
        filtros.perfil
          ? exists(
              tx
                .select({ um: sql`1` })
                .from(vinculoPerfil)
                .where(and(eq(vinculoPerfil.usuarioId, usuario.id), eq(vinculoPerfil.perfil, filtros.perfil), vinculoVigente())),
            )
          : undefined,
      ),
    )
    .groupBy(usuario.id)
    .orderBy(asc(usuario.nome), asc(usuario.email))
    .limit(filtros.limite);
  return rows;
}
