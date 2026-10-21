CREATE TYPE "public"."situacao_concedente" AS ENUM('ATIVA', 'SUSPENSA');--> statement-breakpoint
CREATE TABLE "concedente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"razao_social" text NOT NULL,
	"nome_fantasia" text,
	"cnpj" text NOT NULL,
	"logradouro" text NOT NULL,
	"numero_endereco" text NOT NULL,
	"complemento" text,
	"bairro" text NOT NULL,
	"municipio" text NOT NULL,
	"uf" text NOT NULL,
	"cep" text NOT NULL,
	"email_contato" text NOT NULL,
	"telefone_contato" text,
	"representante_legal_nome" text NOT NULL,
	"representante_legal_cargo" text,
	"area_atuacao" text NOT NULL,
	"porte_id" uuid,
	"setor_atuacao_id" uuid,
	"situacao" "situacao_concedente" DEFAULT 'ATIVA' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "concedente_cnpj_unique" UNIQUE("cnpj"),
	CONSTRAINT "concedente_cnpj_formato" CHECK ("concedente"."cnpj" ~ '^[0-9A-Z]{12}[0-9]{2}$'),
	CONSTRAINT "concedente_uf_formato" CHECK ("concedente"."uf" ~ '^[A-Z]{2}$'),
	CONSTRAINT "concedente_cep_formato" CHECK ("concedente"."cep" ~ '^[0-9]{8}$')
);
--> statement-breakpoint
CREATE TABLE "historico_situacao_concedente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"concedente_id" uuid NOT NULL,
	"situacao_nova" "situacao_concedente" NOT NULL,
	"motivo" text,
	"decidido_por_usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "historico_suspensao_exige_motivo" CHECK ("historico_situacao_concedente"."situacao_nova" <> 'SUSPENSA' or "historico_situacao_concedente"."motivo" is not null)
);
--> statement-breakpoint
CREATE TABLE "porte_concedente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "setor_atuacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vinculo_perfil" ADD COLUMN "concedente_id" uuid;--> statement-breakpoint
ALTER TABLE "concedente" ADD CONSTRAINT "concedente_porte_id_porte_concedente_id_fk" FOREIGN KEY ("porte_id") REFERENCES "public"."porte_concedente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concedente" ADD CONSTRAINT "concedente_setor_atuacao_id_setor_atuacao_id_fk" FOREIGN KEY ("setor_atuacao_id") REFERENCES "public"."setor_atuacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_situacao_concedente" ADD CONSTRAINT "historico_situacao_concedente_concedente_id_concedente_id_fk" FOREIGN KEY ("concedente_id") REFERENCES "public"."concedente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_situacao_concedente" ADD CONSTRAINT "historico_situacao_concedente_decidido_por_usuario_id_usuario_id_fk" FOREIGN KEY ("decidido_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "concedente_porte_idx" ON "concedente" USING btree ("porte_id");--> statement-breakpoint
CREATE INDEX "concedente_setor_idx" ON "concedente" USING btree ("setor_atuacao_id");--> statement-breakpoint
CREATE INDEX "concedente_situacao_idx" ON "concedente" USING btree ("situacao");--> statement-breakpoint
CREATE INDEX "historico_situacao_concedente_idx" ON "historico_situacao_concedente" USING btree ("concedente_id","criado_em");--> statement-breakpoint
CREATE INDEX "historico_situacao_decidido_por_idx" ON "historico_situacao_concedente" USING btree ("decidido_por_usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "porte_concedente_nome_unique" ON "porte_concedente" USING btree (lower("nome"));--> statement-breakpoint
CREATE UNIQUE INDEX "setor_atuacao_nome_unique" ON "setor_atuacao" USING btree (lower("nome"));--> statement-breakpoint
ALTER TABLE "vinculo_perfil" ADD CONSTRAINT "vinculo_perfil_concedente_id_concedente_id_fk" FOREIGN KEY ("concedente_id") REFERENCES "public"."concedente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vinculo_perfil_concedente_id_idx" ON "vinculo_perfil" USING btree ("concedente_id") WHERE "vinculo_perfil"."concedente_id" is not null;--> statement-breakpoint
-- NOT VALID first: rows created outside the API before this migration must not break it.
-- New and updated rows are checked at once; existing ones are validated when consistent.
ALTER TABLE "vinculo_perfil" ADD CONSTRAINT "vinculo_perfil_concedente_exige_concedente" CHECK (("vinculo_perfil"."perfil" in ('CONCEDENTE', 'SUPERVISOR')) = ("vinculo_perfil"."concedente_id" is not null)) NOT VALID;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "vinculo_perfil"
     WHERE ("perfil" in ('CONCEDENTE', 'SUPERVISOR')) <> ("concedente_id" is not null)
  ) THEN
    ALTER TABLE "vinculo_perfil" VALIDATE CONSTRAINT "vinculo_perfil_concedente_exige_concedente";
  END IF;
END $$;