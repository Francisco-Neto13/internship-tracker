-- M03 Concedentes (RF007, RF008, RF013, RN-31, RN-37)

-- The current user represents the concedente: CONCEDENTE link in force for it
create or replace function app.representa_concedente(p_concedente_id uuid)
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
      and v.perfil = 'CONCEDENTE'
      and v.concedente_id = p_concedente_id
      and u.situacao = 'ATIVO'
      and v.vigencia_inicio <= now()
      and (v.vigencia_fim is null or v.vigencia_fim > now())
  )
$$;

-- RF008 (DER-LOGICO §5.13): situacao changes only with a historico_situacao_concedente row
-- inserted in the same transaction (now() is the transaction start, equal for both rows).
-- A concedente representative edits only the contacts of its own concedente (DER §4.3).
create or replace function app.validar_alteracao_concedente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.situacao is distinct from old.situacao and not exists (
    select 1 from public.historico_situacao_concedente h
     where h.concedente_id = new.id and h.situacao_nova = new.situacao and h.criado_em = now()
  ) then
    raise exception 'SITUACAO_SEM_HISTORICO: a situação da concedente muda só com registro no histórico'
      using errcode = 'P0001';
  end if;

  if app.usuario_atual_id() is not null
     and not app.tem_perfil_vigente('ADMINISTRADOR')
     and not app.tem_perfil_vigente('COORDENACAO')
     and (to_jsonb(new) - array['email_contato', 'telefone_contato', 'atualizado_em'])
         is distinct from (to_jsonb(old) - array['email_contato', 'telefone_contato', 'atualizado_em']) then
    raise exception 'ALTERACAO_RESTRITA_A_CONTATOS: a concedente edita apenas os próprios contatos'
      using errcode = 'P0001';
  end if;

  return new;
end
$$;

revoke all on function app.representa_concedente(uuid) from public;
revoke all on function app.validar_alteracao_concedente() from public;
grant execute on function app.representa_concedente(uuid) to app_runtime;
