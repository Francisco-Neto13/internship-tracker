-- Reverts 0007_relatorios (RF036 to RF041). Removes every report, version, attachment link and
-- opinion, and the periodicity of the courses: export them first (pg_dump -t relatorio
-- -t versao_relatorio -t anexo_relatorio -t parecer_relatorio -t periodicidade_relatorio).
-- The attached documents and the audit trail stay. tipo_estagio belongs to 0005 and stays.
drop trigger if exists gerar_relatorios on public.estagio;
drop table if exists public.parecer_relatorio;
drop table if exists public.anexo_relatorio;
drop table if exists public.versao_relatorio;
drop table if exists public.relatorio;
drop table if exists public.periodicidade_relatorio;
drop type if exists public.decisao_parecer;
drop type if exists public.situacao_relatorio;
drop type if exists public.tipo_relatorio;
