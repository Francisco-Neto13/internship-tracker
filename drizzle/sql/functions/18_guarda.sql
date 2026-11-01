-- Guarda documental (RF069, RN-30, RN-38; DER-LOGICO §5.11)
-- data_liberacao_guarda = end of the document's scope + prazo_guarda_anos in force on that end.
-- Only these functions write it (app_runtime has no UPDATE on documento). Null means the
-- elimination is blocked. A document row is never deleted: after the retention period the
-- administrator removes the object from the storage and the row keeps its hash, marked with
-- eliminado_em. The daily routine warns the administrator (functions/15_notificacoes.sql).

create or replace function app.prazo_guarda_em(p_data date)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.prazo_guarda_anos from public.parametro_institucional p
    where p.vigencia_inicio <= p_data order by p.vigencia_inicio desc limit 1
  ), 5)
$$;

create or replace function app.data_liberacao_guarda(p_encerramento date)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (p_encerramento + make_interval(years => app.prazo_guarda_em(p_encerramento)))::date
$$;

-- Internship scope: called by app.encerrar_estagio (functions/17) on conclusion or rescission
create or replace function app.definir_guarda_estagio(p_estagio_id uuid, p_encerramento date)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.documento set data_liberacao_guarda = app.data_liberacao_guarda(p_encerramento)
  where estagio_id = p_estagio_id and data_liberacao_guarda is null
$$;

-- Student scope without internship (complementary activity proofs): FORMADO or DESLIGADO
create or replace function app.definir_guarda_estudante()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.situacao_academica in ('FORMADO', 'DESLIGADO') and old.situacao_academica is distinct from new.situacao_academica then
    update public.documento set data_liberacao_guarda = app.data_liberacao_guarda(app.hoje())
    where estudante_id = new.id and estagio_id is null and data_liberacao_guarda is null;
  end if;
  return null;
end
$$;

-- Agreement scope: the latest end of its validities; a renewal moves it forward
create or replace function app.definir_guarda_convenio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fim date;
begin
  select max(v.vigencia_fim) into v_fim from public.convenio_vigencia v where v.convenio_id = new.convenio_id;
  update public.documento d set data_liberacao_guarda = app.data_liberacao_guarda(v_fim)
  where d.id in (select v.documento_id from public.convenio_vigencia v where v.convenio_id = new.convenio_id)
    and d.data_liberacao_guarda is distinct from app.data_liberacao_guarda(v_fim);
  return null;
end
$$;

-- A document sent after its scope ended (e.g. a declaration) is born with its date
create or replace function app.definir_guarda_documento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_encerramento date;
begin
  if new.estagio_id is not null then
    select (g.encerrado_em at time zone 'America/Sao_Paulo')::date into v_encerramento
    from public.estagio g where g.id = new.estagio_id;
  elsif new.estudante_id is not null and exists (
    select 1 from public.estudante e where e.id = new.estudante_id and e.situacao_academica in ('FORMADO', 'DESLIGADO')
  ) then
    v_encerramento := app.hoje();
  end if;
  new.data_liberacao_guarda := case when v_encerramento is null then null else app.data_liberacao_guarda(v_encerramento) end;
  new.eliminado_em := null;
  new.eliminado_por_usuario_id := null;
  return new;
end
$$;

create or replace function app.bloquear_exclusao_documento()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'EXCLUSAO_BLOQUEADA_GUARDA: um documento não é apagado; após a guarda só o objeto é eliminado'
    using errcode = 'P0001';
end
$$;

-- RF069: documents whose retention ends until p_ate (null: today), for the administrator only. Metadata
-- without names nor content (RN-38): type, scope, dates.
create or replace function app.documentos_em_guarda(p_ate date)
returns table (
  id uuid,
  tipo public.tipo_documento,
  sensivel boolean,
  escopo text,
  data_liberacao_guarda date,
  criado_em timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.tipo, d.sensivel,
         case when d.estagio_id is not null then 'ESTAGIO' when d.concedente_id is not null then 'CONCEDENTE' else 'ESTUDANTE' end,
         d.data_liberacao_guarda, d.criado_em
  from public.documento d
  where d.data_liberacao_guarda <= coalesce(p_ate, app.hoje()) and d.eliminado_em is null
    and app.tem_perfil_vigente('ADMINISTRADOR')
  order by d.data_liberacao_guarda, d.id
$$;

create or replace function app.exigir_eliminavel(p_documento_id uuid)
returns public.documento
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_documento public.documento%rowtype;
begin
  if not app.tem_perfil_vigente('ADMINISTRADOR') then
    raise exception 'ELIMINACAO_RESTRITA: só o administrador elimina documentos' using errcode = 'P0001';
  end if;
  select * into v_documento from public.documento where id = p_documento_id;
  if not found or v_documento.eliminado_em is not null then
    raise exception 'DOCUMENTO_NAO_ENCONTRADO: documento inexistente ou já eliminado' using errcode = 'P0001';
  end if;
  if v_documento.data_liberacao_guarda is null or v_documento.data_liberacao_guarda > app.hoje() then
    raise exception 'EXCLUSAO_BLOQUEADA_GUARDA: prazo de guarda ainda não atingido' using errcode = 'P0001';
  end if;
  return v_documento;
end
$$;

-- Step 1: the storage key, so the service removes the object first (a failure leaves the row
-- unmarked and the elimination can be retried; removing a missing object is a no-op)
create or replace function app.chave_para_eliminacao(p_documento_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select (app.exigir_eliminavel(p_documento_id)).chave_objeto
$$;

-- Step 2: marks the row, audited with the administrator as author
create or replace function app.eliminar_documento(p_documento_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.exigir_eliminavel(p_documento_id);
  update public.documento set eliminado_em = now(), eliminado_por_usuario_id = app.usuario_atual_id()
  where id = p_documento_id;
  return now();
end
$$;

revoke all on function app.prazo_guarda_em(date) from public;
revoke all on function app.data_liberacao_guarda(date) from public;
revoke all on function app.definir_guarda_estagio(uuid, date) from public;
revoke all on function app.definir_guarda_estudante() from public;
revoke all on function app.definir_guarda_convenio() from public;
revoke all on function app.definir_guarda_documento() from public;
revoke all on function app.bloquear_exclusao_documento() from public;
revoke all on function app.documentos_em_guarda(date) from public;
revoke all on function app.exigir_eliminavel(uuid) from public;
revoke all on function app.chave_para_eliminacao(uuid) from public;
revoke all on function app.eliminar_documento(uuid) from public;

grant execute on function app.documentos_em_guarda(date) to app_runtime;
grant execute on function app.chave_para_eliminacao(uuid) to app_runtime;
grant execute on function app.eliminar_documento(uuid) to app_runtime;
