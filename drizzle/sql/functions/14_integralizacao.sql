-- M07 Integralização (RF056, RF057, RN-23, RN-24, RN-35, RN-36; DER-LOGICO §4.7, §5.9, §5.10)
-- One calculation, in one place, from audited tables only, in whole minutes: the same data
-- always produce the same assessment. app.calcular_integralizacao answers without writing;
-- app.apurar_integralizacao stores it, and the triggers below call it on every event that
-- changes the result.

-- DER §5.10. Internship side: homologated minutes of the student's MANDATORY internships
-- CONCLUIDO in its current course (D7). Activity side: per category of the course,
-- min(limit, approved minutes); in total, min(course requirement, sum of categories). A
-- non-mandatory internship counted as activity (RF046) is only on the activity side: the
-- internship side sums mandatory ones only, and the type never changes (RN-36, barrier 4).
create or replace function app.calcular_integralizacao(p_estudante_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with aluno as (
    select e.id, e.curso_id, c.carga_minima_estagio_minutos as estagio_exigido, c.carga_atividades_complementares_minutos as atividades_exigido
    from public.estudante e join public.curso c on c.id = e.curso_id
    where e.id = p_estudante_id
  ),
  estagio as (
    select coalesce(sum(r.duracao_minutos), 0)::integer as concluido
    from aluno
    join public.estagio g on g.estudante_id = aluno.id and g.curso_id = aluno.curso_id
    join public.registro_frequencia r on r.estagio_id = g.id
    where g.tipo = 'OBRIGATORIO' and g.situacao = 'CONCLUIDO' and r.situacao = 'HOMOLOGADO'
  ),
  categorias as (
    select x.categoria_id, x.limite_minutos,
           least(x.limite_minutos, coalesce((
             select sum(a.horas_aproveitadas_minutos) from public.atividade_complementar a
             where a.estudante_id = aluno.id and a.categoria_id = x.categoria_id and a.situacao = 'APROVADA'
           ), 0))::integer as aproveitado
    from aluno join public.exigencia_categoria x on x.curso_id = aluno.curso_id
  )
  select jsonb_build_object(
    'curso_id', aluno.curso_id,
    'estagio_exigido', aluno.estagio_exigido,
    'estagio_concluido', (select concluido from estagio),
    'atividades_exigido', aluno.atividades_exigido,
    'atividades_aproveitado', least(aluno.atividades_exigido, coalesce((select sum(aproveitado) from categorias), 0))::integer,
    'categorias', coalesce((
      select jsonb_agg(jsonb_build_object('categoria_id', categoria_id, 'limite', limite_minutos, 'aproveitado', aproveitado) order by categoria_id)
      from categorias
    ), '[]'::jsonb)
  )
  from aluno
  where app.usuario_atual_id() is null
     or p_estudante_id in (select app.estudantes_legiveis())
     or app.tem_perfil_vigente('ADMINISTRADOR')
$$;

-- Stores the assessment in force. Callable by whoever follows the student (manual
-- recalculation, RF056) and by the triggers, in the transaction of the event that caused it.
create or replace function app.apurar_integralizacao(p_estudante_id uuid, p_gatilho public.gatilho_apuracao)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_calculo jsonb := app.calcular_integralizacao(p_estudante_id);
  v_id uuid;
  v_estagio_cumprido boolean;
  v_atividades_cumpridas boolean;
begin
  if v_calculo is null then
    raise exception 'ACESSO_NEGADO: o estudante não está no seu recorte' using errcode = 'P0001';
  end if;
  v_estagio_cumprido := (v_calculo ->> 'estagio_concluido')::integer >= (v_calculo ->> 'estagio_exigido')::integer;
  v_atividades_cumpridas := (v_calculo ->> 'atividades_aproveitado')::integer = (v_calculo ->> 'atividades_exigido')::integer;
  insert into public.apuracao_integralizacao (
    estudante_id, curso_id, gatilho, estagio_obrigatorio_exigido_minutos, estagio_obrigatorio_concluido_minutos, situacao_estagio,
    atividades_exigido_minutos, atividades_aproveitado_minutos, situacao_atividades, situacao_geral, criado_em
  ) values (
    p_estudante_id, (v_calculo ->> 'curso_id')::uuid, p_gatilho,
    (v_calculo ->> 'estagio_exigido')::integer, (v_calculo ->> 'estagio_concluido')::integer,
    case when v_estagio_cumprido then 'CUMPRIDO' else 'PENDENTE' end::public.situacao_integralizacao,
    (v_calculo ->> 'atividades_exigido')::integer, (v_calculo ->> 'atividades_aproveitado')::integer,
    case when v_atividades_cumpridas then 'CUMPRIDO' else 'PENDENTE' end::public.situacao_integralizacao,
    case when v_estagio_cumprido and v_atividades_cumpridas then 'CUMPRIDO' else 'PENDENTE' end::public.situacao_integralizacao,
    -- clock_timestamp: two assessments in one transaction keep their order (the latest is in force)
    clock_timestamp()
  ) returning id into v_id;
  insert into public.apuracao_categoria (apuracao_id, categoria_id, limite_minutos, aproveitado_minutos, situacao)
  select v_id, (c ->> 'categoria_id')::uuid, (c ->> 'limite')::integer, (c ->> 'aproveitado')::integer,
         case when (c ->> 'aproveitado')::integer = (c ->> 'limite')::integer then 'LIMITE_ATINGIDO' else 'EM_ANDAMENTO' end::public.situacao_categoria_integralizacao
  from jsonb_array_elements(v_calculo -> 'categorias') c;
  return v_id;
end
$$;

-- Events that change the result (DER §5.10): an approved activity, an internship concluded or
-- rescinded, a requirement of the course changed
create or replace function app.reapurar_por_atividade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.situacao = 'APROVADA' and old.situacao <> 'APROVADA' then
    perform app.apurar_integralizacao(new.estudante_id, 'ATIVIDADE_APROVADA');
  end if;
  return null;
end
$$;

create or replace function app.reapurar_por_estagio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.situacao <> old.situacao and new.situacao in ('CONCLUIDO', 'RESCINDIDO') then
    perform app.apurar_integralizacao(
      new.estudante_id,
      case new.situacao when 'CONCLUIDO' then 'ESTAGIO_CONCLUIDO' else 'ESTAGIO_RESCINDIDO' end::public.gatilho_apuracao
    );
  end if;
  return null;
end
$$;

-- A changed requirement re-assesses the enrolled and on-leave students of the course once per
-- statement, whatever the number of categories changed (PUT /cursos/{id}/exigencias)
create or replace function app.reapurar_por_exigencia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estudante uuid;
begin
  for v_estudante in
    select e.id from public.estudante e
    where e.curso_id in (select distinct curso_id from mudadas)
      and e.situacao_academica in ('MATRICULADO', 'TRANCADO')
  loop
    perform app.apurar_integralizacao(v_estudante, 'EXIGENCIA_ALTERADA');
  end loop;
  return null;
end
$$;

create or replace function app.reapurar_por_curso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estudante uuid;
begin
  if (new.carga_minima_estagio_minutos, new.carga_atividades_complementares_minutos)
     is distinct from (old.carga_minima_estagio_minutos, old.carga_atividades_complementares_minutos) then
    for v_estudante in
      select e.id from public.estudante e where e.curso_id = new.id and e.situacao_academica in ('MATRICULADO', 'TRANCADO')
    loop
      perform app.apurar_integralizacao(v_estudante, 'EXIGENCIA_ALTERADA');
    end loop;
  end if;
  return null;
end
$$;

revoke all on function app.calcular_integralizacao(uuid) from public;
revoke all on function app.apurar_integralizacao(uuid, public.gatilho_apuracao) from public;
revoke all on function app.reapurar_por_atividade() from public;
revoke all on function app.reapurar_por_estagio() from public;
revoke all on function app.reapurar_por_exigencia() from public;
revoke all on function app.reapurar_por_curso() from public;

grant execute on function app.calcular_integralizacao(uuid) to app_runtime;
grant execute on function app.apurar_integralizacao(uuid, public.gatilho_apuracao) to app_runtime;
