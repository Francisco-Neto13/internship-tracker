-- M05 Relatórios (RF036 to RF041, RN-37; DER-LOGICO §4.5). The student, the advisor in force
-- and the coordination read; supervisor, concedente and administrator do not. Rows are
-- inserted by the generation (owner) or by sending and analysis, validated by the triggers of
-- functions/09_relatorios.sql; nobody updates a report directly.

-- periodicidade_relatorio (RF036, M02): everyone reads; administrator or coordination of the course sets
alter table public.periodicidade_relatorio enable row level security;

grant select, insert on public.periodicidade_relatorio to app_runtime;
grant update (intervalo_meses, prazo_entrega_dias, prazo_relatorio_final_dias) on public.periodicidade_relatorio to app_runtime;

create policy periodicidade_leitura on public.periodicidade_relatorio for select to app_runtime
  using ((select app.usuario_atual_id()) is not null);

create policy periodicidade_insercao on public.periodicidade_relatorio for insert to app_runtime
  with check ((select app.tem_perfil_vigente('ADMINISTRADOR')) or app.coordena_curso(curso_id));

create policy periodicidade_atualizacao on public.periodicidade_relatorio for update to app_runtime
  using ((select app.tem_perfil_vigente('ADMINISTRADOR')) or app.coordena_curso(curso_id))
  with check ((select app.tem_perfil_vigente('ADMINISTRADOR')) or app.coordena_curso(curso_id));

-- relatorio: read only; generation and situation by trigger
alter table public.relatorio enable row level security;

grant select on public.relatorio to app_runtime;

create policy relatorio_leitura on public.relatorio for select to app_runtime
  using (app.pode_ler_relatorios(estagio_id));

-- versao_relatorio (RF037, RF039): the student sends
alter table public.versao_relatorio enable row level security;

grant select, insert on public.versao_relatorio to app_runtime;

create policy versao_relatorio_leitura on public.versao_relatorio for select to app_runtime
  using (app.pode_ler_relatorios(app.estagio_do_relatorio(relatorio_id)));

create policy versao_relatorio_insercao on public.versao_relatorio for insert to app_runtime with check (
  enviado_por_usuario_id = (select app.usuario_atual_id())
  and app.e_estudante_do_estagio(app.estagio_do_relatorio(relatorio_id))
);

-- anexo_relatorio (RF037): together with the version
alter table public.anexo_relatorio enable row level security;

grant select, insert on public.anexo_relatorio to app_runtime;

create policy anexo_relatorio_leitura on public.anexo_relatorio for select to app_runtime
  using (app.pode_ler_relatorios(app.estagio_da_versao(versao_relatorio_id)));

create policy anexo_relatorio_insercao on public.anexo_relatorio for insert to app_runtime
  with check (app.e_estudante_do_estagio(app.estagio_da_versao(versao_relatorio_id)));

-- parecer_relatorio (RF038): the advisor in force
alter table public.parecer_relatorio enable row level security;

grant select, insert on public.parecer_relatorio to app_runtime;

create policy parecer_relatorio_leitura on public.parecer_relatorio for select to app_runtime
  using (app.pode_ler_relatorios(app.estagio_da_versao(versao_relatorio_id)));

create policy parecer_relatorio_insercao on public.parecer_relatorio for insert to app_runtime with check (
  emitido_por_usuario_id = (select app.usuario_atual_id())
  and app.e_responsavel_vigente(app.estagio_da_versao(versao_relatorio_id), 'ORIENTADOR')
);
