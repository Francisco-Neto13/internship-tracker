-- Reverts 0005_estagios (RF015 to RF021, RF031 to RF035). Removes every internship and
-- its TCE data: export them first (pg_dump -t estagio -t aditivo ...). The audit trail stays.
alter table public.documento drop constraint if exists documento_estagio_id_estagio_id_fk;
drop table if exists public.responsavel_estagio;
drop table if exists public.apolice_seguro;
drop table if exists public.assinatura;
drop table if exists public.aditivo;
drop table if exists public.plano_atividades;
drop table if exists public.estagio;
-- Functions whose signature uses the types below (drizzle/sql recreates them on migrate)
drop function if exists app.e_responsavel_vigente(uuid, public.papel_responsavel);
drop function if exists app.pode_assinar(uuid, public.parte_assinatura);
drop function if exists app.historico_estagios_concedente(uuid);
drop type if exists public.papel_responsavel;
drop type if exists public.situacao_aditivo;
drop type if exists public.tipo_aditivo;
drop type if exists public.parte_assinatura;
drop type if exists public.situacao_plano;
drop type if exists public.situacao_estagio;
drop type if exists public.tipo_estagio;
