import { sql } from "drizzle-orm";
import { bigint, boolean, check, date, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usuario } from "./acesso";
import { estudante } from "./academico";
import { concedente } from "./concedentes";

// Files live in the private bucket; this table keeps metadata, hash and access scope
// (DER-LOGICO §4.9). The enum is complete from the first migration that uses it.
export const tipoDocumento = pgEnum("tipo_documento", [
  "CONVENIO",
  "TCE",
  "ADITIVO",
  "PLANO_ATIVIDADES",
  "ASSINATURA",
  "APOLICE",
  "RELATORIO",
  "COMPROVANTE_ATIVIDADE",
  "ATESTADO_AFASTAMENTO",
  "RESCISAO",
  "DECLARACAO",
  "DISPENSA_DURACAO",
]);

// D8 (DER-LOGICO §9.2): PDF, JPEG or PNG up to 10 MiB, checked by the server on the stored bytes
export const TIPOS_MIME_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png"] as const;
export const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024;

export const documento = pgTable(
  "documento",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tipo: tipoDocumento("tipo").notNull(),
    chaveObjeto: text("chave_objeto").notNull().unique(),
    nomeOriginal: text("nome_original").notNull(),
    tipoMime: text("tipo_mime").notNull(),
    tamanhoBytes: bigint("tamanho_bytes", { mode: "number" }).notNull(),
    sha256: text("sha256").notNull(),
    sensivel: boolean("sensivel").notNull().default(false),
    estudanteId: uuid("estudante_id").references(() => estudante.id),
    // estagio_id arrives with the estagio table (migration 0005), FK added there
    estagioId: uuid("estagio_id"),
    concedenteId: uuid("concedente_id").references(() => concedente.id),
    dataLiberacaoGuarda: date("data_liberacao_guarda"),
    eliminadoEm: timestamp("eliminado_em", { withTimezone: true }),
    eliminadoPorUsuarioId: uuid("eliminado_por_usuario_id").references(() => usuario.id),
    enviadoPorUsuarioId: uuid("enviado_por_usuario_id")
      .notNull()
      .references(() => usuario.id),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("documento_estudante_idx").on(t.estudanteId),
    index("documento_estagio_idx").on(t.estagioId),
    index("documento_concedente_idx").on(t.concedenteId),
    index("documento_sha256_idx").on(t.sha256),
    index("documento_guarda_idx").on(t.dataLiberacaoGuarda).where(sql`${t.eliminadoEm} is null`),
    index("documento_enviado_por_idx").on(t.enviadoPorUsuarioId),
    index("documento_eliminado_por_idx").on(t.eliminadoPorUsuarioId),
    check("documento_tipo_mime_permitido", sql`${t.tipoMime} in ('application/pdf', 'image/jpeg', 'image/png')`),
    check("documento_tamanho_valido", sql`${t.tamanhoBytes} > 0 and ${t.tamanhoBytes} <= 10485760`),
    check("documento_sha256_formato", sql`${t.sha256} ~ '^[0-9a-f]{64}$'`),
    check("documento_atestado_sensivel", sql`${t.tipo} not in ('ATESTADO_AFASTAMENTO', 'DISPENSA_DURACAO') or ${t.sensivel}`),
    check("documento_escopo_definido", sql`num_nonnulls(${t.estudanteId}, ${t.estagioId}, ${t.concedenteId}) >= 1`),
    check("documento_eliminacao_consistente", sql`(${t.eliminadoEm} is null) = (${t.eliminadoPorUsuarioId} is null)`),
  ],
);

