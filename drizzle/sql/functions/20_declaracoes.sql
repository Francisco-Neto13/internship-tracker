-- M07 Declarações (RF058, RN-17, RN-35; DER-LOGICO §4.7)
-- A declaration states a fact the database can prove: the internship CONCLUIDO, or the
-- complementary activities complete in the latest assessment of the student's course. The
-- student or the coordination of the course issues it; the PDF is a DECLARACAO document and
-- anyone holding it checks it by the verification code (app.verificar_declaracao).

create or replace function app.pode_emitir_declaracao(p_estudante_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.estudante e
    where e.id = p_estudante_id and (e.usuario_id = app.usuario_atual_id() or app.coordena_curso(e.curso_id))
  )
$$;

-- Latest assessment of the student's current course, if its activities are complete
create or replace function app.apuracao_atividades_cumpridas(p_estudante_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.id
  from public.estudante e
  join lateral (
    select * from public.apuracao_integralizacao ap
    where ap.estudante_id = e.id and ap.curso_id = e.curso_id
    order by ap.criado_em desc limit 1
  ) a on true
  where e.id = p_estudante_id and a.situacao_atividades = 'CUMPRIDO'
$$;

-- What the declaration says, checked and read in one place; the service renders it
create or replace function app.dados_declaracao(p_tipo public.tipo_declaracao, p_estudante_id uuid, p_estagio_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_aluno jsonb;
  v_apuracao_id uuid;
  v_dados jsonb;
begin
  if not app.pode_emitir_declaracao(p_estudante_id) then
    raise exception 'DECLARACAO_RESTRITA: só o estudante ou a coordenação do curso emitem a declaração' using errcode = 'P0001';
  end if;
  select jsonb_build_object('estudante_id', e.id, 'nome', u.nome, 'matricula', e.matricula, 'curso', c.nome)
    into v_aluno
    from public.estudante e join public.usuario u on u.id = e.usuario_id join public.curso c on c.id = e.curso_id
   where e.id = p_estudante_id;

  if p_tipo = 'CONCLUSAO_ESTAGIO' then
    select jsonb_build_object(
             'estagio_id', g.id,
             'tipo_estagio', g.tipo,
             'concedente', k.razao_social,
             'cnpj', k.cnpj,
             'curso_estagio', c.nome,
             'data_inicio', g.data_inicio,
             'data_fim', (g.encerrado_em at time zone 'America/Sao_Paulo')::date,
             'minutos_homologados', coalesce((
               select sum(r.duracao_minutos) from public.registro_frequencia r where r.estagio_id = g.id and r.situacao = 'HOMOLOGADO'
             ), 0),
             'orientador', (
               select u.nome from public.responsavel_estagio r join public.usuario u on u.id = r.usuario_id
               where r.estagio_id = g.id and r.papel = 'ORIENTADOR' order by r.vigencia_inicio desc limit 1
             )
           )
      into v_dados
      from public.estagio g
      join public.concedente k on k.id = g.concedente_id
      join public.curso c on c.id = g.curso_id
     where g.id = p_estagio_id and g.estudante_id = p_estudante_id and g.situacao = 'CONCLUIDO';
    if v_dados is null then
      raise exception 'DECLARACAO_INDISPONIVEL: o estágio do estudante não está concluído' using errcode = 'P0001';
    end if;
  else
    v_apuracao_id := app.apuracao_atividades_cumpridas(p_estudante_id);
    if v_apuracao_id is null then
      raise exception 'DECLARACAO_INDISPONIVEL: as atividades complementares não estão integralizadas na última apuração' using errcode = 'P0001';
    end if;
    select jsonb_build_object(
             'apuracao_id', a.id,
             'apurado_em', a.criado_em,
             'minutos_exigidos', a.atividades_exigido_minutos,
             'minutos_aproveitados', a.atividades_aproveitado_minutos,
             'categorias', coalesce((
               select jsonb_agg(jsonb_build_object('categoria', k.nome, 'minutos', x.aproveitado_minutos) order by k.nome)
               from public.apuracao_categoria x join public.categoria_atividade k on k.id = x.categoria_id
               where x.apuracao_id = a.id and x.aproveitado_minutos > 0
             ), '[]'::jsonb)
           )
      into v_dados
      from public.apuracao_integralizacao a where a.id = v_apuracao_id;
  end if;
  return v_aluno || v_dados || jsonb_build_object('tipo', p_tipo);
end
$$;

-- BEFORE INSERT on declaracao: the same facts again (the barrier), the author and the PDF
create or replace function app.validar_declaracao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if app.usuario_atual_id() is not null then
    if not app.pode_emitir_declaracao(new.estudante_id) then
      raise exception 'DECLARACAO_RESTRITA: só o estudante ou a coordenação do curso emitem a declaração' using errcode = 'P0001';
    end if;
    new.emitida_por_usuario_id := app.usuario_atual_id();
  end if;
  if new.tipo = 'CONCLUSAO_ESTAGIO' and not exists (
    select 1 from public.estagio g where g.id = new.estagio_id and g.estudante_id = new.estudante_id and g.situacao = 'CONCLUIDO'
  ) then
    raise exception 'DECLARACAO_INDISPONIVEL: o estágio do estudante não está concluído' using errcode = 'P0001';
  end if;
  if new.tipo = 'INTEGRALIZACAO_ATIVIDADES' and new.apuracao_id is distinct from app.apuracao_atividades_cumpridas(new.estudante_id) then
    raise exception 'DECLARACAO_INDISPONIVEL: as atividades complementares não estão integralizadas na última apuração' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.documento d
    where d.id = new.documento_id and d.tipo = 'DECLARACAO'
      and (d.estagio_id is not distinct from new.estagio_id)
      and (new.estagio_id is not null or d.estudante_id = new.estudante_id)
  ) then
    raise exception 'DOCUMENTO_INVALIDO: o PDF é um documento de declaração do mesmo escopo' using errcode = 'P0001';
  end if;
  new.criado_em := now();
  return new;
end
$$;

-- RF058: authenticity check by whoever holds the PDF, without login. Answers only what the
-- document already shows, plus its SHA-256 to compare with the file in hand.
create or replace function app.verificar_declaracao(p_codigo text)
returns table (tipo public.tipo_declaracao, estudante text, curso text, emitida_em timestamptz, sha256 text)
language sql
stable
security definer
set search_path = ''
as $$
  select d.tipo, u.nome, c.nome, d.criado_em, doc.sha256
  from public.declaracao d
  join public.estudante e on e.id = d.estudante_id
  join public.usuario u on u.id = e.usuario_id
  join public.curso c on c.id = e.curso_id
  join public.documento doc on doc.id = d.documento_id
  where d.codigo_verificacao = upper(trim(p_codigo))
$$;

revoke all on function app.pode_emitir_declaracao(uuid) from public;
revoke all on function app.apuracao_atividades_cumpridas(uuid) from public;
revoke all on function app.dados_declaracao(public.tipo_declaracao, uuid, uuid) from public;
revoke all on function app.validar_declaracao() from public;
revoke all on function app.verificar_declaracao(text) from public;

grant execute on function app.pode_emitir_declaracao(uuid) to app_runtime;
grant execute on function app.dados_declaracao(public.tipo_declaracao, uuid, uuid) to app_runtime;
grant execute on function app.verificar_declaracao(text) to app_runtime;
