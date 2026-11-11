-- RF003: the administrator acts as another account through the switch (src/lib/session.ts).
-- The row is the record of the switch: who, as whom, from when to when. It is never deleted,
-- and only encerrado_em changes, once.

-- Security definer: it runs before the policy and must see the account whoever the caller is,
-- so a refusal by profile reads as such. A missing account is left to the foreign key.
create or replace function app.validar_contexto_administrador()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from public.usuario u where u.id = new.usuario_id and u.situacao <> 'ATIVO') then
      raise exception 'CONTA_INATIVA: só se vê o sistema como uma conta ativa';
    end if;
    new.iniciado_em := now();
    new.encerrado_em := null;
    return new;
  end if;

  if old.encerrado_em is not null
     or new.encerrado_em is null
     or (new.id, new.administrador_id, new.usuario_id, new.sessao_id, new.iniciado_em)
        is distinct from (old.id, old.administrador_id, old.usuario_id, old.sessao_id, old.iniciado_em) then
    raise exception 'CONTEXTO_IMUTAVEL: a troca de perfil só pode ser encerrada, uma vez';
  end if;
  new.encerrado_em := now();
  return new;
end
$$;

revoke all on function app.validar_contexto_administrador() from public;

-- RF003, RN-28: the administrator acting through the switch, for the audit trail. withUser sets
-- app.titular_id with app.usuario_id; the value counts only while that administrator has a
-- switch open to the current account, so a caller that sets it on its own cannot pin its writes
-- on someone else. Read by the audit trigger, which runs as owner: no grant to app_runtime.
create or replace function app.titular_atual_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.administrador_id
  from public.contexto_administrador c
  where c.administrador_id = nullif(current_setting('app.titular_id', true), '')::uuid
    and c.usuario_id = app.usuario_atual_id()
    and c.encerrado_em is null
  limit 1
$$;

revoke all on function app.titular_atual_id() from public;
