-- Dados de saúde (RN-38, RF071 to RF073, RNF-05; LGPD arts. 11, 37 and 46)
-- The database records writes by trigger but cannot see a read: the download endpoint calls
-- app.registrar_leitura_documento, which decides the permission and writes the LEITURA row in
-- the same step, so no sensitive document is handed out without its trail.

-- RF071, RF072: true when the caller may download the document; for a sensitive one, the read
-- enters the append-only trail with user, profile, date, time and document (never content)
create or replace function app.registrar_leitura_documento(p_documento_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_documento record;
  v_perfil text;
begin
  if not app.pode_baixar_documento(p_documento_id) then
    return false;
  end if;
  select d.id, d.tipo, d.sensivel, d.estagio_id into v_documento from public.documento d where d.id = p_documento_id;
  if v_documento.sensivel then
    v_perfil := case
      when v_documento.estagio_id is null then null
      when app.e_estudante_do_estagio(v_documento.estagio_id) then 'ESTUDANTE'
      when app.e_responsavel_vigente(v_documento.estagio_id, 'ORIENTADOR') then 'PROFESSOR_ORIENTADOR'
      when app.coordena_curso_do_estagio(v_documento.estagio_id) then 'COORDENACAO'
    end;
    insert into public.auditoria (usuario_id, tabela, registro_id, operacao, dados_novos)
    values (
      app.usuario_atual_id(),
      'documento',
      p_documento_id::text,
      'LEITURA',
      jsonb_build_object('tipo', v_documento.tipo, 'estagio_id', v_documento.estagio_id, 'perfil', v_perfil, 'acao', 'DOWNLOAD')
    );
  end if;
  return true;
end
$$;

-- RF073: the holder of the data, the coordination of the course and the administrator see who
-- read a sensitive document, when and under which profile, never its content
create or replace function app.pode_consultar_acessos_documento(p_documento_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.documento d
    where d.id = p_documento_id
      and d.sensivel
      and (
        app.tem_perfil_vigente('ADMINISTRADOR')
        or (d.estagio_id is not null and (app.e_estudante_do_estagio(d.estagio_id) or app.coordena_curso_do_estagio(d.estagio_id)))
      )
  )
$$;

create or replace function app.acessos_documento(p_documento_id uuid)
returns table (ocorrido_em timestamptz, usuario_id uuid, usuario_nome text, perfil text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.ocorrido_em, a.usuario_id, u.nome, a.dados_novos ->> 'perfil'
  from public.auditoria a
  left join public.usuario u on u.id = a.usuario_id
  where a.tabela = 'documento'
    and a.registro_id = p_documento_id::text
    and a.operacao = 'LEITURA'
    and app.pode_consultar_acessos_documento(p_documento_id)
  order by a.ocorrido_em desc
$$;

revoke all on function app.registrar_leitura_documento(uuid) from public;
revoke all on function app.pode_consultar_acessos_documento(uuid) from public;
revoke all on function app.acessos_documento(uuid) from public;
grant execute on function app.registrar_leitura_documento(uuid) to app_runtime;
grant execute on function app.pode_consultar_acessos_documento(uuid) to app_runtime;
grant execute on function app.acessos_documento(uuid) to app_runtime;
