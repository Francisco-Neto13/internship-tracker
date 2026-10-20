import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { usuario } from "./acesso";
import { perfil } from "./enums";
import { curso, estudante } from "./academico";
import { concedente, convenio } from "./concedentes";
import { documento } from "./documentos";

// M04 Gestão de Estágios (DER-LOGICO §4.4). Enums are complete from this first migration.

const criadoEm = () => timestamp("criado_em", { withTimezone: true }).notNull().defaultNow();
const atualizadoEm = () => timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow();

export const tipoEstagio = pgEnum("tipo_estagio", ["OBRIGATORIO", "NAO_OBRIGATORIO"]);
// Requisitos v1.2/v1.3 §8.6 (D9): four states; afastamento and formalization steps are derived
export const situacaoEstagio = pgEnum("situacao_estagio", ["EM_FORMALIZACAO", "ATIVO", "CONCLUIDO", "RESCINDIDO"]);
export const situacaoPlano = pgEnum("situacao_plano", ["RASCUNHO", "AGUARDANDO_APROVACAO", "APROVADO", "DEVOLVIDO", "SUBSTITUIDO"]);
export const parteAssinatura = pgEnum("parte_assinatura", ["ESTUDANTE", "INSTITUICAO", "CONCEDENTE"]);
export const tipoAditivo = pgEnum("tipo_aditivo", ["PRORROGACAO", "SUBSTITUICAO_SUPERVISOR", "ALTERACAO_CARGA_HORARIA"]);
export const situacaoAditivo = pgEnum("situacao_aditivo", ["AGUARDANDO_ASSINATURAS", "VIGENTE", "CANCELADO"]);
export const papelResponsavel = pgEnum("papel_responsavel", ["ORIENTADOR", "SUPERVISOR"]);

// RF015, RN-04, RN-32: the internship and its TCE. The TCE columns hold the version in force
// (TCE plus effective aditivos); previous values live in aditivo.snapshot_anterior (RF021).
export const estagio = pgTable(
  "estagio",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estudanteId: uuid("estudante_id")
      .notNull()
      .references(() => estudante.id),
    // Copied from the student on creation and never changed (DER §8, D7)
    cursoId: uuid("curso_id")
      .notNull()
      .references(() => curso.id),
    concedenteId: uuid("concedente_id")
      .notNull()
      .references(() => concedente.id),
    convenioId: uuid("convenio_id")
      .notNull()
      .references(() => convenio.id),
    tipo: tipoEstagio("tipo").notNull(),
    situacao: situacaoEstagio("situacao").notNull().default("EM_FORMALIZACAO"),
    dataInicio: date("data_inicio").notNull(),
    dataFimPactuada: date("data_fim_pactuada").notNull(),
    dataFimPrevista: date("data_fim_prevista").notNull(),
    cargaDiariaMinutos: integer("carga_diaria_minutos").notNull(),
    cargaSemanalMinutos: integer("carga_semanal_minutos").notNull(),
    cargaTotalMinutos: integer("carga_total_minutos").notNull(),
    condicoesPactuadas: text("condicoes_pactuadas").notNull(),
    bolsaValor: numeric("bolsa_valor", { precision: 12, scale: 2 }),
    auxilioTransporteValor: numeric("auxilio_transporte_valor", { precision: 12, scale: 2 }),
    // Lei 11.788/2008, art. 9º, IV: conservative default
    seguroExigido: boolean("seguro_exigido").notNull().default(true),
    // Set when the TCE is closed for signature (D9); null while the TCE is being edited
    hashTce: text("hash_tce"),
    tceFechadoEm: timestamp("tce_fechado_em", { withTimezone: true }),
    // D9: reason of the last reopening; earlier ones stay in the audit trail
    justificativaReabertura: text("justificativa_reabertura"),
    // D5: Lei 11.788/2008, art. 11 exception, recorded on the internship only
    dispensaDuracaoMaxima: boolean("dispensa_duracao_maxima").notNull().default(false),
    dispensaDocumentoId: uuid("dispensa_documento_id").references((): AnyPgColumn => documento.id),
    documentoTceId: uuid("documento_tce_id").references((): AnyPgColumn => documento.id),
    ativadoEm: timestamp("ativado_em", { withTimezone: true }),
    encerradoEm: timestamp("encerrado_em", { withTimezone: true }),
    criadoPorUsuarioId: uuid("criado_por_usuario_id")
      .notNull()
      .references(() => usuario.id),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    // Closed decision: one ATIVO internship per student (afastamento keeps it ATIVO, D9)
    uniqueIndex("estagio_um_ativo_por_estudante").on(t.estudanteId).where(sql`${t.situacao} = 'ATIVO'`),
    index("estagio_estudante_concedente_idx").on(t.estudanteId, t.concedenteId),
    index("estagio_concedente_idx").on(t.concedenteId),
    index("estagio_curso_situacao_idx").on(t.cursoId, t.situacao),
    index("estagio_convenio_idx").on(t.convenioId),
    index("estagio_situacao_fim_idx").on(t.situacao, t.dataFimPrevista),
    index("estagio_documento_tce_idx").on(t.documentoTceId),
    index("estagio_dispensa_documento_idx").on(t.dispensaDocumentoId),
    index("estagio_criado_por_idx").on(t.criadoPorUsuarioId),
    check("estagio_fim_pactuado_valido", sql`${t.dataFimPactuada} > ${t.dataInicio}`),
    check("estagio_fim_previsto_valido", sql`${t.dataFimPrevista} >= ${t.dataFimPactuada}`),
    check("estagio_carga_diaria_valida", sql`${t.cargaDiariaMinutos} > 0 and ${t.cargaDiariaMinutos} <= 1440`),
    check("estagio_carga_semanal_valida", sql`${t.cargaSemanalMinutos} > 0 and ${t.cargaSemanalMinutos} <= 10080`),
    check("estagio_carga_total_valida", sql`${t.cargaTotalMinutos} > 0`),
    check("estagio_diaria_ate_semanal", sql`${t.cargaDiariaMinutos} <= ${t.cargaSemanalMinutos}`),
    check("estagio_bolsa_nao_negativa", sql`${t.bolsaValor} is null or ${t.bolsaValor} >= 0`),
    check("estagio_auxilio_nao_negativo", sql`${t.auxilioTransporteValor} is null or ${t.auxilioTransporteValor} >= 0`),
    // RN-32, Lei 11.788/2008 art. 12: grant and transport aid are compulsory when non-mandatory
    check(
      "estagio_nao_obrigatorio_exige_bolsa",
      sql`${t.tipo} <> 'NAO_OBRIGATORIO' or (${t.bolsaValor} > 0 and ${t.auxilioTransporteValor} > 0)`,
    ),
    check("estagio_hash_tce_formato", sql`${t.hashTce} is null or ${t.hashTce} ~ '^[0-9a-f]{64}$'`),
    check("estagio_hash_e_fechamento", sql`(${t.hashTce} is null) = (${t.tceFechadoEm} is null)`),
    check("estagio_fora_de_formalizacao_tem_hash", sql`${t.situacao} = 'EM_FORMALIZACAO' or ${t.hashTce} is not null`),
    check("estagio_ativacao_consistente", sql`(${t.situacao} = 'EM_FORMALIZACAO') = (${t.ativadoEm} is null)`),
    check("estagio_encerramento_consistente", sql`(${t.situacao} in ('CONCLUIDO', 'RESCINDIDO')) = (${t.encerradoEm} is not null)`),
    check("estagio_dispensa_com_documento", sql`not ${t.dispensaDuracaoMaxima} or ${t.dispensaDocumentoId} is not null`),
  ],
);

// RF016, RF017, RN-05: versioned activity plan; a new version replaces the approved one
export const planoAtividades = pgTable(
  "plano_atividades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estagioId: uuid("estagio_id")
      .notNull()
      .references(() => estagio.id),
    versao: smallint("versao").notNull(),
    atividadesPrevistas: text("atividades_previstas").notNull(),
    justificativaCompatibilidade: text("justificativa_compatibilidade").notNull(),
    situacao: situacaoPlano("situacao").notNull().default("RASCUNHO"),
    parecer: text("parecer"),
    decididoPorUsuarioId: uuid("decidido_por_usuario_id").references(() => usuario.id),
    decididoEm: timestamp("decidido_em", { withTimezone: true }),
    documentoId: uuid("documento_id").references((): AnyPgColumn => documento.id),
    elaboradoPorUsuarioId: uuid("elaborado_por_usuario_id")
      .notNull()
      .references(() => usuario.id),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    uniqueIndex("plano_estagio_versao_unique").on(t.estagioId, t.versao),
    uniqueIndex("plano_uma_versao_em_elaboracao")
      .on(t.estagioId)
      .where(sql`${t.situacao} in ('RASCUNHO', 'AGUARDANDO_APROVACAO')`),
    uniqueIndex("plano_um_aprovado").on(t.estagioId).where(sql`${t.situacao} = 'APROVADO'`),
    index("plano_decidido_por_idx").on(t.decididoPorUsuarioId),
    index("plano_elaborado_por_idx").on(t.elaboradoPorUsuarioId),
    index("plano_documento_idx").on(t.documentoId),
    check("plano_versao_positiva", sql`${t.versao} >= 1`),
    check("plano_devolucao_com_parecer", sql`${t.situacao} <> 'DEVOLVIDO' or ${t.parecer} is not null`),
    check(
      "plano_decisao_consistente",
      sql`(${t.situacao} in ('RASCUNHO', 'AGUARDANDO_APROVACAO')) = (${t.decididoEm} is null) and (${t.decididoEm} is null) = (${t.decididoPorUsuarioId} is null)`,
    ),
  ],
);

// RF020, RF021, RF061, RN-06: formal amendment, effective with the three signatures
export const aditivo = pgTable(
  "aditivo",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estagioId: uuid("estagio_id")
      .notNull()
      .references(() => estagio.id),
    numero: smallint("numero").notNull(),
    tipo: tipoAditivo("tipo").notNull(),
    justificativa: text("justificativa").notNull(),
    situacao: situacaoAditivo("situacao").notNull().default("AGUARDANDO_ASSINATURAS"),
    snapshotAnterior: jsonb("snapshot_anterior").notNull(),
    novaDataFimPactuada: date("nova_data_fim_pactuada"),
    novaCargaDiariaMinutos: integer("nova_carga_diaria_minutos"),
    novaCargaSemanalMinutos: integer("nova_carga_semanal_minutos"),
    novaCargaTotalMinutos: integer("nova_carga_total_minutos"),
    novoSupervisorUsuarioId: uuid("novo_supervisor_usuario_id").references(() => usuario.id),
    hashConteudo: text("hash_conteudo").notNull(),
    documentoId: uuid("documento_id").references((): AnyPgColumn => documento.id),
    efetivadoEm: timestamp("efetivado_em", { withTimezone: true }),
    motivoCancelamento: text("motivo_cancelamento"),
    criadoPorUsuarioId: uuid("criado_por_usuario_id")
      .notNull()
      .references(() => usuario.id),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    uniqueIndex("aditivo_estagio_numero_unique").on(t.estagioId, t.numero),
    // One pending amendment at a time: two pending ones would carry stale snapshots
    uniqueIndex("aditivo_um_pendente").on(t.estagioId).where(sql`${t.situacao} = 'AGUARDANDO_ASSINATURAS'`),
    index("aditivo_novo_supervisor_idx").on(t.novoSupervisorUsuarioId),
    index("aditivo_documento_idx").on(t.documentoId),
    index("aditivo_criado_por_idx").on(t.criadoPorUsuarioId),
    check("aditivo_numero_positivo", sql`${t.numero} >= 1`),
    check("aditivo_snapshot_objeto", sql`jsonb_typeof(${t.snapshotAnterior}) = 'object'`),
    check("aditivo_hash_formato", sql`${t.hashConteudo} ~ '^[0-9a-f]{64}$'`),
    check("aditivo_prorrogacao", sql`(${t.tipo} = 'PRORROGACAO') = (${t.novaDataFimPactuada} is not null)`),
    check(
      "aditivo_alteracao_carga",
      sql`(${t.tipo} = 'ALTERACAO_CARGA_HORARIA') = (num_nonnulls(${t.novaCargaDiariaMinutos}, ${t.novaCargaSemanalMinutos}, ${t.novaCargaTotalMinutos}) > 0)`,
    ),
    check("aditivo_cargas_validas", sql`(${t.novaCargaDiariaMinutos} is null or ${t.novaCargaDiariaMinutos} between 1 and 1440) and (${t.novaCargaSemanalMinutos} is null or ${t.novaCargaSemanalMinutos} between 1 and 10080) and (${t.novaCargaTotalMinutos} is null or ${t.novaCargaTotalMinutos} > 0)`),
    check("aditivo_substituicao_supervisor", sql`(${t.tipo} = 'SUBSTITUICAO_SUPERVISOR') = (${t.novoSupervisorUsuarioId} is not null)`),
    check("aditivo_efetivacao_consistente", sql`(${t.situacao} = 'VIGENTE') = (${t.efetivadoEm} is not null)`),
    check("aditivo_cancelamento_com_motivo", sql`${t.situacao} <> 'CANCELADO' or ${t.motivoCancelamento} is not null`),
  ],
);

// RF019, RN-04, RN-28: signature recorded in the system, over a frozen hash (no ICP-Brasil)
export const assinatura = pgTable(
  "assinatura",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estagioId: uuid("estagio_id")
      .notNull()
      .references(() => estagio.id),
    aditivoId: uuid("aditivo_id").references(() => aditivo.id),
    parte: parteAssinatura("parte").notNull(),
    signatarioUsuarioId: uuid("signatario_usuario_id")
      .notNull()
      .references(() => usuario.id),
    signatarioNome: text("signatario_nome").notNull(),
    signatarioPerfil: perfil("signatario_perfil").notNull(),
    hashDocumento: text("hash_documento").notNull(),
    documentoId: uuid("documento_id").references((): AnyPgColumn => documento.id),
    enderecoIp: text("endereco_ip"),
    criadoEm: criadoEm(),
  },
  (t) => [
    // One signature per party and per hash: reopening the TCE changes the hash, so the parties
    // sign again without deleting the old signatures (D9)
    uniqueIndex("assinatura_tce_parte_hash_unique").on(t.estagioId, t.parte, t.hashDocumento).where(sql`${t.aditivoId} is null`),
    uniqueIndex("assinatura_aditivo_parte_unique").on(t.aditivoId, t.parte).where(sql`${t.aditivoId} is not null`),
    index("assinatura_estagio_idx").on(t.estagioId),
    index("assinatura_signatario_idx").on(t.signatarioUsuarioId),
    index("assinatura_documento_idx").on(t.documentoId),
    check("assinatura_hash_formato", sql`${t.hashDocumento} ~ '^[0-9a-f]{64}$'`),
    check(
      "assinatura_parte_perfil",
      sql`(${t.parte} = 'ESTUDANTE' and ${t.signatarioPerfil} = 'ESTUDANTE') or (${t.parte} = 'INSTITUICAO' and ${t.signatarioPerfil} = 'COORDENACAO') or (${t.parte} = 'CONCEDENTE' and ${t.signatarioPerfil} = 'CONCEDENTE')`,
    ),
  ],
);

// RF018, RN-33: accident insurance; renewal or correction is a new row
export const apoliceSeguro = pgTable(
  "apolice_seguro",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estagioId: uuid("estagio_id")
      .notNull()
      .references(() => estagio.id),
    seguradora: text("seguradora").notNull(),
    numeroApolice: text("numero_apolice").notNull(),
    contratante: text("contratante").notNull(),
    vigenciaInicio: date("vigencia_inicio").notNull(),
    vigenciaFim: date("vigencia_fim").notNull(),
    substituiApoliceId: uuid("substitui_apolice_id").unique(),
    documentoId: uuid("documento_id").references((): AnyPgColumn => documento.id),
    registradoPorUsuarioId: uuid("registrado_por_usuario_id")
      .notNull()
      .references(() => usuario.id),
    criadoEm: criadoEm(),
  },
  (t) => [
    index("apolice_estagio_fim_idx").on(t.estagioId, t.vigenciaFim),
    index("apolice_documento_idx").on(t.documentoId),
    index("apolice_registrado_por_idx").on(t.registradoPorUsuarioId),
    check("apolice_periodo_valido", sql`${t.vigenciaFim} >= ${t.vigenciaInicio}`),
    // RF018: "parte contratante (concedente ou instituição de ensino)"
    check("apolice_contratante_valido", sql`${t.contratante} in ('CONCEDENTE', 'INSTITUICAO')`),
  ],
);

// RF031, RF034, RN-10, RN-12: who supervises and who advises, with history by period
export const responsavelEstagio = pgTable(
  "responsavel_estagio",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estagioId: uuid("estagio_id")
      .notNull()
      .references(() => estagio.id),
    papel: papelResponsavel("papel").notNull(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id),
    vigenciaInicio: date("vigencia_inicio").notNull(),
    vigenciaFim: date("vigencia_fim"),
    substituiResponsavelId: uuid("substitui_responsavel_id").unique(),
    motivoSubstituicao: text("motivo_substituicao"),
    decididoPorUsuarioId: uuid("decidido_por_usuario_id")
      .notNull()
      .references(() => usuario.id),
    aditivoId: uuid("aditivo_id").references(() => aditivo.id),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    index("responsavel_estagio_fim_idx").on(t.estagioId, t.vigenciaFim),
    index("responsavel_usuario_estagio_idx").on(t.usuarioId, t.estagioId, t.vigenciaFim),
    index("responsavel_decidido_por_idx").on(t.decididoPorUsuarioId),
    index("responsavel_aditivo_idx").on(t.aditivoId),
    // fim = inicio is an empty period [inicio, inicio): a designation annulled before it
    // started, during formalization (kept, never deleted)
    check("responsavel_vigencia_valida", sql`${t.vigenciaFim} is null or ${t.vigenciaFim} >= ${t.vigenciaInicio}`),
    check("responsavel_substituicao_com_motivo", sql`${t.substituiResponsavelId} is null or ${t.motivoSubstituicao} is not null`),
    // RN-06: replacing the supervisor requires an amendment; replacing the advisor does not
    check(
      "responsavel_troca_supervisor_com_aditivo",
      sql`${t.papel} <> 'SUPERVISOR' or ${t.substituiResponsavelId} is null or ${t.aditivoId} is not null`,
    ),
  ],
);
