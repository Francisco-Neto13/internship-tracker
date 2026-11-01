-- Reverts 0013_afastamento (RF030, RF059, RF060). Removes every leave record; the planned end
-- dates they extended stay as they are in estagio (export first: pg_dump -t afastamento).
-- The certificates (documento) and the audit trail stay. Then run npm run db:migrate from the
-- previous commit: it recreates 07_estagios and 08_frequencia without the leave lookups.
drop table if exists public.afastamento;
drop function if exists app.periodos_afastamento(uuid);
drop function if exists app.teto_duracao_estagio(uuid);
drop function if exists app.validar_afastamento();
drop function if exists app.aplicar_afastamento();
drop function if exists app.validar_alteracao_afastamento();
drop function if exists app.exigir_substituto_afastamento();
-- Until the previous drizzle/sql is applied, no day is a leave
create or replace function app.em_afastamento(p_estagio_id uuid, p_data date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select false
$$;
drop type if exists public.situacao_afastamento;
drop type if exists public.tipo_afastamento;
