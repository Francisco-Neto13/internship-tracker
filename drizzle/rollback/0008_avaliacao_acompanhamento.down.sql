-- Reverts 0008_avaliacao_acompanhamento (RF033, RF042, RF043). Removes every evaluation, grade,
-- criterion and follow-up record: export them first (pg_dump -t avaliacao_desempenho
-- -t resposta_avaliacao -t criterio_avaliacao -t acompanhamento). The audit trail stays.
drop table if exists public.resposta_avaliacao;
drop table if exists public.avaliacao_desempenho;
drop table if exists public.criterio_avaliacao;
drop table if exists public.acompanhamento;
drop type if exists public.tipo_acompanhamento;
drop type if exists public.momento_avaliacao;
