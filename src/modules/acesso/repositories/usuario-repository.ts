import { and, asc, count, eq, exists, ilike, or, sql, type SQL } from "drizzle-orm";
import { usuario, vinculoPerfil } from "@/db/schema";
import { padraoContendo } from "@/db/like";
import type { Transaction } from "@/db/with-user";
import { vinculoVigente } from "./vinculo-perfil-repository";

// No authorization filter here on purpose: RLS decides which rows exist and which writes
// pass for the transaction's identity (RF001, RF003). A WHERE on the caller would hide
// policy bugs.

type Perfil = (typeof vinculoPerfil.perfil.enumValues)[number];
type Situacao = (typeof usuario.situacao.enumValues)[number];

export type UsuarioRow = {
  id: string;
  nome: string;
  email: string;
  situacao: Situacao;
  trocaSenhaObrigatoria: boolean;
  senhaProvisoriaExpiraEm: Date | null;
  criadoEm: Date;
};

const colunas = {
  id: usuario.id,
  nome: usuario.nome,
  email: usuario.email,
  situacao: usuario.situacao,
  trocaSenhaObrigatoria: usuario.trocaSenhaObrigatoria,
  senhaProvisoriaExpiraEm: usuario.senhaProvisoriaExpiraEm,
  criadoEm: usuario.criadoEm,
};

export async function findUsuarios(
  tx: Transaction,
  filter: { perfil?: Perfil; situacao?: Situacao; busca?: string; limit: number; offset: number },
): Promise<{ items: UsuarioRow[]; total: number }> {
  const condicoes: SQL[] = [];
  if (filter.situacao) condicoes.push(eq(usuario.situacao, filter.situacao));
  if (filter.busca) {
    const padrao = padraoContendo(filter.busca);
    condicoes.push(or(ilike(usuario.nome, padrao), ilike(usuario.email, padrao))!);
  }
  if (filter.perfil) {
    condicoes.push(
      exists(
        tx
          .select({ um: sql`1` })
          .from(vinculoPerfil)
          .where(and(eq(vinculoPerfil.usuarioId, usuario.id), eq(vinculoPerfil.perfil, filter.perfil), vinculoVigente())),
      ),
    );
  }
  const where = condicoes.length > 0 ? and(...condicoes) : undefined;

  const items = await tx
    .select(colunas)
    .from(usuario)
    .where(where)
    .orderBy(asc(usuario.nome), asc(usuario.email))
    .limit(filter.limit)
    .offset(filter.offset);
  const [{ total }] = await tx.select({ total: count() }).from(usuario).where(where);

  return { items, total };
}

export async function findUsuarioById(tx: Transaction, id: string): Promise<UsuarioRow | undefined> {
  const [row] = await tx.select(colunas).from(usuario).where(eq(usuario.id, id));
  return row;
}

export async function insertUsuario(
  tx: Transaction,
  values: { nome: string; email: string; trocaSenhaObrigatoria: boolean; senhaProvisoriaExpiraEm: Date | null },
): Promise<UsuarioRow> {
  // Drizzle lists every column of the table with DEFAULT, and PostgreSQL checks the column
  // privilege of each listed column. app_runtime may insert only these four columns
  // (drizzle/sql/policies/acesso.sql), so the statement names only them.
  const { rows } = await tx.execute<{ id: string }>(sql`
    insert into ${usuario} (nome, email, troca_senha_obrigatoria, senha_provisoria_expira_em)
    values (${values.nome}, ${values.email}, ${values.trocaSenhaObrigatoria}, ${values.senhaProvisoriaExpiraEm})
    returning id
  `);
  const row = await findUsuarioById(tx, rows[0].id);
  return row!;
}

/**
 * Updates the user and returns the new row, or undefined when no row matched: the id does
 * not exist, RLS hid it, or `exigirSituacao` did not hold. The service tells these apart.
 */
export async function updateUsuario(
  tx: Transaction,
  id: string,
  values: Partial<Pick<UsuarioRow, "nome" | "email" | "situacao" | "trocaSenhaObrigatoria" | "senhaProvisoriaExpiraEm">>,
  exigirSituacao?: Situacao,
): Promise<UsuarioRow | undefined> {
  const where = exigirSituacao ? and(eq(usuario.id, id), eq(usuario.situacao, exigirSituacao)) : eq(usuario.id, id);
  const [row] = await tx.update(usuario).set(values).where(where).returning(colunas);
  return row;
}

/** RF002: the caller closes their own pending password change (app.concluir_troca_senha). */
export async function concluirTrocaSenha(tx: Transaction): Promise<boolean> {
  const { rows } = await tx.execute<{ concluida: boolean | null }>(sql`select app.concluir_troca_senha() as concluida`);
  return rows[0]?.concluida === true;
}
