-- Reverts 0010_atividades (RF046 to RF055). Removes every complementary activity, proof link and
-- analysis: export them first (pg_dump -t atividade_complementar -t comprovante_atividade
-- -t analise_atividade). The proof documents and the audit trail stay.
drop table if exists public.analise_atividade;
drop table if exists public.comprovante_atividade;
drop table if exists public.atividade_complementar;
drop type if exists public.decisao_analise;
drop type if exists public.situacao_atividade;
