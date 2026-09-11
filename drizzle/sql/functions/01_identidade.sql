-- Identity and link helpers consumed by RLS policies (RF003, RN-37).
-- Helpers that read link tables are SECURITY DEFINER: they run as the table owner, so a
-- policy on vinculo_perfil can call them without recursing into its own policy.
-- Every function pins search_path to '' and schema-qualifies names, so a caller cannot
-- shadow public objects to hijack a definer function.

create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to app_runtime, auth_runtime;
alter default privileges in schema app revoke execute on functions from public;

-- Set per transaction by src/db/with-user.ts through set_config('app.user_id', ..., true).
-- After a transaction ends the setting reads as '', hence nullif.
create or replace function app.usuario_atual_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create or replace function app.tem_perfil_vigente(p_perfil public.perfil)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.vinculo_perfil v
    join public.usuario u on u.id = v.usuario_id
    where v.usuario_id = app.usuario_atual_id()
      and v.perfil = p_perfil
      and u.situacao = 'ATIVO'
      and v.vigencia_inicio <= now()
      and (v.vigencia_fim is null or v.vigencia_fim > now())
  )
$$;

-- Coordination reaches students and records of the courses it coordinates (RN-37)
create or replace function app.coordena_curso(p_curso_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.vinculo_perfil v
    join public.usuario u on u.id = v.usuario_id
    where v.usuario_id = app.usuario_atual_id()
      and v.perfil = 'COORDENACAO'
      and v.curso_id = p_curso_id
      and u.situacao = 'ATIVO'
      and v.vigencia_inicio <= now()
      and (v.vigencia_fim is null or v.vigencia_fim > now())
  )
$$;

create or replace function app.coordena_estudante_usuario(p_usuario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.estudante e
    where e.usuario_id = p_usuario_id
      and app.coordena_curso(e.curso_id)
  )
$$;

revoke all on function app.usuario_atual_id() from public;
revoke all on function app.tem_perfil_vigente(public.perfil) from public;
revoke all on function app.coordena_curso(uuid) from public;
revoke all on function app.coordena_estudante_usuario(uuid) from public;

grant execute on function app.usuario_atual_id() to app_runtime;
grant execute on function app.tem_perfil_vigente(public.perfil) to app_runtime;
grant execute on function app.coordena_curso(uuid) to app_runtime;
grant execute on function app.coordena_estudante_usuario(uuid) to app_runtime;
