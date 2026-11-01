-- Reverts 0011_integralizacao (RF056, RF057). Removes every assessment; they are derived data and
-- are recalculated from activities and internships when the migration is applied again (the
-- next event or POST /estudantes/{id}/integralizacao/apuracao).
drop trigger if exists reapurar_por_atividade on public.atividade_complementar;
drop trigger if exists reapurar_por_estagio on public.estagio;
drop trigger if exists reapurar_por_exigencia_insercao on public.exigencia_categoria;
drop trigger if exists reapurar_por_exigencia_alteracao on public.exigencia_categoria;
drop trigger if exists reapurar_por_curso on public.curso;
drop table if exists public.apuracao_categoria;
drop table if exists public.apuracao_integralizacao;
-- Functions whose signature uses the types below (drizzle/sql recreates them on migrate)
drop function if exists app.apurar_integralizacao(uuid, public.gatilho_apuracao);
drop type if exists public.gatilho_apuracao;
drop type if exists public.situacao_categoria_integralizacao;
drop type if exists public.situacao_integralizacao;
