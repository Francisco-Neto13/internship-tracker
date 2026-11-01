-- M03 Convênios (RF009 to RF012, RN-02) and documento (D8, RF069; DER-LOGICO §4.9)

-- convenio: administrator and coordination maintain; the concedente reads its own
alter table public.convenio enable row level security;

grant select, insert on public.convenio to app_runtime;
grant update (observacao, situacao, motivo_encerramento) on public.convenio to app_runtime;

create policy convenio_leitura on public.convenio for select to app_runtime using (
  (select app.tem_perfil_vigente('ADMINISTRADOR'))
  or (select app.tem_perfil_vigente('COORDENACAO'))
  or app.representa_concedente(concedente_id)
);

create policy convenio_insercao on public.convenio for insert to app_runtime with check (
  ((select app.tem_perfil_vigente('ADMINISTRADOR')) or (select app.tem_perfil_vigente('COORDENACAO')))
  and situacao = 'ATIVO'
);

create policy convenio_atualizacao on public.convenio for update to app_runtime
  using ((select app.tem_perfil_vigente('ADMINISTRADOR')) or (select app.tem_perfil_vigente('COORDENACAO')))
  with check ((select app.tem_perfil_vigente('ADMINISTRADOR')) or (select app.tem_perfil_vigente('COORDENACAO')));

-- convenio_vigencia: immutable periods (RF011); visible to whoever reads the agreement
alter table public.convenio_vigencia enable row level security;

grant select, insert on public.convenio_vigencia to app_runtime;

create policy convenio_vigencia_leitura on public.convenio_vigencia for select to app_runtime using (
  exists (select 1 from public.convenio c where c.id = convenio_id)
);

create policy convenio_vigencia_insercao on public.convenio_vigencia for insert to app_runtime with check (
  ((select app.tem_perfil_vigente('ADMINISTRADOR')) or (select app.tem_perfil_vigente('COORDENACAO')))
  and registrado_por_usuario_id = (select app.usuario_atual_id())
);

-- documento: metadata visibility by type and scope. Sensitive content is never readable
-- by the administrator (RN-38, RF071): the download check lives in app.pode_baixar_documento.
-- The sender always sees what they sent. Estágio-scoped types are added with the estagio
-- policies (estagios.sql).
alter table public.documento enable row level security;

grant select, insert on public.documento to app_runtime;
grant update (data_liberacao_guarda, eliminado_em, eliminado_por_usuario_id) on public.documento to app_runtime;

create policy documento_leitura_proprio on public.documento for select to app_runtime
  using (enviado_por_usuario_id = (select app.usuario_atual_id()));

create policy documento_leitura_convenio on public.documento for select to app_runtime using (
  tipo = 'CONVENIO' and (
    (select app.tem_perfil_vigente('ADMINISTRADOR'))
    or (select app.tem_perfil_vigente('COORDENACAO'))
    or app.representa_concedente(concedente_id)
  )
);

-- One rule for every type: app.pode_enviar_documento (functions/06 and 07)
create policy documento_insercao on public.documento for insert to app_runtime with check (
  enviado_por_usuario_id = (select app.usuario_atual_id())
  and app.pode_enviar_documento(tipo, concedente_id, estagio_id, estudante_id)
);

create policy documento_guarda on public.documento for update to app_runtime
  using ((select app.tem_perfil_vigente('ADMINISTRADOR')))
  with check ((select app.tem_perfil_vigente('ADMINISTRADOR')));
