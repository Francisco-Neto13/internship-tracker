ALTER TABLE "usuario" ADD COLUMN "troca_senha_obrigatoria" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "senha_provisoria_expira_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_expiracao_so_com_troca_pendente" CHECK ("usuario"."troca_senha_obrigatoria" or "usuario"."senha_provisoria_expira_em" is null);