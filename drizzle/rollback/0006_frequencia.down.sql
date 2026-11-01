-- Reverts 0006_frequencia (RF023 to RF030). Removes every frequency entry, homologation and
-- divergence case: export them first (pg_dump -t registro_frequencia -t homologacao_frequencia
-- -t divergencia_carga_horaria). The audit trail stays.
drop table if exists public.divergencia_carga_horaria;
drop table if exists public.registro_frequencia;
drop table if exists public.homologacao_frequencia;
drop type if exists public.situacao_divergencia;
drop type if exists public.situacao_frequencia;
