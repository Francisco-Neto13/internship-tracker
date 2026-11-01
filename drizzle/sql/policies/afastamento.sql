-- M04 Afastamento (RF030, RF059, RF060, RN-38; DER-LOGICO §4.4)
-- The leave row carries the type and a description that may be health data: only the
-- student, the advisor and the coordination read it (app.estagios_legiveis(true)). Supervisor
-- and concedente see only the dates, through app.periodos_afastamento. The coordination
-- inserts; corrections are new rows, and the previous one is marked by the trigger as owner,
-- so app_runtime has no UPDATE.
alter table public.afastamento enable row level security;

grant select, insert on public.afastamento to app_runtime;

create policy afastamento_leitura on public.afastamento for select to app_runtime
  using (estagio_id in (select app.estagios_legiveis(true)));

create policy afastamento_insercao on public.afastamento for insert to app_runtime with check (
  registrado_por_usuario_id = (select app.usuario_atual_id())
  and app.coordena_curso_do_estagio(estagio_id)
);
