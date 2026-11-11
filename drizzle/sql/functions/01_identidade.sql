-- Identity and link helpers consumed by RLS policies (RF003, RN-37).
-- Helpers that read link tables are SECURITY DEFINER: they run as the table owner, so a
-- policy on vinculo_perfil can call them without recursing into its own policy.
-- Every function pins search_path to '' and schema-qualifies names, so a caller cannot
-- shadow public objects to hijack a definer function.

create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to app_runtime, auth_runtime;
alter default privileges in schema app revoke execute on functions from public;

-- Set per transaction by src/db/with-user.ts through set_config('app.usuario_id', ..., true).
-- After a transaction ends the setting reads as '', hence nullif.
create or replace function app.usuario_atual_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('app.usuario_id', true), '')::uuid
$$;

-- RF003: set with app.usuario_id by src/db/with-user.ts while an administrator views the system
-- as another account. It only takes reach away (report content, documents), so a caller that
-- sets it on its own gains nothing.
create or replace function app.em_contexto_administrador()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(current_setting('app.contexto_administrador', true), '') = 'on'
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

-- RF005, issue #80: the account to link when registering a student. Coordination has no policy on
-- accounts outside its students, so it finds them here: active, with a current Estudante profile
-- and no academic record yet, at least two characters typed, the text taken literally.
create or replace function app.buscar_contas_estudante(p_busca text)
returns table (id uuid, nome text, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.nome, u.email
  from public.usuario u
  where (app.tem_perfil_vigente('COORDENACAO') or app.tem_perfil_vigente('ADMINISTRADOR'))
    and length(trim(p_busca)) >= 2
    and u.situacao = 'ATIVO'
    and exists (
      select 1 from public.vinculo_perfil v
      where v.usuario_id = u.id and v.perfil = 'ESTUDANTE'
        and v.vigencia_inicio <= now() and (v.vigencia_fim is null or v.vigencia_fim > now())
    )
    and not exists (select 1 from public.estudante e where e.usuario_id = u.id)
    and (
      u.nome ilike '%' || replace(replace(replace(trim(p_busca), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      or u.email ilike '%' || replace(replace(replace(trim(p_busca), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
  order by u.nome, u.email
  limit 8
$$;

revoke all on function app.buscar_contas_estudante(text) from public;
grant execute on function app.buscar_contas_estudante(text) to app_runtime;

revoke all on function app.usuario_atual_id() from public;
revoke all on function app.em_contexto_administrador() from public;
revoke all on function app.tem_perfil_vigente(public.perfil) from public;
revoke all on function app.coordena_curso(uuid) from public;
revoke all on function app.coordena_estudante_usuario(uuid) from public;

grant execute on function app.usuario_atual_id() to app_runtime;
grant execute on function app.em_contexto_administrador() to app_runtime;
grant execute on function app.tem_perfil_vigente(public.perfil) to app_runtime;
grant execute on function app.coordena_curso(uuid) to app_runtime;
grant execute on function app.coordena_estudante_usuario(uuid) to app_runtime;
