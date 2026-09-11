import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { curso } from "./academico";

const criadoEm = () => timestamp("criado_em", { withTimezone: true }).notNull().defaultNow();
const atualizadoEm = () => timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow();

export const situacaoUsuario = pgEnum("situacao_usuario", ["ATIVO", "INATIVO"]);

export const perfil = pgEnum("perfil", [
  "ESTUDANTE",
  "PROFESSOR_ORIENTADOR",
  "SUPERVISOR",
  "COORDENACAO",
  "CONCEDENTE",
  "ADMINISTRADOR",
]);

// Identity shared with the auth library (RF001, RF002). Inactivation flips situacao
// and revokes sessions; the row is never deleted (RN-28).
export const usuario = pgTable(
  "usuario",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    // The auth library looks users up by exact email and stores it lowercased
    email: text("email").notNull().unique(),
    emailVerificado: boolean("email_verificado").notNull().default(false),
    imagem: text("imagem"),
    situacao: situacaoUsuario("situacao").notNull().default("ATIVO"),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [check("usuario_email_minusculo", sql`${t.email} = lower(${t.email})`)],
);

// Auth infrastructure below: reachable only by the auth_runtime role, never audited
// because the rows carry session tokens and password hashes.
export const sessao = pgTable(
  "sessao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
    enderecoIp: text("endereco_ip"),
    agenteUsuario: text("agente_usuario"),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [index("sessao_usuario_id_idx").on(t.usuarioId)],
);

export const conta = pgTable(
  "conta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    provedorId: text("provedor_id").notNull(),
    contaId: text("conta_id").notNull(),
    senhaHash: text("senha_hash"),
    tokenAcesso: text("token_acesso"),
    tokenAtualizacao: text("token_atualizacao"),
    tokenId: text("token_id"),
    tokenAcessoExpiraEm: timestamp("token_acesso_expira_em", { withTimezone: true }),
    tokenAtualizacaoExpiraEm: timestamp("token_atualizacao_expira_em", { withTimezone: true }),
    escopo: text("escopo"),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    index("conta_usuario_id_idx").on(t.usuarioId),
    uniqueIndex("conta_provedor_conta_unico").on(t.provedorId, t.contaId),
  ],
);

export const verificacao = pgTable(
  "verificacao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identificador: text("identificador").notNull(),
    valor: text("valor").notNull(),
    expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [index("verificacao_identificador_idx").on(t.identificador)],
);

// Login throttling shared across serverless instances; in-memory counters would reset
// per instance and let brute force through (RF002)
export const limiteRequisicao = pgTable("limite_requisicao", {
  id: uuid("id").primaryKey().defaultRandom(),
  chave: text("chave").notNull().unique(),
  contador: integer("contador").notNull(),
  ultimaRequisicao: bigint("ultima_requisicao", { mode: "number" }).notNull(),
});

// Profile alone does not grant access: RLS intersects profile and link (RN-37).
// Replacing a profile closes vigencia_fim instead of deleting the row.
export const vinculoPerfil = pgTable(
  "vinculo_perfil",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id),
    perfil: perfil("perfil").notNull(),
    cursoId: uuid("curso_id").references(() => curso.id),
    vigenciaInicio: timestamp("vigencia_inicio", { withTimezone: true }).notNull().defaultNow(),
    vigenciaFim: timestamp("vigencia_fim", { withTimezone: true }),
    criadoEm: criadoEm(),
  },
  (t) => [
    index("vinculo_perfil_usuario_perfil_idx").on(t.usuarioId, t.perfil),
    index("vinculo_perfil_curso_id_idx").on(t.cursoId),
    check("vinculo_perfil_coordenacao_exige_curso", sql`${t.perfil} <> 'COORDENACAO' or ${t.cursoId} is not null`),
    check("vinculo_perfil_vigencia_valida", sql`${t.vigenciaFim} is null or ${t.vigenciaFim} > ${t.vigenciaInicio}`),
  ],
);
