CREATE TYPE "public"."decisao_analise" AS ENUM('APROVADA', 'RECUSADA', 'DEVOLVIDA');--> statement-breakpoint
CREATE TYPE "public"."situacao_atividade" AS ENUM('EM_ANALISE', 'DEVOLVIDA', 'APROVADA', 'RECUSADA');--> statement-breakpoint
CREATE TABLE "analise_atividade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"atividade_id" uuid NOT NULL,
	"decisao" "decisao_analise" NOT NULL,
	"motivo" text,
	"horas_aproveitadas_minutos" integer,
	"minutos_excedentes" integer,
	"motivo_excedente" text,
	"analisado_por_usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analise_motivo_obrigatorio" CHECK ("analise_atividade"."decisao" = 'APROVADA' or "analise_atividade"."motivo" is not null),
	CONSTRAINT "analise_horas_na_aprovacao" CHECK (("analise_atividade"."decisao" = 'APROVADA') = ("analise_atividade"."horas_aproveitadas_minutos" is not null)),
	CONSTRAINT "analise_excedente_na_aprovacao" CHECK (("analise_atividade"."decisao" = 'APROVADA') = ("analise_atividade"."minutos_excedentes" is not null)),
	CONSTRAINT "analise_minutos_nao_negativos" CHECK (coalesce("analise_atividade"."horas_aproveitadas_minutos", 0) >= 0 and coalesce("analise_atividade"."minutos_excedentes", 0) >= 0),
	CONSTRAINT "analise_excedente_explicado" CHECK (coalesce("analise_atividade"."minutos_excedentes", 0) = 0 or "analise_atividade"."motivo_excedente" is not null)
);
--> statement-breakpoint
CREATE TABLE "atividade_complementar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estudante_id" uuid NOT NULL,
	"categoria_id" uuid NOT NULL,
	"descricao" text NOT NULL,
	"instituicao_promotora" text NOT NULL,
	"data_inicio" date NOT NULL,
	"data_fim" date NOT NULL,
	"horas_declaradas_minutos" integer NOT NULL,
	"horas_aproveitadas_minutos" integer,
	"situacao" "situacao_atividade" DEFAULT 'EM_ANALISE' NOT NULL,
	"origem_estagio_id" uuid,
	"enviada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"registrada_por_usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "atividade_periodo_valido" CHECK ("atividade_complementar"."data_fim" >= "atividade_complementar"."data_inicio"),
	CONSTRAINT "atividade_horas_declaradas_validas" CHECK ("atividade_complementar"."horas_declaradas_minutos" > 0),
	CONSTRAINT "atividade_horas_aproveitadas_validas" CHECK ("atividade_complementar"."horas_aproveitadas_minutos" is null or "atividade_complementar"."horas_aproveitadas_minutos" between 0 and "atividade_complementar"."horas_declaradas_minutos"),
	CONSTRAINT "atividade_aprovada_com_horas" CHECK (("atividade_complementar"."situacao" = 'APROVADA') = ("atividade_complementar"."horas_aproveitadas_minutos" is not null))
);
--> statement-breakpoint
CREATE TABLE "comprovante_atividade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"atividade_id" uuid NOT NULL,
	"estudante_id" uuid NOT NULL,
	"documento_id" uuid NOT NULL,
	"sha256" text NOT NULL,
	"valido" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comprovante_atividade_documento_id_unique" UNIQUE("documento_id"),
	CONSTRAINT "comprovante_sha256_formato" CHECK ("comprovante_atividade"."sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "analise_atividade" ADD CONSTRAINT "analise_atividade_atividade_id_atividade_complementar_id_fk" FOREIGN KEY ("atividade_id") REFERENCES "public"."atividade_complementar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analise_atividade" ADD CONSTRAINT "analise_atividade_analisado_por_usuario_id_usuario_id_fk" FOREIGN KEY ("analisado_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atividade_complementar" ADD CONSTRAINT "atividade_complementar_estudante_id_estudante_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."estudante"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atividade_complementar" ADD CONSTRAINT "atividade_complementar_categoria_id_categoria_atividade_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria_atividade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atividade_complementar" ADD CONSTRAINT "atividade_complementar_origem_estagio_id_estagio_id_fk" FOREIGN KEY ("origem_estagio_id") REFERENCES "public"."estagio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atividade_complementar" ADD CONSTRAINT "atividade_complementar_registrada_por_usuario_id_usuario_id_fk" FOREIGN KEY ("registrada_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comprovante_atividade" ADD CONSTRAINT "comprovante_atividade_atividade_id_atividade_complementar_id_fk" FOREIGN KEY ("atividade_id") REFERENCES "public"."atividade_complementar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comprovante_atividade" ADD CONSTRAINT "comprovante_atividade_estudante_id_estudante_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."estudante"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comprovante_atividade" ADD CONSTRAINT "comprovante_atividade_documento_id_documento_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analise_atividade_idx" ON "analise_atividade" USING btree ("atividade_id","criado_em");--> statement-breakpoint
CREATE INDEX "analise_analisado_por_idx" ON "analise_atividade" USING btree ("analisado_por_usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "atividade_uma_por_estagio" ON "atividade_complementar" USING btree ("origem_estagio_id") WHERE "atividade_complementar"."origem_estagio_id" is not null and "atividade_complementar"."situacao" <> 'RECUSADA';--> statement-breakpoint
CREATE UNIQUE INDEX "atividade_sem_duplicidade" ON "atividade_complementar" USING btree ("estudante_id","categoria_id",lower("instituicao_promotora"),lower("descricao"),"data_inicio","data_fim") WHERE "atividade_complementar"."situacao" <> 'RECUSADA';--> statement-breakpoint
CREATE INDEX "atividade_estudante_situacao_idx" ON "atividade_complementar" USING btree ("estudante_id","situacao");--> statement-breakpoint
CREATE INDEX "atividade_categoria_idx" ON "atividade_complementar" USING btree ("categoria_id");--> statement-breakpoint
CREATE INDEX "atividade_fila_analise_idx" ON "atividade_complementar" USING btree ("situacao","enviada_em");--> statement-breakpoint
CREATE INDEX "atividade_registrada_por_idx" ON "atividade_complementar" USING btree ("registrada_por_usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "comprovante_unico_por_estudante" ON "comprovante_atividade" USING btree ("estudante_id","sha256") WHERE "comprovante_atividade"."valido";--> statement-breakpoint
CREATE INDEX "comprovante_atividade_idx" ON "comprovante_atividade" USING btree ("atividade_id");