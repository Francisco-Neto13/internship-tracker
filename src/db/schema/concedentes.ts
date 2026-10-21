import { sql } from "drizzle-orm";
import { boolean, check, date, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { usuario } from "./acesso";
import { documento } from "./documentos";

const criadoEm = () => timestamp("criado_em", { withTimezone: true }).notNull().defaultNow();
const atualizadoEm = () => timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow();

export const situacaoConcedente = pgEnum("situacao_concedente", ["ATIVA", "SUSPENSA"]);

// RF013, RN-03: classification values kept by the administrator; deactivated, never deleted
export const porteConcedente = pgTable(
  "porte_concedente",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [uniqueIndex("porte_concedente_nome_unique").on(sql`lower(${t.nome})`)],
);

export const setorAtuacao = pgTable(
  "setor_atuacao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [uniqueIndex("setor_atuacao_nome_unique").on(sql`lower(${t.nome})`)],
);

// RF007, RF008, RN-01: host organization. situacao changes only together with a row in
// historico_situacao_concedente (trigger app.validar_alteracao_concedente)
export const concedente = pgTable(
  "concedente",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    razaoSocial: text("razao_social").notNull(),
    nomeFantasia: text("nome_fantasia"),
    cnpj: text("cnpj").notNull().unique(),
    logradouro: text("logradouro").notNull(),
    numeroEndereco: text("numero_endereco").notNull(),
    complemento: text("complemento"),
    bairro: text("bairro").notNull(),
    municipio: text("municipio").notNull(),
    uf: text("uf").notNull(),
    cep: text("cep").notNull(),
    emailContato: text("email_contato").notNull(),
    telefoneContato: text("telefone_contato"),
    representanteLegalNome: text("representante_legal_nome").notNull(),
    representanteLegalCargo: text("representante_legal_cargo"),
    areaAtuacao: text("area_atuacao").notNull(),
    porteId: uuid("porte_id").references(() => porteConcedente.id),
    setorAtuacaoId: uuid("setor_atuacao_id").references(() => setorAtuacao.id),
    situacao: situacaoConcedente("situacao").notNull().default("ATIVA"),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    index("concedente_porte_idx").on(t.porteId),
    index("concedente_setor_idx").on(t.setorAtuacaoId),
    index("concedente_situacao_idx").on(t.situacao),
    check("concedente_cnpj_formato", sql`${t.cnpj} ~ '^[0-9A-Z]{12}[0-9]{2}$'`),
    check("concedente_uf_formato", sql`${t.uf} ~ '^[A-Z]{2}$'`),
    check("concedente_cep_formato", sql`${t.cep} ~ '^[0-9]{8}$'`),
  ],
);

// RF008, RN-31: every change of situation, with reason and author; immutable
export const historicoSituacaoConcedente = pgTable(
  "historico_situacao_concedente",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    concedenteId: uuid("concedente_id")
      .notNull()
      .references(() => concedente.id),
    situacaoNova: situacaoConcedente("situacao_nova").notNull(),
    motivo: text("motivo"),
    decididoPorUsuarioId: uuid("decidido_por_usuario_id")
      .notNull()
      .references(() => usuario.id),
    criadoEm: criadoEm(),
  },
  (t) => [
    index("historico_situacao_concedente_idx").on(t.concedenteId, t.criadoEm),
    index("historico_situacao_decidido_por_idx").on(t.decididoPorUsuarioId),
    check("historico_suspensao_exige_motivo", sql`${t.situacaoNova} <> 'SUSPENSA' or ${t.motivo} is not null`),
  ],
);

export const situacaoConvenio = pgEnum("situacao_convenio", ["ATIVO", "ENCERRADO"]);

// RF009, RN-02: agreement with a concedente. Validity is not a column here: every period is
// a row of convenio_vigencia (RF011). ENCERRADO is an early termination.
export const convenio = pgTable(
  "convenio",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    concedenteId: uuid("concedente_id")
      .notNull()
      .references(() => concedente.id),
    numero: text("numero").notNull().unique(),
    observacao: text("observacao"),
    situacao: situacaoConvenio("situacao").notNull().default("ATIVO"),
    motivoEncerramento: text("motivo_encerramento"),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    index("convenio_concedente_idx").on(t.concedenteId),
    check("convenio_encerramento_exige_motivo", sql`${t.situacao} <> 'ENCERRADO' or ${t.motivoEncerramento} is not null`),
  ],
);

// RF009, RF011: each period, inclusive on both ends (RN-02: valid until the last day).
// Periods of the same agreement never overlap (exclusion constraint in migration 0004).
export const convenioVigencia = pgTable(
  "convenio_vigencia",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    convenioId: uuid("convenio_id")
      .notNull()
      .references(() => convenio.id),
    vigenciaInicio: date("vigencia_inicio").notNull(),
    vigenciaFim: date("vigencia_fim").notNull(),
    renovaVigenciaId: uuid("renova_vigencia_id").unique(),
    documentoId: uuid("documento_id")
      .notNull()
      .references(() => documento.id),
    registradoPorUsuarioId: uuid("registrado_por_usuario_id")
      .notNull()
      .references(() => usuario.id),
    criadoEm: criadoEm(),
  },
  (t) => [
    index("convenio_vigencia_fim_idx").on(t.convenioId, t.vigenciaFim),
    index("convenio_vigencia_documento_idx").on(t.documentoId),
    index("convenio_vigencia_registrado_por_idx").on(t.registradoPorUsuarioId),
    check("convenio_vigencia_periodo_valido", sql`${t.vigenciaFim} >= ${t.vigenciaInicio}`),
  ],
);
