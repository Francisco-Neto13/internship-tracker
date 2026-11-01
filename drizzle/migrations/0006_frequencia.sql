CREATE TYPE "public"."situacao_divergencia" AS ENUM('ABERTA', 'ANALISADA');--> statement-breakpoint
CREATE TYPE "public"."situacao_frequencia" AS ENUM('REGISTRADO', 'SINALIZADO', 'HOMOLOGADO', 'SUBSTITUIDO', 'CANCELADO');--> statement-breakpoint
CREATE TABLE "divergencia_carga_horaria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estagio_id" uuid NOT NULL,
	"data_referencia" date NOT NULL,
	"minutos_previstos" integer NOT NULL,
	"minutos_cumpridos" integer NOT NULL,
	"tolerancia_percentual" numeric(5, 2) NOT NULL,
	"situacao" "situacao_divergencia" DEFAULT 'ABERTA' NOT NULL,
	"parecer" text,
	"analisada_por_usuario_id" uuid,
	"analisada_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "divergencia_minutos_validos" CHECK ("divergencia_carga_horaria"."minutos_previstos" > 0 and "divergencia_carga_horaria"."minutos_cumpridos" >= 0),
	CONSTRAINT "divergencia_tolerancia_valida" CHECK ("divergencia_carga_horaria"."tolerancia_percentual" between 0 and 100),
	CONSTRAINT "divergencia_analise_consistente" CHECK (("divergencia_carga_horaria"."situacao" = 'ANALISADA') = ("divergencia_carga_horaria"."analisada_em" is not null) and ("divergencia_carga_horaria"."analisada_em" is null) = ("divergencia_carga_horaria"."analisada_por_usuario_id" is null) and ("divergencia_carga_horaria"."situacao" = 'ABERTA' or "divergencia_carga_horaria"."parecer" is not null))
);
--> statement-breakpoint
CREATE TABLE "homologacao_frequencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estagio_id" uuid NOT NULL,
	"periodo_inicio" date NOT NULL,
	"periodo_fim" date NOT NULL,
	"minutos_homologados" integer NOT NULL,
	"observacao" text,
	"homologado_por_usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "homologacao_periodo_valido" CHECK ("homologacao_frequencia"."periodo_fim" >= "homologacao_frequencia"."periodo_inicio"),
	CONSTRAINT "homologacao_minutos_positivos" CHECK ("homologacao_frequencia"."minutos_homologados" > 0)
);
--> statement-breakpoint
CREATE TABLE "registro_frequencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estagio_id" uuid NOT NULL,
	"data" date NOT NULL,
	"hora_entrada" time(0),
	"hora_saida" time(0),
	"intervalo_minutos" integer DEFAULT 0 NOT NULL,
	"duracao_minutos" integer NOT NULL,
	"observacao" text,
	"situacao" "situacao_frequencia" DEFAULT 'REGISTRADO' NOT NULL,
	"excedeu_limite" boolean DEFAULT false NOT NULL,
	"parametro_institucional_id" uuid,
	"limite_diario_aplicado_minutos" integer NOT NULL,
	"limite_semanal_aplicado_minutos" integer NOT NULL,
	"substitui_registro_id" uuid,
	"justificativa_ajuste" text,
	"homologacao_id" uuid,
	"justificativa_cancelamento" text,
	"registrado_por_usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registro_frequencia_substitui_registro_id_unique" UNIQUE("substitui_registro_id"),
	CONSTRAINT "frequencia_horario_completo" CHECK (("registro_frequencia"."hora_entrada" is null) = ("registro_frequencia"."hora_saida" is null)),
	CONSTRAINT "frequencia_saida_apos_entrada" CHECK ("registro_frequencia"."hora_entrada" is null or "registro_frequencia"."hora_saida" > "registro_frequencia"."hora_entrada"),
	CONSTRAINT "frequencia_intervalo_valido" CHECK ("registro_frequencia"."intervalo_minutos" >= 0 and ("registro_frequencia"."hora_entrada" is not null or "registro_frequencia"."intervalo_minutos" = 0)),
	CONSTRAINT "frequencia_duracao_valida" CHECK ("registro_frequencia"."duracao_minutos" > 0 and "registro_frequencia"."duracao_minutos" <= 1440),
	CONSTRAINT "frequencia_duracao_do_horario" CHECK ("registro_frequencia"."hora_entrada" is null or "registro_frequencia"."duracao_minutos" = extract(epoch from ("registro_frequencia"."hora_saida" - "registro_frequencia"."hora_entrada"))::integer / 60 - "registro_frequencia"."intervalo_minutos"),
	CONSTRAINT "frequencia_sinalizado_excedeu" CHECK ("registro_frequencia"."situacao" <> 'SINALIZADO' or "registro_frequencia"."excedeu_limite"),
	CONSTRAINT "frequencia_ajuste_justificado" CHECK (("registro_frequencia"."substitui_registro_id" is null) = ("registro_frequencia"."justificativa_ajuste" is null)),
	CONSTRAINT "frequencia_homologado_com_homologacao" CHECK ("registro_frequencia"."situacao" <> 'HOMOLOGADO' or "registro_frequencia"."homologacao_id" is not null),
	CONSTRAINT "frequencia_cancelamento_justificado" CHECK (("registro_frequencia"."situacao" = 'CANCELADO') = ("registro_frequencia"."justificativa_cancelamento" is not null)),
	CONSTRAINT "frequencia_limites_positivos" CHECK ("registro_frequencia"."limite_diario_aplicado_minutos" > 0 and "registro_frequencia"."limite_semanal_aplicado_minutos" > 0)
);
--> statement-breakpoint
ALTER TABLE "divergencia_carga_horaria" ADD CONSTRAINT "divergencia_carga_horaria_estagio_id_estagio_id_fk" FOREIGN KEY ("estagio_id") REFERENCES "public"."estagio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "divergencia_carga_horaria" ADD CONSTRAINT "divergencia_carga_horaria_analisada_por_usuario_id_usuario_id_fk" FOREIGN KEY ("analisada_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homologacao_frequencia" ADD CONSTRAINT "homologacao_frequencia_estagio_id_estagio_id_fk" FOREIGN KEY ("estagio_id") REFERENCES "public"."estagio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homologacao_frequencia" ADD CONSTRAINT "homologacao_frequencia_homologado_por_usuario_id_usuario_id_fk" FOREIGN KEY ("homologado_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_frequencia" ADD CONSTRAINT "registro_frequencia_estagio_id_estagio_id_fk" FOREIGN KEY ("estagio_id") REFERENCES "public"."estagio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_frequencia" ADD CONSTRAINT "registro_frequencia_parametro_institucional_id_parametro_institucional_id_fk" FOREIGN KEY ("parametro_institucional_id") REFERENCES "public"."parametro_institucional"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_frequencia" ADD CONSTRAINT "registro_frequencia_substitui_registro_id_registro_frequencia_id_fk" FOREIGN KEY ("substitui_registro_id") REFERENCES "public"."registro_frequencia"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_frequencia" ADD CONSTRAINT "registro_frequencia_homologacao_id_homologacao_frequencia_id_fk" FOREIGN KEY ("homologacao_id") REFERENCES "public"."homologacao_frequencia"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_frequencia" ADD CONSTRAINT "registro_frequencia_registrado_por_usuario_id_usuario_id_fk" FOREIGN KEY ("registrado_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "divergencia_uma_aberta_por_estagio" ON "divergencia_carga_horaria" USING btree ("estagio_id") WHERE "divergencia_carga_horaria"."situacao" = 'ABERTA';--> statement-breakpoint
CREATE INDEX "divergencia_estagio_idx" ON "divergencia_carga_horaria" USING btree ("estagio_id","criado_em");--> statement-breakpoint
CREATE INDEX "divergencia_analisada_por_idx" ON "divergencia_carga_horaria" USING btree ("analisada_por_usuario_id");--> statement-breakpoint
CREATE INDEX "homologacao_estagio_periodo_idx" ON "homologacao_frequencia" USING btree ("estagio_id","periodo_inicio");--> statement-breakpoint
CREATE INDEX "homologacao_homologado_por_idx" ON "homologacao_frequencia" USING btree ("homologado_por_usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "frequencia_um_vigente_por_dia" ON "registro_frequencia" USING btree ("estagio_id","data") WHERE "registro_frequencia"."situacao" in ('REGISTRADO', 'SINALIZADO', 'HOMOLOGADO');--> statement-breakpoint
CREATE INDEX "frequencia_estagio_data_situacao_idx" ON "registro_frequencia" USING btree ("estagio_id","data","situacao");--> statement-breakpoint
CREATE INDEX "frequencia_homologacao_idx" ON "registro_frequencia" USING btree ("homologacao_id");--> statement-breakpoint
CREATE INDEX "frequencia_parametro_idx" ON "registro_frequencia" USING btree ("parametro_institucional_id");--> statement-breakpoint
CREATE INDEX "frequencia_registrado_por_idx" ON "registro_frequencia" USING btree ("registrado_por_usuario_id");