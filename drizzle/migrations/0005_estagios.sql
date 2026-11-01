CREATE TYPE "public"."papel_responsavel" AS ENUM('ORIENTADOR', 'SUPERVISOR');--> statement-breakpoint
CREATE TYPE "public"."parte_assinatura" AS ENUM('ESTUDANTE', 'INSTITUICAO', 'CONCEDENTE');--> statement-breakpoint
CREATE TYPE "public"."situacao_aditivo" AS ENUM('AGUARDANDO_ASSINATURAS', 'VIGENTE', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."situacao_estagio" AS ENUM('EM_FORMALIZACAO', 'ATIVO', 'CONCLUIDO', 'RESCINDIDO');--> statement-breakpoint
CREATE TYPE "public"."situacao_plano" AS ENUM('RASCUNHO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'DEVOLVIDO', 'SUBSTITUIDO');--> statement-breakpoint
CREATE TYPE "public"."tipo_aditivo" AS ENUM('PRORROGACAO', 'SUBSTITUICAO_SUPERVISOR', 'ALTERACAO_CARGA_HORARIA');--> statement-breakpoint
CREATE TYPE "public"."tipo_estagio" AS ENUM('OBRIGATORIO', 'NAO_OBRIGATORIO');--> statement-breakpoint
CREATE TABLE "aditivo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estagio_id" uuid NOT NULL,
	"numero" smallint NOT NULL,
	"tipo" "tipo_aditivo" NOT NULL,
	"justificativa" text NOT NULL,
	"situacao" "situacao_aditivo" DEFAULT 'AGUARDANDO_ASSINATURAS' NOT NULL,
	"snapshot_anterior" jsonb NOT NULL,
	"nova_data_fim_pactuada" date,
	"nova_carga_diaria_minutos" integer,
	"nova_carga_semanal_minutos" integer,
	"nova_carga_total_minutos" integer,
	"novo_supervisor_usuario_id" uuid,
	"hash_conteudo" text NOT NULL,
	"documento_id" uuid,
	"efetivado_em" timestamp with time zone,
	"motivo_cancelamento" text,
	"criado_por_usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aditivo_numero_positivo" CHECK ("aditivo"."numero" >= 1),
	CONSTRAINT "aditivo_snapshot_objeto" CHECK (jsonb_typeof("aditivo"."snapshot_anterior") = 'object'),
	CONSTRAINT "aditivo_hash_formato" CHECK ("aditivo"."hash_conteudo" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "aditivo_prorrogacao" CHECK (("aditivo"."tipo" = 'PRORROGACAO') = ("aditivo"."nova_data_fim_pactuada" is not null)),
	CONSTRAINT "aditivo_alteracao_carga" CHECK (("aditivo"."tipo" = 'ALTERACAO_CARGA_HORARIA') = (num_nonnulls("aditivo"."nova_carga_diaria_minutos", "aditivo"."nova_carga_semanal_minutos", "aditivo"."nova_carga_total_minutos") > 0)),
	CONSTRAINT "aditivo_cargas_validas" CHECK (("aditivo"."nova_carga_diaria_minutos" is null or "aditivo"."nova_carga_diaria_minutos" between 1 and 1440) and ("aditivo"."nova_carga_semanal_minutos" is null or "aditivo"."nova_carga_semanal_minutos" between 1 and 10080) and ("aditivo"."nova_carga_total_minutos" is null or "aditivo"."nova_carga_total_minutos" > 0)),
	CONSTRAINT "aditivo_substituicao_supervisor" CHECK (("aditivo"."tipo" = 'SUBSTITUICAO_SUPERVISOR') = ("aditivo"."novo_supervisor_usuario_id" is not null)),
	CONSTRAINT "aditivo_efetivacao_consistente" CHECK (("aditivo"."situacao" = 'VIGENTE') = ("aditivo"."efetivado_em" is not null)),
	CONSTRAINT "aditivo_cancelamento_com_motivo" CHECK ("aditivo"."situacao" <> 'CANCELADO' or "aditivo"."motivo_cancelamento" is not null)
);
--> statement-breakpoint
CREATE TABLE "apolice_seguro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estagio_id" uuid NOT NULL,
	"seguradora" text NOT NULL,
	"numero_apolice" text NOT NULL,
	"contratante" text NOT NULL,
	"vigencia_inicio" date NOT NULL,
	"vigencia_fim" date NOT NULL,
	"substitui_apolice_id" uuid,
	"documento_id" uuid,
	"registrado_por_usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "apolice_seguro_substitui_apolice_id_unique" UNIQUE("substitui_apolice_id"),
	CONSTRAINT "apolice_periodo_valido" CHECK ("apolice_seguro"."vigencia_fim" >= "apolice_seguro"."vigencia_inicio"),
	CONSTRAINT "apolice_contratante_valido" CHECK ("apolice_seguro"."contratante" in ('CONCEDENTE', 'INSTITUICAO'))
);
--> statement-breakpoint
CREATE TABLE "assinatura" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estagio_id" uuid NOT NULL,
	"aditivo_id" uuid,
	"parte" "parte_assinatura" NOT NULL,
	"signatario_usuario_id" uuid NOT NULL,
	"signatario_nome" text NOT NULL,
	"signatario_perfil" "perfil" NOT NULL,
	"hash_documento" text NOT NULL,
	"documento_id" uuid,
	"endereco_ip" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assinatura_hash_formato" CHECK ("assinatura"."hash_documento" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "assinatura_parte_perfil" CHECK (("assinatura"."parte" = 'ESTUDANTE' and "assinatura"."signatario_perfil" = 'ESTUDANTE') or ("assinatura"."parte" = 'INSTITUICAO' and "assinatura"."signatario_perfil" = 'COORDENACAO') or ("assinatura"."parte" = 'CONCEDENTE' and "assinatura"."signatario_perfil" = 'CONCEDENTE'))
);
--> statement-breakpoint
CREATE TABLE "estagio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudante_id" uuid NOT NULL,
	"curso_id" uuid NOT NULL,
	"concedente_id" uuid NOT NULL,
	"convenio_id" uuid NOT NULL,
	"tipo" "tipo_estagio" NOT NULL,
	"situacao" "situacao_estagio" DEFAULT 'EM_FORMALIZACAO' NOT NULL,
	"data_inicio" date NOT NULL,
	"data_fim_pactuada" date NOT NULL,
	"data_fim_prevista" date NOT NULL,
	"carga_diaria_minutos" integer NOT NULL,
	"carga_semanal_minutos" integer NOT NULL,
	"carga_total_minutos" integer NOT NULL,
	"condicoes_pactuadas" text NOT NULL,
	"bolsa_valor" numeric(12, 2),
	"auxilio_transporte_valor" numeric(12, 2),
	"seguro_exigido" boolean DEFAULT true NOT NULL,
	"hash_tce" text,
	"tce_fechado_em" timestamp with time zone,
	"justificativa_reabertura" text,
	"dispensa_duracao_maxima" boolean DEFAULT false NOT NULL,
	"dispensa_documento_id" uuid,
	"documento_tce_id" uuid,
	"ativado_em" timestamp with time zone,
	"encerrado_em" timestamp with time zone,
	"criado_por_usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "estagio_fim_pactuado_valido" CHECK ("estagio"."data_fim_pactuada" > "estagio"."data_inicio"),
	CONSTRAINT "estagio_fim_previsto_valido" CHECK ("estagio"."data_fim_prevista" >= "estagio"."data_fim_pactuada"),
	CONSTRAINT "estagio_carga_diaria_valida" CHECK ("estagio"."carga_diaria_minutos" > 0 and "estagio"."carga_diaria_minutos" <= 1440),
	CONSTRAINT "estagio_carga_semanal_valida" CHECK ("estagio"."carga_semanal_minutos" > 0 and "estagio"."carga_semanal_minutos" <= 10080),
	CONSTRAINT "estagio_carga_total_valida" CHECK ("estagio"."carga_total_minutos" > 0),
	CONSTRAINT "estagio_diaria_ate_semanal" CHECK ("estagio"."carga_diaria_minutos" <= "estagio"."carga_semanal_minutos"),
	CONSTRAINT "estagio_bolsa_nao_negativa" CHECK ("estagio"."bolsa_valor" is null or "estagio"."bolsa_valor" >= 0),
	CONSTRAINT "estagio_auxilio_nao_negativo" CHECK ("estagio"."auxilio_transporte_valor" is null or "estagio"."auxilio_transporte_valor" >= 0),
	CONSTRAINT "estagio_nao_obrigatorio_exige_bolsa" CHECK ("estagio"."tipo" <> 'NAO_OBRIGATORIO' or ("estagio"."bolsa_valor" > 0 and "estagio"."auxilio_transporte_valor" > 0)),
	CONSTRAINT "estagio_hash_tce_formato" CHECK ("estagio"."hash_tce" is null or "estagio"."hash_tce" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "estagio_hash_e_fechamento" CHECK (("estagio"."hash_tce" is null) = ("estagio"."tce_fechado_em" is null)),
	CONSTRAINT "estagio_fora_de_formalizacao_tem_hash" CHECK ("estagio"."situacao" = 'EM_FORMALIZACAO' or "estagio"."hash_tce" is not null),
	CONSTRAINT "estagio_ativacao_consistente" CHECK (("estagio"."situacao" = 'EM_FORMALIZACAO') = ("estagio"."ativado_em" is null)),
	CONSTRAINT "estagio_encerramento_consistente" CHECK (("estagio"."situacao" in ('CONCLUIDO', 'RESCINDIDO')) = ("estagio"."encerrado_em" is not null)),
	CONSTRAINT "estagio_dispensa_com_documento" CHECK (not "estagio"."dispensa_duracao_maxima" or "estagio"."dispensa_documento_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "plano_atividades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estagio_id" uuid NOT NULL,
	"versao" smallint NOT NULL,
	"atividades_previstas" text NOT NULL,
	"justificativa_compatibilidade" text NOT NULL,
	"situacao" "situacao_plano" DEFAULT 'RASCUNHO' NOT NULL,
	"parecer" text,
	"decidido_por_usuario_id" uuid,
	"decidido_em" timestamp with time zone,
	"documento_id" uuid,
	"elaborado_por_usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plano_versao_positiva" CHECK ("plano_atividades"."versao" >= 1),
	CONSTRAINT "plano_devolucao_com_parecer" CHECK ("plano_atividades"."situacao" <> 'DEVOLVIDO' or "plano_atividades"."parecer" is not null),
	CONSTRAINT "plano_decisao_consistente" CHECK (("plano_atividades"."situacao" in ('RASCUNHO', 'AGUARDANDO_APROVACAO')) = ("plano_atividades"."decidido_em" is null) and ("plano_atividades"."decidido_em" is null) = ("plano_atividades"."decidido_por_usuario_id" is null))
);
--> statement-breakpoint
CREATE TABLE "responsavel_estagio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estagio_id" uuid NOT NULL,
	"papel" "papel_responsavel" NOT NULL,
	"usuario_id" uuid NOT NULL,
	"vigencia_inicio" date NOT NULL,
	"vigencia_fim" date,
	"substitui_responsavel_id" uuid,
	"motivo_substituicao" text,
	"decidido_por_usuario_id" uuid NOT NULL,
	"aditivo_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "responsavel_estagio_substitui_responsavel_id_unique" UNIQUE("substitui_responsavel_id"),
	CONSTRAINT "responsavel_vigencia_valida" CHECK ("responsavel_estagio"."vigencia_fim" is null or "responsavel_estagio"."vigencia_fim" >= "responsavel_estagio"."vigencia_inicio"),
	CONSTRAINT "responsavel_substituicao_com_motivo" CHECK ("responsavel_estagio"."substitui_responsavel_id" is null or "responsavel_estagio"."motivo_substituicao" is not null),
	CONSTRAINT "responsavel_troca_supervisor_com_aditivo" CHECK ("responsavel_estagio"."papel" <> 'SUPERVISOR' or "responsavel_estagio"."substitui_responsavel_id" is null or "responsavel_estagio"."aditivo_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "aditivo" ADD CONSTRAINT "aditivo_estagio_id_estagio_id_fk" FOREIGN KEY ("estagio_id") REFERENCES "public"."estagio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aditivo" ADD CONSTRAINT "aditivo_novo_supervisor_usuario_id_usuario_id_fk" FOREIGN KEY ("novo_supervisor_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aditivo" ADD CONSTRAINT "aditivo_documento_id_documento_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aditivo" ADD CONSTRAINT "aditivo_criado_por_usuario_id_usuario_id_fk" FOREIGN KEY ("criado_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apolice_seguro" ADD CONSTRAINT "apolice_seguro_estagio_id_estagio_id_fk" FOREIGN KEY ("estagio_id") REFERENCES "public"."estagio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apolice_seguro" ADD CONSTRAINT "apolice_seguro_documento_id_documento_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apolice_seguro" ADD CONSTRAINT "apolice_seguro_registrado_por_usuario_id_usuario_id_fk" FOREIGN KEY ("registrado_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinatura" ADD CONSTRAINT "assinatura_estagio_id_estagio_id_fk" FOREIGN KEY ("estagio_id") REFERENCES "public"."estagio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinatura" ADD CONSTRAINT "assinatura_aditivo_id_aditivo_id_fk" FOREIGN KEY ("aditivo_id") REFERENCES "public"."aditivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinatura" ADD CONSTRAINT "assinatura_signatario_usuario_id_usuario_id_fk" FOREIGN KEY ("signatario_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinatura" ADD CONSTRAINT "assinatura_documento_id_documento_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estagio" ADD CONSTRAINT "estagio_estudante_id_estudante_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."estudante"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estagio" ADD CONSTRAINT "estagio_curso_id_curso_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."curso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estagio" ADD CONSTRAINT "estagio_concedente_id_concedente_id_fk" FOREIGN KEY ("concedente_id") REFERENCES "public"."concedente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estagio" ADD CONSTRAINT "estagio_convenio_id_convenio_id_fk" FOREIGN KEY ("convenio_id") REFERENCES "public"."convenio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estagio" ADD CONSTRAINT "estagio_dispensa_documento_id_documento_id_fk" FOREIGN KEY ("dispensa_documento_id") REFERENCES "public"."documento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estagio" ADD CONSTRAINT "estagio_documento_tce_id_documento_id_fk" FOREIGN KEY ("documento_tce_id") REFERENCES "public"."documento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estagio" ADD CONSTRAINT "estagio_criado_por_usuario_id_usuario_id_fk" FOREIGN KEY ("criado_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plano_atividades" ADD CONSTRAINT "plano_atividades_estagio_id_estagio_id_fk" FOREIGN KEY ("estagio_id") REFERENCES "public"."estagio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plano_atividades" ADD CONSTRAINT "plano_atividades_decidido_por_usuario_id_usuario_id_fk" FOREIGN KEY ("decidido_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plano_atividades" ADD CONSTRAINT "plano_atividades_documento_id_documento_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plano_atividades" ADD CONSTRAINT "plano_atividades_elaborado_por_usuario_id_usuario_id_fk" FOREIGN KEY ("elaborado_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responsavel_estagio" ADD CONSTRAINT "responsavel_estagio_estagio_id_estagio_id_fk" FOREIGN KEY ("estagio_id") REFERENCES "public"."estagio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responsavel_estagio" ADD CONSTRAINT "responsavel_estagio_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responsavel_estagio" ADD CONSTRAINT "responsavel_estagio_decidido_por_usuario_id_usuario_id_fk" FOREIGN KEY ("decidido_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responsavel_estagio" ADD CONSTRAINT "responsavel_estagio_aditivo_id_aditivo_id_fk" FOREIGN KEY ("aditivo_id") REFERENCES "public"."aditivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "aditivo_estagio_numero_unique" ON "aditivo" USING btree ("estagio_id","numero");--> statement-breakpoint
CREATE UNIQUE INDEX "aditivo_um_pendente" ON "aditivo" USING btree ("estagio_id") WHERE "aditivo"."situacao" = 'AGUARDANDO_ASSINATURAS';--> statement-breakpoint
CREATE INDEX "aditivo_novo_supervisor_idx" ON "aditivo" USING btree ("novo_supervisor_usuario_id");--> statement-breakpoint
CREATE INDEX "aditivo_documento_idx" ON "aditivo" USING btree ("documento_id");--> statement-breakpoint
CREATE INDEX "aditivo_criado_por_idx" ON "aditivo" USING btree ("criado_por_usuario_id");--> statement-breakpoint
CREATE INDEX "apolice_estagio_fim_idx" ON "apolice_seguro" USING btree ("estagio_id","vigencia_fim");--> statement-breakpoint
CREATE INDEX "apolice_documento_idx" ON "apolice_seguro" USING btree ("documento_id");--> statement-breakpoint
CREATE INDEX "apolice_registrado_por_idx" ON "apolice_seguro" USING btree ("registrado_por_usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assinatura_tce_parte_hash_unique" ON "assinatura" USING btree ("estagio_id","parte","hash_documento") WHERE "assinatura"."aditivo_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "assinatura_aditivo_parte_unique" ON "assinatura" USING btree ("aditivo_id","parte") WHERE "assinatura"."aditivo_id" is not null;--> statement-breakpoint
CREATE INDEX "assinatura_estagio_idx" ON "assinatura" USING btree ("estagio_id");--> statement-breakpoint
CREATE INDEX "assinatura_signatario_idx" ON "assinatura" USING btree ("signatario_usuario_id");--> statement-breakpoint
CREATE INDEX "assinatura_documento_idx" ON "assinatura" USING btree ("documento_id");--> statement-breakpoint
CREATE UNIQUE INDEX "estagio_um_ativo_por_estudante" ON "estagio" USING btree ("estudante_id") WHERE "estagio"."situacao" = 'ATIVO';--> statement-breakpoint
CREATE INDEX "estagio_estudante_concedente_idx" ON "estagio" USING btree ("estudante_id","concedente_id");--> statement-breakpoint
CREATE INDEX "estagio_concedente_idx" ON "estagio" USING btree ("concedente_id");--> statement-breakpoint
CREATE INDEX "estagio_curso_situacao_idx" ON "estagio" USING btree ("curso_id","situacao");--> statement-breakpoint
CREATE INDEX "estagio_convenio_idx" ON "estagio" USING btree ("convenio_id");--> statement-breakpoint
CREATE INDEX "estagio_situacao_fim_idx" ON "estagio" USING btree ("situacao","data_fim_prevista");--> statement-breakpoint
CREATE INDEX "estagio_documento_tce_idx" ON "estagio" USING btree ("documento_tce_id");--> statement-breakpoint
CREATE INDEX "estagio_dispensa_documento_idx" ON "estagio" USING btree ("dispensa_documento_id");--> statement-breakpoint
CREATE INDEX "estagio_criado_por_idx" ON "estagio" USING btree ("criado_por_usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plano_estagio_versao_unique" ON "plano_atividades" USING btree ("estagio_id","versao");--> statement-breakpoint
CREATE UNIQUE INDEX "plano_uma_versao_em_elaboracao" ON "plano_atividades" USING btree ("estagio_id") WHERE "plano_atividades"."situacao" in ('RASCUNHO', 'AGUARDANDO_APROVACAO');--> statement-breakpoint
CREATE UNIQUE INDEX "plano_um_aprovado" ON "plano_atividades" USING btree ("estagio_id") WHERE "plano_atividades"."situacao" = 'APROVADO';--> statement-breakpoint
CREATE INDEX "plano_decidido_por_idx" ON "plano_atividades" USING btree ("decidido_por_usuario_id");--> statement-breakpoint
CREATE INDEX "plano_elaborado_por_idx" ON "plano_atividades" USING btree ("elaborado_por_usuario_id");--> statement-breakpoint
CREATE INDEX "plano_documento_idx" ON "plano_atividades" USING btree ("documento_id");--> statement-breakpoint
CREATE INDEX "responsavel_estagio_fim_idx" ON "responsavel_estagio" USING btree ("estagio_id","vigencia_fim");--> statement-breakpoint
CREATE INDEX "responsavel_usuario_estagio_idx" ON "responsavel_estagio" USING btree ("usuario_id","estagio_id","vigencia_fim");--> statement-breakpoint
CREATE INDEX "responsavel_decidido_por_idx" ON "responsavel_estagio" USING btree ("decidido_por_usuario_id");--> statement-breakpoint
CREATE INDEX "responsavel_aditivo_idx" ON "responsavel_estagio" USING btree ("aditivo_id");--> statement-breakpoint
ALTER TABLE "documento" ADD CONSTRAINT "documento_estagio_id_estagio_id_fk" FOREIGN KEY ("estagio_id") REFERENCES "public"."estagio"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Not expressible in the Drizzle schema: kept here, by hand (DER-LOGICO §4.4)
ALTER TABLE "apolice_seguro" ADD CONSTRAINT "apolice_substitui_fk" FOREIGN KEY ("substitui_apolice_id") REFERENCES "public"."apolice_seguro"("id");--> statement-breakpoint
ALTER TABLE "responsavel_estagio" ADD CONSTRAINT "responsavel_substitui_fk" FOREIGN KEY ("substitui_responsavel_id") REFERENCES "public"."responsavel_estagio"("id");--> statement-breakpoint
-- RN-10, RN-12: at most one advisor and one supervisor in force per day
ALTER TABLE "responsavel_estagio" ADD CONSTRAINT "responsavel_sem_sobreposicao" EXCLUDE USING gist ("estagio_id" WITH =, "papel" WITH =, daterange("vigencia_inicio", "vigencia_fim", '[)') WITH &&);
