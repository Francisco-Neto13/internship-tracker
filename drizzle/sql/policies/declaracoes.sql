-- M07 Declarações (RF058): the student and the coordination of its course read and issue;
-- immutable (no UPDATE for app_runtime). Facts and author are checked by app.validar_declaracao.
alter table public.declaracao enable row level security;

grant select, insert on public.declaracao to app_runtime;

create policy declaracao_leitura on public.declaracao for select to app_runtime
  using (estudante_id in (select app.estudantes_legiveis()));

create policy declaracao_insercao on public.declaracao for insert to app_runtime with check (
  emitida_por_usuario_id = (select app.usuario_atual_id())
  and app.pode_emitir_declaracao(estudante_id)
);
