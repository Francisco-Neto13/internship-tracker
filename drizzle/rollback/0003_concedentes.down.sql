-- Reverts 0003_concedentes (RF007, RF008, RF013, vinculo_perfil.concedente_id).
-- Fails if estagio or convenio already reference concedente: revert those migrations first.
alter table public.vinculo_perfil drop constraint if exists vinculo_perfil_concedente_exige_concedente;
drop index if exists public.vinculo_perfil_concedente_id_idx;
alter table public.vinculo_perfil drop constraint if exists vinculo_perfil_concedente_id_concedente_id_fk;
alter table public.vinculo_perfil drop column if exists concedente_id;
drop table if exists public.historico_situacao_concedente;
drop table if exists public.concedente;
drop table if exists public.setor_atuacao;
drop table if exists public.porte_concedente;
drop type if exists public.situacao_concedente;
