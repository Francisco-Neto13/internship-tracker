CREATE TYPE "public"."situacao_academica" AS ENUM('MATRICULADO', 'TRANCADO', 'FORMADO', 'DESLIGADO');--> statement-breakpoint
CREATE TYPE "public"."perfil" AS ENUM('ESTUDANTE', 'PROFESSOR_ORIENTADOR', 'SUPERVISOR', 'COORDENACAO', 'CONCEDENTE', 'ADMINISTRADOR');--> statement-breakpoint
CREATE TYPE "public"."situacao_usuario" AS ENUM('ATIVO', 'INATIVO');--> statement-breakpoint
CREATE TABLE "curso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"carga_minima_estagio_minutos" integer NOT NULL,
	"carga_atividades_complementares_minutos" integer NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curso_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "curso_carga_minima_estagio_nao_negativa" CHECK ("curso"."carga_minima_estagio_minutos" >= 0),
	CONSTRAINT "curso_carga_complementares_nao_negativa" CHECK ("curso"."carga_atividades_complementares_minutos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "estudante" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"curso_id" uuid NOT NULL,
	"matricula" text NOT NULL,
	"periodo" smallint NOT NULL,
	"situacao_academica" "situacao_academica" DEFAULT 'MATRICULADO' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "estudante_usuario_id_unique" UNIQUE("usuario_id"),
	CONSTRAINT "estudante_matricula_unique" UNIQUE("matricula"),
	CONSTRAINT "estudante_periodo_valido" CHECK ("estudante"."periodo" between 1 and 20)
);
--> statement-breakpoint
CREATE TABLE "conta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"provedor_id" text NOT NULL,
	"conta_id" text NOT NULL,
	"senha_hash" text,
	"token_acesso" text,
	"token_atualizacao" text,
	"token_id" text,
	"token_acesso_expira_em" timestamp with time zone,
	"token_atualizacao_expira_em" timestamp with time zone,
	"escopo" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "limite_requisicao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chave" text NOT NULL,
	"contador" integer NOT NULL,
	"ultima_requisicao" bigint NOT NULL,
	CONSTRAINT "limite_requisicao_chave_unique" UNIQUE("chave")
);
--> statement-breakpoint
CREATE TABLE "sessao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"endereco_ip" text,
	"agente_usuario" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessao_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"email_verificado" boolean DEFAULT false NOT NULL,
	"imagem" text,
	"situacao" "situacao_usuario" DEFAULT 'ATIVO' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_email_unique" UNIQUE("email"),
	CONSTRAINT "usuario_email_minusculo" CHECK ("usuario"."email" = lower("usuario"."email"))
);
--> statement-breakpoint
CREATE TABLE "verificacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identificador" text NOT NULL,
	"valor" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vinculo_perfil" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"perfil" "perfil" NOT NULL,
	"curso_id" uuid,
	"vigencia_inicio" timestamp with time zone DEFAULT now() NOT NULL,
	"vigencia_fim" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vinculo_perfil_coordenacao_exige_curso" CHECK ("vinculo_perfil"."perfil" <> 'COORDENACAO' or "vinculo_perfil"."curso_id" is not null),
	CONSTRAINT "vinculo_perfil_vigencia_valida" CHECK ("vinculo_perfil"."vigencia_fim" is null or "vinculo_perfil"."vigencia_fim" > "vinculo_perfil"."vigencia_inicio")
);
--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "auditoria_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"ocorrido_em" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"usuario_id" uuid,
	"tabela" text NOT NULL,
	"registro_id" text NOT NULL,
	"operacao" text NOT NULL,
	"dados_anteriores" jsonb,
	"dados_novos" jsonb,
	"campos_alterados" text[],
	CONSTRAINT "auditoria_operacao_valida" CHECK ("auditoria"."operacao" in ('INSERT', 'UPDATE', 'DELETE'))
);
--> statement-breakpoint
ALTER TABLE "estudante" ADD CONSTRAINT "estudante_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estudante" ADD CONSTRAINT "estudante_curso_id_curso_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."curso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conta" ADD CONSTRAINT "conta_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessao" ADD CONSTRAINT "sessao_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vinculo_perfil" ADD CONSTRAINT "vinculo_perfil_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vinculo_perfil" ADD CONSTRAINT "vinculo_perfil_curso_id_curso_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."curso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "estudante_curso_id_idx" ON "estudante" USING btree ("curso_id");--> statement-breakpoint
CREATE INDEX "conta_usuario_id_idx" ON "conta" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conta_provedor_conta_unico" ON "conta" USING btree ("provedor_id","conta_id");--> statement-breakpoint
CREATE INDEX "sessao_usuario_id_idx" ON "sessao" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "verificacao_identificador_idx" ON "verificacao" USING btree ("identificador");--> statement-breakpoint
CREATE INDEX "vinculo_perfil_usuario_perfil_idx" ON "vinculo_perfil" USING btree ("usuario_id","perfil");--> statement-breakpoint
CREATE INDEX "vinculo_perfil_curso_id_idx" ON "vinculo_perfil" USING btree ("curso_id");--> statement-breakpoint
CREATE INDEX "auditoria_tabela_registro_idx" ON "auditoria" USING btree ("tabela","registro_id");--> statement-breakpoint
CREATE INDEX "auditoria_usuario_id_idx" ON "auditoria" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "auditoria_ocorrido_em_idx" ON "auditoria" USING btree ("ocorrido_em");