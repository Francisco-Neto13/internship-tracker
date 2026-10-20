-- M03 Convênios and shared documento (RF009 to RF012, RF069, D8)

-- RF010, RN-02: the agreement is active and one of its periods contains the date.
-- SECURITY DEFINER so the guard works for whoever formalizes the internship (a student
-- does not read agreements); it answers yes or no and exposes no row.
create or replace function app.convenio_vigente_em(p_convenio_id uuid, p_concedente_id uuid, p_data date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.convenio c
    join public.convenio_vigencia v on v.convenio_id = c.id
    where c.id = p_convenio_id
      and c.concedente_id = p_concedente_id
      and c.situacao = 'ATIVO'
      and p_data between v.vigencia_inicio and v.vigencia_fim
  )
$$;

-- documento: content columns never change after insert; only the retention columns do,
-- and an object is marked as eliminated only after its retention date (RF069, RN-30)
create or replace function app.validar_alteracao_documento()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - array['data_liberacao_guarda', 'eliminado_em', 'eliminado_por_usuario_id', 'atualizado_em'])
     is distinct from (to_jsonb(old) - array['data_liberacao_guarda', 'eliminado_em', 'eliminado_por_usuario_id', 'atualizado_em']) then
    raise exception 'REGISTRO_IMUTAVEL: o conteúdo de um documento não muda depois do envio'
      using errcode = 'P0001';
  end if;
  if new.eliminado_em is not null and old.eliminado_em is null
     and (new.data_liberacao_guarda is null or new.data_liberacao_guarda > current_date) then
    raise exception 'EXCLUSAO_BLOQUEADA_GUARDA: prazo de guarda ainda não atingido'
      using errcode = 'P0001';
  end if;
  return new;
end
$$;

revoke all on function app.convenio_vigente_em(uuid, uuid, date) from public;
revoke all on function app.validar_alteracao_documento() from public;
grant execute on function app.convenio_vigente_em(uuid, uuid, date) to app_runtime;

-- D8: who may send a document of this type and scope. Used by the insert policy and by the
-- upload service before it signs an upload URL, so the rule exists once. Estágio-scoped
-- types are added in functions/07_estagios.sql (create or replace of this function).
create or replace function app.pode_enviar_documento(
  p_tipo public.tipo_documento,
  p_concedente_id uuid,
  p_estagio_id uuid,
  p_estudante_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_tipo
    when 'CONVENIO' then
      p_concedente_id is not null and p_estagio_id is null and p_estudante_id is null
      and (app.tem_perfil_vigente('ADMINISTRADOR') or app.tem_perfil_vigente('COORDENACAO'))
    else false
  end
$$;

-- RF071 (RN-38): who may download the file of a document. Metadata visibility is the RLS
-- policy; downloading is narrower: the administrator never downloads sensitive content,
-- and an eliminated object is gone.
create or replace function app.pode_baixar_documento(p_documento_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.documento d
    where d.id = p_documento_id
      and d.eliminado_em is null
      and (
        (d.tipo = 'CONVENIO' and (
          app.tem_perfil_vigente('ADMINISTRADOR') or app.tem_perfil_vigente('COORDENACAO') or app.representa_concedente(d.concedente_id)
        ))
        or (d.enviado_por_usuario_id = app.usuario_atual_id() and not d.sensivel)
      )
  )
$$;

revoke all on function app.pode_enviar_documento(public.tipo_documento, uuid, uuid, uuid) from public;
revoke all on function app.pode_baixar_documento(uuid) from public;
grant execute on function app.pode_enviar_documento(public.tipo_documento, uuid, uuid, uuid) to app_runtime;
grant execute on function app.pode_baixar_documento(uuid) to app_runtime;
