-- Audit trail written by the database, so no route, script or migration can skip it
-- (RF065, RN-28). The function is SECURITY DEFINER: runtime roles hold no INSERT
-- privilege on auditoria and cannot forge entries.

create or replace function app.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_anteriores jsonb;
  v_novos jsonb;
  v_alterados text[];
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_anteriores := to_jsonb(old);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_novos := to_jsonb(new);
  end if;

  if tg_op = 'UPDATE' then
    select array_agg(n.key order by n.key)
      into v_alterados
      from jsonb_each(v_novos) n
     where n.value is distinct from v_anteriores -> n.key;

    if v_alterados is null then
      return null;
    end if;
  end if;

  insert into public.auditoria (usuario_id, tabela, registro_id, operacao, dados_anteriores, dados_novos, campos_alterados)
  values (
    app.usuario_atual_id(),
    tg_table_name,
    coalesce(v_novos ->> 'id', v_anteriores ->> 'id'),
    tg_op,
    v_anteriores,
    v_novos,
    v_alterados
  );

  return null;
end
$$;

-- RN-28: the trail is append-only for every role, the owner included
create or replace function app.bloquear_alteracao_auditoria()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'auditoria aceita apenas inclusao (RN-28): % bloqueado', tg_op
    using errcode = 'insufficient_privilege';
end
$$;

create or replace function app.definir_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end
$$;

revoke all on function app.registrar_auditoria() from public;
revoke all on function app.bloquear_alteracao_auditoria() from public;
revoke all on function app.definir_atualizado_em() from public;
