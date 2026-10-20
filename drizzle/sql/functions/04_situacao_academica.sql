-- RF005: allowed transitions of estudante.situacao_academica (Lei 11.788/2008, art. 3º, I).
-- The domain (src/modules/academico/domain/situacao-academica.ts) reports the error with a
-- clear message; this trigger is the second barrier, so a script, a migration or a new
-- route cannot skip the rule. Keep both tables identical (tests/db/situacao-academica.test.ts).
-- New records start as MATRICULADO; FORMADO and DESLIGADO are final.

create or replace function app.validar_situacao_academica()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.situacao_academica <> 'MATRICULADO' then
      raise exception 'TRANSICAO_SITUACAO_INVALIDA: estudante novo começa como MATRICULADO, recebido %',
        new.situacao_academica using errcode = 'P0001';
    end if;
    return new;
  end if;

  if new.situacao_academica = old.situacao_academica then
    return new;
  end if;

  if (old.situacao_academica, new.situacao_academica) not in (
    ('MATRICULADO'::public.situacao_academica, 'TRANCADO'::public.situacao_academica),
    ('MATRICULADO', 'FORMADO'),
    ('MATRICULADO', 'DESLIGADO'),
    ('TRANCADO', 'MATRICULADO'),
    ('TRANCADO', 'DESLIGADO')
  ) then
    raise exception 'TRANSICAO_SITUACAO_INVALIDA: % para %', old.situacao_academica, new.situacao_academica
      using errcode = 'P0001';
  end if;

  return new;
end
$$;

revoke all on function app.validar_situacao_academica() from public;
