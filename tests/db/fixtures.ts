import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import type { Identity } from "@/lib/identity";
import { hashPassword } from "@/lib/password";

// Fixtures are written as the migrator (table owner), which RLS does not filter.
// Every fixture uses unique values, so tests never need to clean tables and the
// append-only audit trail stays intact.

let ownerPool: Pool | undefined;

function ownerDatabase() {
  ownerPool ??= new Pool({ connectionString: process.env.DATABASE_MIGRATION_URL, max: 2 });
  return drizzle({ client: ownerPool, schema });
}

export async function closeOwnerDatabase() {
  await ownerPool?.end();
  ownerPool = undefined;
}

export function owner() {
  return ownerDatabase();
}

/** Tests stand in for src/lib/session.ts, the only production producer of Identity. */
export function identityOf(userId: string): Identity {
  return { userId } as Identity;
}

function suffix() {
  return randomUUID().slice(0, 8);
}

type Perfil = (typeof schema.perfil.enumValues)[number];

export async function createUsuario(options: { situacao?: "ATIVO" | "INATIVO"; senha?: string } = {}) {
  const id = suffix();
  const [row] = await ownerDatabase()
    .insert(schema.usuario)
    .values({ nome: `Usuario ${id}`, email: `usuario-${id}@teste.local`, situacao: options.situacao ?? "ATIVO" })
    .returning();

  if (options.senha) {
    await ownerDatabase()
      .insert(schema.conta)
      .values({
        usuarioId: row.id,
        provedorId: "credential",
        contaId: row.id,
        senhaHash: await hashPassword(options.senha),
      });
  }

  return row;
}

export async function createCurso() {
  const id = suffix();
  const [row] = await ownerDatabase()
    .insert(schema.curso)
    .values({
      codigo: `CURSO-${id}`,
      nome: `Curso ${id}`,
      cargaMinimaEstagioMinutos: 400 * 60,
      cargaAtividadesComplementaresMinutos: 200 * 60,
    })
    .returning();
  return row;
}

export async function grantPerfil(
  usuarioId: string,
  perfil: Perfil,
  options: { cursoId?: string; vigenciaInicio?: Date; vigenciaFim?: Date } = {},
) {
  const [row] = await ownerDatabase()
    .insert(schema.vinculoPerfil)
    .values({ usuarioId, perfil, ...options })
    .returning();
  return row;
}

export async function createEstudante(usuarioId: string, cursoId: string) {
  const [row] = await ownerDatabase()
    .insert(schema.estudante)
    .values({ usuarioId, cursoId, matricula: `M-${suffix()}`, periodo: 3 })
    .returning();
  return row;
}

/**
 * Two courses with one student each, a coordinator of course A, an administrator and a
 * user without any profile: the smallest world where each RLS branch can be observed.
 */
export async function createAccessScenario() {
  const cursoA = await createCurso();
  const cursoB = await createCurso();

  const alunoA = await createUsuario();
  const alunoB = await createUsuario();
  const estudanteA = await createEstudante(alunoA.id, cursoA.id);
  const estudanteB = await createEstudante(alunoB.id, cursoB.id);
  await grantPerfil(alunoA.id, "ESTUDANTE");
  await grantPerfil(alunoB.id, "ESTUDANTE");

  const coordenadorA = await createUsuario();
  await grantPerfil(coordenadorA.id, "COORDENACAO", { cursoId: cursoA.id });

  const administrador = await createUsuario();
  await grantPerfil(administrador.id, "ADMINISTRADOR");

  const semPerfil = await createUsuario();

  return { cursoA, cursoB, alunoA, alunoB, estudanteA, estudanteB, coordenadorA, administrador, semPerfil };
}
