-- M05 Avaliação (RF042, RF043, RN-15) e acompanhamento (RF033, RN-11); DER-LOGICO §4.5

-- criterio_avaliacao: everyone reads the form; the administrator defines the criteria
alter table public.criterio_avaliacao enable row level security;

grant select, insert on public.criterio_avaliacao to app_runtime;
grant update (descricao, escala_minima, escala_maxima, ordem, ativo) on public.criterio_avaliacao to app_runtime;

create policy criterio_leitura on public.criterio_avaliacao for select to app_runtime
  using ((select app.usuario_atual_id()) is not null);

create policy criterio_insercao on public.criterio_avaliacao for insert to app_runtime
  with check ((select app.tem_perfil_vigente('ADMINISTRADOR')));

create policy criterio_atualizacao on public.criterio_avaliacao for update to app_runtime
  using ((select app.tem_perfil_vigente('ADMINISTRADOR')))
  with check ((select app.tem_perfil_vigente('ADMINISTRADOR')));

-- avaliacao_desempenho: read by the internship's people; written by the supervisor or the
-- concedente; immutable
alter table public.avaliacao_desempenho enable row level security;

grant select, insert on public.avaliacao_desempenho to app_runtime;

create policy avaliacao_leitura on public.avaliacao_desempenho for select to app_runtime
  using (app.pode_ler_estagio(estagio_id));

create policy avaliacao_insercao on public.avaliacao_desempenho for insert to app_runtime with check (
  avaliador_usuario_id = (select app.usuario_atual_id())
  and (app.e_responsavel_vigente(estagio_id, 'SUPERVISOR') or app.representa_concedente_do_estagio(estagio_id))
);

-- resposta_avaliacao: follows the evaluation
alter table public.resposta_avaliacao enable row level security;

grant select, insert on public.resposta_avaliacao to app_runtime;

create policy resposta_avaliacao_leitura on public.resposta_avaliacao for select to app_runtime
  using (app.pode_ler_estagio(app.estagio_da_avaliacao(avaliacao_id)));

create policy resposta_avaliacao_insercao on public.resposta_avaliacao for insert to app_runtime
  with check (app.e_avaliador(avaliacao_id));

-- acompanhamento (RF033): the advisor in force and the coordination read; the advisor records
alter table public.acompanhamento enable row level security;

grant select, insert on public.acompanhamento to app_runtime;
grant update (tipo, data_ocorrencia, participantes, observacoes) on public.acompanhamento to app_runtime;

create policy acompanhamento_leitura on public.acompanhamento for select to app_runtime using (
  app.e_responsavel_vigente(estagio_id, 'ORIENTADOR') or app.coordena_curso_do_estagio(estagio_id)
);

create policy acompanhamento_insercao on public.acompanhamento for insert to app_runtime with check (
  registrado_por_usuario_id = (select app.usuario_atual_id())
  and app.e_responsavel_vigente(estagio_id, 'ORIENTADOR')
);

create policy acompanhamento_atualizacao on public.acompanhamento for update to app_runtime
  using (registrado_por_usuario_id = (select app.usuario_atual_id()))
  with check (registrado_por_usuario_id = (select app.usuario_atual_id()));
