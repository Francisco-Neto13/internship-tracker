import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../src/db/schema";
import { hashPassword } from "../../src/lib/password";

// Development and e2e data. Runs as the migrator (table owner), so RLS does not filter it
// and the audit trail records it with no author. Safe to run more than once.

// Also hardcoded in e2e/login.spec.ts, which cannot import this script without running it
const SEED_PASSWORD = "senha-dev-internship";

const connectionString = process.env.DATABASE_MIGRATION_URL;
if (!connectionString) {
  console.error("DATABASE_MIGRATION_URL is not set (see .env.example)");
  process.exit(1);
}

const host = new URL(connectionString).hostname;
if (!["localhost", "127.0.0.1", "postgres"].includes(host) && process.env.SEED_ALLOW_REMOTE !== "1") {
  console.error(`Refusing to seed ${host}: known passwords must never reach a shared database`);
  process.exit(1);
}

const pool = new Pool({ connectionString });
const db = drizzle({ client: pool, schema });

async function upsertCurso(codigo: string, nome: string) {
  await db
    .insert(schema.curso)
    .values({ codigo, nome, cargaMinimaEstagioMinutos: 400 * 60, cargaAtividadesComplementaresMinutos: 200 * 60 })
    .onConflictDoNothing({ target: schema.curso.codigo });
  const [row] = await db.select().from(schema.curso).where(eq(schema.curso.codigo, codigo));
  return row;
}

async function upsertUsuario(email: string, nome: string, passwordHash: string) {
  await db.insert(schema.usuario).values({ email, nome }).onConflictDoNothing({ target: schema.usuario.email });
  const [row] = await db.select().from(schema.usuario).where(eq(schema.usuario.email, email));
  await db
    .insert(schema.conta)
    .values({ usuarioId: row.id, provedorId: "credential", contaId: row.id, senhaHash: passwordHash })
    .onConflictDoNothing();
  return row;
}

async function ensurePerfil(
  usuarioId: string,
  perfil: (typeof schema.perfil.enumValues)[number],
  cursoId: string | null = null,
  concedenteId: string | null = null,
) {
  const existing = await db
    .select({ id: schema.vinculoPerfil.id })
    .from(schema.vinculoPerfil)
    .where(
      and(
        eq(schema.vinculoPerfil.usuarioId, usuarioId),
        eq(schema.vinculoPerfil.perfil, perfil),
        isNull(schema.vinculoPerfil.vigenciaFim),
      ),
    );
  if (existing.length === 0) {
    await db.insert(schema.vinculoPerfil).values({ usuarioId, perfil, cursoId, concedenteId });
  }
}

async function upsertEstudante(usuarioId: string, cursoId: string, matricula: string) {
  await db
    .insert(schema.estudante)
    .values({ usuarioId, cursoId, matricula, periodo: 5 })
    .onConflictDoNothing({ target: schema.estudante.matricula });
}

// Fase 2: a concedente with an agreement valid from 2026 to 2030. The agreement document is a
// metadata row only (no object in the bucket): enough to formalize, not to download.
async function upsertConcedenteComConvenio(autorId: string) {
  const cnpj = "11222333000181";
  await db
    .insert(schema.concedente)
    .values({
      razaoSocial: "Empresa Exemplo de Software Ltda",
      nomeFantasia: "Exemplo Software",
      cnpj,
      logradouro: "Av. Fernandes Lima",
      numeroEndereco: "100",
      bairro: "Farol",
      municipio: "Maceió",
      uf: "AL",
      cep: "57050000",
      emailContato: "estagios@exemplo-software.local",
      representanteLegalNome: "Carla Representante",
      areaAtuacao: "Desenvolvimento de software",
    })
    .onConflictDoNothing({ target: schema.concedente.cnpj });
  const [concedente] = await db.select().from(schema.concedente).where(eq(schema.concedente.cnpj, cnpj));

  const numero = "CV-2026-0001";
  const [existente] = await db.select().from(schema.convenio).where(eq(schema.convenio.numero, numero));
  if (!existente) {
    const [documento] = await db
      .insert(schema.documento)
      .values({
        tipo: "CONVENIO",
        chaveObjeto: "documentos/seed-convenio-2026-0001.pdf",
        nomeOriginal: "convenio-2026-0001.pdf",
        tipoMime: "application/pdf",
        tamanhoBytes: 1,
        sha256: "0".repeat(64),
        concedenteId: concedente.id,
        enviadoPorUsuarioId: autorId,
      })
      .returning();
    const [convenio] = await db.insert(schema.convenio).values({ concedenteId: concedente.id, numero }).returning();
    await db.insert(schema.convenioVigencia).values({
      convenioId: convenio.id,
      vigenciaInicio: "2026-01-01",
      vigenciaFim: "2030-12-31",
      documentoId: documento.id,
      registradoPorUsuarioId: autorId,
    });
  }
  return concedente;
}

async function main() {
  const passwordHash = await hashPassword(SEED_PASSWORD);

  const software = await upsertCurso("ENG-SOFT", "Engenharia de Software");
  const administracao = await upsertCurso("ADM", "Administração");

  const admin = await upsertUsuario("admin@internship.local", "Administrador do Sistema", passwordHash);
  await ensurePerfil(admin.id, "ADMINISTRADOR");

  const coordenacao = await upsertUsuario("coordenacao.software@internship.local", "Coordenação de Software", passwordHash);
  await ensurePerfil(coordenacao.id, "COORDENACAO", software.id);

  const ana = await upsertUsuario("ana.estudante@internship.local", "Ana Estudante", passwordHash);
  await ensurePerfil(ana.id, "ESTUDANTE");
  await upsertEstudante(ana.id, software.id, "2026000001");

  const bruno = await upsertUsuario("bruno.estudante@internship.local", "Bruno Estudante", passwordHash);
  await ensurePerfil(bruno.id, "ESTUDANTE");
  await upsertEstudante(bruno.id, administracao.id, "2026000002");

  const concedente = await upsertConcedenteComConvenio(coordenacao.id);
  const representante = await upsertUsuario("rh@exemplo-software.local", "Carla Representante", passwordHash);
  await ensurePerfil(representante.id, "CONCEDENTE", null, concedente.id);
  const supervisor = await upsertUsuario("supervisor@exemplo-software.local", "Sérgio Supervisor", passwordHash);
  await ensurePerfil(supervisor.id, "SUPERVISOR", null, concedente.id);
  const orientador = await upsertUsuario("orientador@internship.local", "Olga Orientadora", passwordHash);
  await ensurePerfil(orientador.id, "PROFESSOR_ORIENTADOR");

  console.log(`Seeded users (password "${SEED_PASSWORD}"):`);
  console.log("  admin@internship.local                 ADMINISTRADOR");
  console.log("  coordenacao.software@internship.local  COORDENACAO (Engenharia de Software)");
  console.log("  ana.estudante@internship.local         ESTUDANTE (Engenharia de Software)");
  console.log("  bruno.estudante@internship.local       ESTUDANTE (Administracao)");
  console.log("  orientador@internship.local            PROFESSOR_ORIENTADOR");
  console.log("  rh@exemplo-software.local              CONCEDENTE (Exemplo Software, convênio CV-2026-0001)");
  console.log("  supervisor@exemplo-software.local      SUPERVISOR (Exemplo Software)");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
