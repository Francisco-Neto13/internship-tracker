import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { getAuth } from "@/lib/auth";
import type { Identity } from "@/lib/identity";
import { hashPassword } from "@/lib/password";

/** Signs in through the auth library and returns the session cookie as request headers. */
export async function signIn(email: string, password: string): Promise<Headers> {
  const { headers } = await getAuth().api.signInEmail({ body: { email, password }, returnHeaders: true });
  const cookie = headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

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
  options: { cursoId?: string; concedenteId?: string; vigenciaInicio?: Date; vigenciaFim?: Date } = {},
) {
  const [row] = await ownerDatabase()
    .insert(schema.vinculoPerfil)
    .values({ usuarioId, perfil, ...options })
    .returning();
  return row;
}

/** Valid numeric CNPJ built from a random 12-digit base, so every fixture is unique. */
export function cnpjAleatorio(): string {
  const base = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
  const dv = (corpo: string, pesos: number[]) => {
    const resto = [...corpo].reduce((total, c, i) => total + Number(c) * pesos[i], 0) % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const primeiro = dv(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = dv(base + primeiro, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${base}${primeiro}${segundo}`;
}

export async function createConcedente(options: { situacao?: "ATIVA" | "SUSPENSA" } = {}) {
  const id = suffix();
  const [row] = await ownerDatabase()
    .insert(schema.concedente)
    .values({
      razaoSocial: `Concedente ${id}`,
      cnpj: cnpjAleatorio(),
      logradouro: "Rua Teste",
      numeroEndereco: "100",
      bairro: "Centro",
      municipio: "Maceió",
      uf: "AL",
      cep: "57000000",
      emailContato: `contato-${id}@concedente.local`,
      representanteLegalNome: `Representante ${id}`,
      areaAtuacao: "Tecnologia",
    })
    .returning();
  if (options.situacao === "SUSPENSA") {
    // Same transaction rule the trigger enforces: history first, then the situation
    await ownerDatabase().transaction(async (tx) => {
      const [autor] = await tx.insert(schema.usuario).values({ nome: `Autor ${id}`, email: `autor-${id}@teste.local` }).returning();
      await tx.insert(schema.historicoSituacaoConcedente).values({
        concedenteId: row.id,
        situacaoNova: "SUSPENSA",
        motivo: "fixture",
        decididoPorUsuarioId: autor.id,
      });
      await tx.update(schema.concedente).set({ situacao: "SUSPENSA" }).where(eq(schema.concedente.id, row.id));
    });
    return { ...row, situacao: "SUSPENSA" as const };
  }
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

/**
 * Everything an internship needs, written as the owner: course with coordination, enrolled
 * student, concedente with representative and supervisor, advisor, and an agreement valid
 * from 2026 to 2030 with its document. Each call builds an independent world.
 */
export async function createMundoEstagio() {
  const curso = await createCurso();
  const coordenador = await createUsuario();
  await grantPerfil(coordenador.id, "COORDENACAO", { cursoId: curso.id });

  const aluno = await createUsuario();
  await grantPerfil(aluno.id, "ESTUDANTE");
  const estudante = await createEstudante(aluno.id, curso.id);

  const concedente = await createConcedente();
  const representante = await createUsuario();
  await grantPerfil(representante.id, "CONCEDENTE", { concedenteId: concedente.id });
  const supervisor = await createUsuario();
  await grantPerfil(supervisor.id, "SUPERVISOR", { concedenteId: concedente.id });
  const orientador = await createUsuario();
  await grantPerfil(orientador.id, "PROFESSOR_ORIENTADOR");

  const id = suffix();
  const [documento] = await ownerDatabase()
    .insert(schema.documento)
    .values({
      tipo: "CONVENIO",
      chaveObjeto: `documentos/fixture-${id}.pdf`,
      nomeOriginal: "convenio.pdf",
      tipoMime: "application/pdf",
      tamanhoBytes: 100,
      sha256: "0".repeat(64),
      concedenteId: concedente.id,
      enviadoPorUsuarioId: coordenador.id,
    })
    .returning();
  const [convenio] = await ownerDatabase()
    .insert(schema.convenio)
    .values({ concedenteId: concedente.id, numero: `CV-${id}` })
    .returning();
  await ownerDatabase().insert(schema.convenioVigencia).values({
    convenioId: convenio.id,
    vigenciaInicio: "2026-01-01",
    vigenciaFim: "2030-12-31",
    documentoId: documento.id,
    registradoPorUsuarioId: coordenador.id,
  });

  return { curso, coordenador, aluno, estudante, concedente, representante, supervisor, orientador, convenio };
}

/** A confirmed document of an internship, as if uploaded through /documentos/upload (D8). */
export async function createDocumentoDoEstagio(
  estagioId: string,
  tipo: (typeof schema.tipoDocumento.enumValues)[number],
  enviadoPorUsuarioId: string,
) {
  const id = suffix();
  const [row] = await ownerDatabase()
    .insert(schema.documento)
    .values({
      tipo,
      chaveObjeto: `documentos/fixture-${id}.pdf`,
      nomeOriginal: `${tipo.toLowerCase()}-${id}.pdf`,
      tipoMime: "application/pdf",
      tamanhoBytes: 100,
      sha256: "0".repeat(64),
      sensivel: tipo === "ATESTADO_AFASTAMENTO" || tipo === "DISPENSA_DURACAO",
      estagioId,
      enviadoPorUsuarioId,
    })
    .returning();
  return row;
}
