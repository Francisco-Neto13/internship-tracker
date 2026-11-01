-- btree_gist lets an exclusion constraint combine equality (convenio_id) with range overlap.
-- Trusted extension since PostgreSQL 13: the database owner (migrator) creates it.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
CREATE TYPE "public"."situacao_convenio" AS ENUM('ATIVO', 'ENCERRADO');--> statement-breakpoint
CREATE TYPE "public"."tipo_documento" AS ENUM('CONVENIO', 'TCE', 'ADITIVO', 'PLANO_ATIVIDADES', 'ASSINATURA', 'APOLICE', 'RELATORIO', 'COMPROVANTE_ATIVIDADE', 'ATESTADO_AFASTAMENTO', 'RESCISAO', 'DECLARACAO', 'DISPENSA_DURACAO');--> statement-breakpoint
CREATE TABLE "convenio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"concedente_id" uuid NOT NULL,
	"numero" text NOT NULL,
	"observacao" text,
	"situacao" "situacao_convenio" DEFAULT 'ATIVO' NOT NULL,
	"motivo_encerramento" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "convenio_numero_unique" UNIQUE("numero"),
	CONSTRAINT "convenio_encerramento_exige_motivo" CHECK ("convenio"."situacao" <> 'ENCERRADO' or "convenio"."motivo_encerramento" is not null)
);
--> statement-breakpoint
CREATE TABLE "convenio_vigencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"convenio_id" uuid NOT NULL,
	"vigencia_inicio" date NOT NULL,
	"vigencia_fim" date NOT NULL,
	"renova_vigencia_id" uuid,
	"documento_id" uuid NOT NULL,
	"registrado_por_usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "convenio_vigencia_renova_vigencia_id_unique" UNIQUE("renova_vigencia_id"),
	CONSTRAINT "convenio_vigencia_periodo_valido" CHECK ("convenio_vigencia"."vigencia_fim" >= "convenio_vigencia"."vigencia_inicio")
);
--> statement-breakpoint
CREATE TABLE "documento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "tipo_documento" NOT NULL,
	"chave_objeto" text NOT NULL,
	"nome_original" text NOT NULL,
	"tipo_mime" text NOT NULL,
	"tamanho_bytes" bigint NOT NULL,
	"sha256" text NOT NULL,
	"sensivel" boolean DEFAULT false NOT NULL,
	"estudante_id" uuid,
	"estagio_id" uuid,
	"concedente_id" uuid,
	"data_liberacao_guarda" date,
	"eliminado_em" timestamp with time zone,
	"eliminado_por_usuario_id" uuid,
	"enviado_por_usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documento_chave_objeto_unique" UNIQUE("chave_objeto"),
	CONSTRAINT "documento_tipo_mime_permitido" CHECK ("documento"."tipo_mime" in ('application/pdf', 'image/jpeg', 'image/png')),
	CONSTRAINT "documento_tamanho_valido" CHECK ("documento"."tamanho_bytes" > 0 and "documento"."tamanho_bytes" <= 10485760),
	CONSTRAINT "documento_sha256_formato" CHECK ("documento"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "documento_atestado_sensivel" CHECK ("documento"."tipo" not in ('ATESTADO_AFASTAMENTO', 'DISPENSA_DURACAO') or "documento"."sensivel"),
	CONSTRAINT "documento_escopo_definido" CHECK (num_nonnulls("documento"."estudante_id", "documento"."estagio_id", "documento"."concedente_id") >= 1),
	CONSTRAINT "documento_eliminacao_consistente" CHECK (("documento"."eliminado_em" is null) = ("documento"."eliminado_por_usuario_id" is null))
);
--> statement-breakpoint
ALTER TABLE "convenio" ADD CONSTRAINT "convenio_concedente_id_concedente_id_fk" FOREIGN KEY ("concedente_id") REFERENCES "public"."concedente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convenio_vigencia" ADD CONSTRAINT "convenio_vigencia_convenio_id_convenio_id_fk" FOREIGN KEY ("convenio_id") REFERENCES "public"."convenio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convenio_vigencia" ADD CONSTRAINT "convenio_vigencia_documento_id_documento_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convenio_vigencia" ADD CONSTRAINT "convenio_vigencia_registrado_por_usuario_id_usuario_id_fk" FOREIGN KEY ("registrado_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento" ADD CONSTRAINT "documento_estudante_id_estudante_id_fk" FOREIGN KEY ("estudante_id") REFERENCES "public"."estudante"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento" ADD CONSTRAINT "documento_concedente_id_concedente_id_fk" FOREIGN KEY ("concedente_id") REFERENCES "public"."concedente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento" ADD CONSTRAINT "documento_eliminado_por_usuario_id_usuario_id_fk" FOREIGN KEY ("eliminado_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento" ADD CONSTRAINT "documento_enviado_por_usuario_id_usuario_id_fk" FOREIGN KEY ("enviado_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "convenio_concedente_idx" ON "convenio" USING btree ("concedente_id");--> statement-breakpoint
CREATE INDEX "convenio_vigencia_fim_idx" ON "convenio_vigencia" USING btree ("convenio_id","vigencia_fim");--> statement-breakpoint
CREATE INDEX "convenio_vigencia_documento_idx" ON "convenio_vigencia" USING btree ("documento_id");--> statement-breakpoint
CREATE INDEX "convenio_vigencia_registrado_por_idx" ON "convenio_vigencia" USING btree ("registrado_por_usuario_id");--> statement-breakpoint
CREATE INDEX "documento_estudante_idx" ON "documento" USING btree ("estudante_id");--> statement-breakpoint
CREATE INDEX "documento_estagio_idx" ON "documento" USING btree ("estagio_id");--> statement-breakpoint
CREATE INDEX "documento_concedente_idx" ON "documento" USING btree ("concedente_id");--> statement-breakpoint
CREATE INDEX "documento_sha256_idx" ON "documento" USING btree ("sha256");--> statement-breakpoint
CREATE INDEX "documento_guarda_idx" ON "documento" USING btree ("data_liberacao_guarda") WHERE "documento"."eliminado_em" is null;--> statement-breakpoint
CREATE INDEX "documento_enviado_por_idx" ON "documento" USING btree ("enviado_por_usuario_id");--> statement-breakpoint
CREATE INDEX "documento_eliminado_por_idx" ON "documento" USING btree ("eliminado_por_usuario_id");
--> statement-breakpoint
-- Not expressible in the Drizzle schema: kept here, by hand (DER-LOGICO §4.3)
ALTER TABLE "convenio_vigencia" ADD CONSTRAINT "convenio_vigencia_renova_fk" FOREIGN KEY ("renova_vigencia_id") REFERENCES "public"."convenio_vigencia"("id");--> statement-breakpoint
ALTER TABLE "convenio_vigencia" ADD CONSTRAINT "convenio_vigencia_sem_sobreposicao" EXCLUDE USING gist ("convenio_id" WITH =, daterange("vigencia_inicio", "vigencia_fim", '[]') WITH &&);
