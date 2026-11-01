-- M04 Rescisão (RF063, RF064, RN-27; DER-LOGICO §4.4): read by whoever reads the internship,
-- inserted by the coordination of the course; immutable (no UPDATE for app_runtime)
alter table public.rescisao enable row level security;

grant select, insert on public.rescisao to app_runtime;

create policy rescisao_leitura on public.rescisao for select to app_runtime
  using (app.pode_ler_estagio(estagio_id));

create policy rescisao_insercao on public.rescisao for insert to app_runtime with check (
  decidido_por_usuario_id = (select app.usuario_atual_id())
  and app.coordena_curso_do_estagio(estagio_id)
);
