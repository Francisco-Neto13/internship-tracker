-- Reverts 0015_declaracao (RF058). Removes the declaration records; their PDFs stay as
-- DECLARACAO documents (export first: pg_dump -t declaracao). Then run npm run db:migrate
-- from the previous commit.
drop table if exists public.declaracao;
drop function if exists app.dados_declaracao(public.tipo_declaracao, uuid, uuid);
drop function if exists app.verificar_declaracao(text);
drop function if exists app.validar_declaracao();
drop function if exists app.pode_emitir_declaracao(uuid);
drop function if exists app.apuracao_atividades_cumpridas(uuid);
drop type if exists public.tipo_declaracao;
