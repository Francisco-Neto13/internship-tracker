-- M07 Integralização (RF056, RF057, RN-24; DER-LOGICO §4.7). The student and the coordination
-- of its course read. Nobody inserts through a grant: app.apurar_integralizacao writes, so an
-- assessment always comes from the one calculation.

alter table public.apuracao_integralizacao enable row level security;

grant select on public.apuracao_integralizacao to app_runtime;

create policy apuracao_leitura on public.apuracao_integralizacao for select to app_runtime
  using (estudante_id in (select app.estudantes_legiveis()));

alter table public.apuracao_categoria enable row level security;

grant select on public.apuracao_categoria to app_runtime;

-- Follows the assessment it belongs to (the subquery runs under the policy above)
create policy apuracao_categoria_leitura on public.apuracao_categoria for select to app_runtime
  using (apuracao_id in (select a.id from public.apuracao_integralizacao a));
