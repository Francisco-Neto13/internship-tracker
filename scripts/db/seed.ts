import { and, eq, isNull, sql } from "drizzle-orm";
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

// RF042: institutional criteria, each on a 1 to 5 scale
const CRITERIOS = [
  ["ASSIDUIDADE", "Assiduidade e pontualidade"],
  ["RESPONSABILIDADE", "Responsabilidade e cumprimento de prazos"],
  ["CONHECIMENTO_TECNICO", "Conhecimento técnico aplicado às atividades"],
  ["RELACIONAMENTO", "Relacionamento com a equipe"],
  ["INICIATIVA", "Iniciativa e autonomia"],
] as const;

async function upsertCriterios() {
  for (const [ordem, [codigo, descricao]] of CRITERIOS.entries()) {
    await db
      .insert(schema.criterioAvaliacao)
      .values({ codigo, descricao, escalaMinima: 1, escalaMaxima: 5, ordem: ordem + 1 })
      .onConflictDoNothing({ target: schema.criterioAvaliacao.codigo });
  }
}

/**
 * Fase 3 manual tests: an ATIVO internship for Ana since 2026-08-03, formalized the way the
 * triggers require (closed TCE, approved plan, responsible people, insurance, three
 * signatures), with the reports generated on activation, an entry per business day of August
 * and the first two weeks homologated by the supervisor. Skipped if Ana already has one.
 */
async function upsertEstagioAtivo(ids: {
  estudanteId: string;
  alunoId: string;
  cursoId: string;
  concedenteId: string;
  coordenacaoId: string;
  orientadorId: string;
  supervisorId: string;
  representanteId: string;
}) {
  const [existente] = await db.select({ id: schema.estagio.id }).from(schema.estagio).where(eq(schema.estagio.estudanteId, ids.estudanteId));
  if (existente) return;
  const [convenio] = await db.select().from(schema.convenio).where(eq(schema.convenio.numero, "CV-2026-0001"));
  const hashTce = "b".repeat(64);
  await db.transaction(async (tx) => {
    const [estagio] = await tx
      .insert(schema.estagio)
      .values({
        estudanteId: ids.estudanteId,
        cursoId: ids.cursoId,
        concedenteId: ids.concedenteId,
        convenioId: convenio.id,
        tipo: "OBRIGATORIO",
        dataInicio: "2026-08-03",
        dataFimPactuada: "2027-07-30",
        dataFimPrevista: "2027-07-30",
        cargaDiariaMinutos: 360,
        cargaSemanalMinutos: 1800,
        cargaTotalMinutos: 400 * 60,
        condicoesPactuadas: "Desenvolvimento de software sob supervisão, 6 h por dia",
        hashTce,
        tceFechadoEm: new Date("2026-07-20T12:00:00Z"),
        criadoPorUsuarioId: ids.coordenacaoId,
      })
      .returning();
    await tx.insert(schema.planoAtividades).values({
      estagioId: estagio.id,
      versao: 1,
      atividadesPrevistas: "Manutenção de sistemas web e testes automatizados",
      justificativaCompatibilidade: "Componentes curriculares de engenharia de software",
      situacao: "APROVADO",
      decididoPorUsuarioId: ids.orientadorId,
      decididoEm: new Date("2026-07-21T12:00:00Z"),
      elaboradoPorUsuarioId: ids.alunoId,
    });
    await tx.insert(schema.responsavelEstagio).values([
      { estagioId: estagio.id, papel: "ORIENTADOR", usuarioId: ids.orientadorId, vigenciaInicio: "2026-08-03", decididoPorUsuarioId: ids.coordenacaoId },
      { estagioId: estagio.id, papel: "SUPERVISOR", usuarioId: ids.supervisorId, vigenciaInicio: "2026-08-03", decididoPorUsuarioId: ids.coordenacaoId },
    ]);
    await tx.insert(schema.apoliceSeguro).values({
      estagioId: estagio.id,
      seguradora: "Seguradora Exemplo",
      numeroApolice: "AP-SEED-1",
      contratante: "CONCEDENTE",
      vigenciaInicio: "2026-08-01",
      vigenciaFim: "2027-12-31",
      registradoPorUsuarioId: ids.representanteId,
    });
    await tx.insert(schema.assinatura).values([
      { estagioId: estagio.id, parte: "ESTUDANTE", signatarioUsuarioId: ids.alunoId, signatarioNome: "Ana Estudante", signatarioPerfil: "ESTUDANTE", hashDocumento: hashTce },
      { estagioId: estagio.id, parte: "INSTITUICAO", signatarioUsuarioId: ids.coordenacaoId, signatarioNome: "Coordenação de Software", signatarioPerfil: "COORDENACAO", hashDocumento: hashTce },
      { estagioId: estagio.id, parte: "CONCEDENTE", signatarioUsuarioId: ids.representanteId, signatarioNome: "Carla Representante", signatarioPerfil: "CONCEDENTE", hashDocumento: hashTce },
    ]);
    // Activation through the same transition the service makes: the trigger generates the reports
    await tx.update(schema.estagio).set({ situacao: "ATIVO", ativadoEm: new Date("2026-07-31T12:00:00Z") }).where(eq(schema.estagio.id, estagio.id));

    await tx.execute(sql`
      insert into public.registro_frequencia (estagio_id, data, hora_entrada, hora_saida, intervalo_minutos, duracao_minutos,
                                              registrado_por_usuario_id, limite_diario_aplicado_minutos, limite_semanal_aplicado_minutos)
      select ${estagio.id}::uuid, d::date, '13:00', '19:00', 0, 360, ${ids.alunoId}::uuid, 1, 1
      from generate_series('2026-08-03'::date, '2026-08-31'::date, interval '1 day') d
      where extract(isodow from d) < 6
    `);
    const [homologacao] = await tx
      .insert(schema.homologacaoFrequencia)
      .values({
        estagioId: estagio.id,
        periodoInicio: "2026-08-03",
        periodoFim: "2026-08-14",
        minutosHomologados: 10 * 360,
        observacao: "Conferido com o controle de ponto",
        homologadoPorUsuarioId: ids.supervisorId,
      })
      .returning();
    await tx.execute(sql`
      update public.registro_frequencia set situacao = 'HOMOLOGADO', homologacao_id = ${homologacao.id}::uuid
      where estagio_id = ${estagio.id}::uuid and data between '2026-08-03' and '2026-08-14'
    `);
  });
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

  await upsertCriterios();
  const [estudanteAna] = await db.select().from(schema.estudante).where(eq(schema.estudante.usuarioId, ana.id));
  await upsertEstagioAtivo({
    estudanteId: estudanteAna.id,
    alunoId: ana.id,
    cursoId: software.id,
    concedenteId: concedente.id,
    coordenacaoId: coordenacao.id,
    orientadorId: orientador.id,
    supervisorId: supervisor.id,
    representanteId: representante.id,
  });

  console.log(`Seeded users (password "${SEED_PASSWORD}"):`);
  console.log("  admin@internship.local                 ADMINISTRADOR");
  console.log("  coordenacao.software@internship.local  COORDENACAO (Engenharia de Software)");
  console.log("  ana.estudante@internship.local         ESTUDANTE (Engenharia de Software)");
  console.log("  bruno.estudante@internship.local       ESTUDANTE (Administracao)");
  console.log("  orientador@internship.local            PROFESSOR_ORIENTADOR");
  console.log("  rh@exemplo-software.local              CONCEDENTE (Exemplo Software, convênio CV-2026-0001)");
  console.log("  supervisor@exemplo-software.local      SUPERVISOR (Exemplo Software)");
  console.log("Ana has an ATIVO internship since 2026-08-03 with August entries (first two weeks homologated).");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
