-- Reverts 0014_rescisao (RF063, RF064). Removes the rescission records; the internships stay
-- RESCINDIDO with encerrado_em, and the cancelled entries stay cancelled (export first:
-- pg_dump -t rescisao). Then run npm run db:migrate from the previous commit, which recreates
-- 07_estagios without the rescission check.
drop trigger if exists registrar_encerramento on public.estagio;
drop table if exists public.rescisao;
drop function if exists app.validar_rescisao();
drop function if exists app.aplicar_rescisao();
drop function if exists app.encerrar_estagio();
drop function if exists app.bloquear_alteracao_rescisao();
drop type if exists public.parte_rescisao;
