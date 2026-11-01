-- M08 Relatórios gerenciais (RF067, RF068, RN-29; DER-LOGICO §4.8): queries over the existing
-- tables, no table of their own. The administrator sees every course, the coordination the
-- courses it coordinates; any other profile gets empty results. Aggregates and identification
-- only: never report content, health data nor grades (RN-37, RN-38).
-- Filters are optional (null = all): course, concedente and a period [p_de, p_ate] of calendar
-- days in America/Sao_Paulo (p_ate defaults to today).

create or replace function app.cursos_gerenciaveis()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id from public.curso c where app.tem_perfil_vigente('ADMINISTRADOR')
  union
  select v.curso_id
  from public.vinculo_perfil v
  join public.usuario u on u.id = v.usuario_id
  where v.usuario_id = app.usuario_atual_id() and v.perfil = 'COORDENACAO' and u.situacao = 'ATIVO'
    and v.vigencia_inicio <= now() and (v.vigencia_fim is null or v.vigencia_fim > now())
$$;

-- Activated internships whose period [data_inicio, end] meets [p_de, p_ate]; the end is the
-- encerramento or, while running, the planned end
create or replace function app.estagios_no_periodo(p_curso_id uuid, p_concedente_id uuid, p_de date, p_ate date)
returns setof public.estagio
language sql
stable
security definer
set search_path = ''
as $$
  select g.*
  from public.estagio g
  where g.curso_id in (select app.cursos_gerenciaveis())
    and (p_curso_id is null or g.curso_id = p_curso_id)
    and (p_concedente_id is null or g.concedente_id = p_concedente_id)
    and g.ativado_em is not null
    and g.data_inicio <= coalesce(p_ate, app.hoje())
    and coalesce((g.encerrado_em at time zone 'America/Sao_Paulo')::date, g.data_fim_prevista) >= coalesce(p_de, coalesce(p_ate, app.hoje()))
$$;

-- RF067: interns in the period, by course, concedente and type (one student counts once per row)
create or replace function app.relatorio_estagiarios_ativos(p_curso_id uuid, p_concedente_id uuid, p_de date, p_ate date)
returns table (curso_id uuid, curso text, concedente_id uuid, concedente text, tipo public.tipo_estagio, estagiarios bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.nome, k.id, k.razao_social, g.tipo, count(distinct g.estudante_id)
  from app.estagios_no_periodo(p_curso_id, p_concedente_id, p_de, p_ate) g
  join public.curso c on c.id = g.curso_id
  join public.concedente k on k.id = g.concedente_id
  group by c.id, c.nome, k.id, k.razao_social, g.tipo
  order by c.nome, k.razao_social, g.tipo
$$;

-- RF067: concedentes with an agreement in force in the period, and their internships in it
create or replace function app.relatorio_concedentes_parceiras(p_curso_id uuid, p_concedente_id uuid, p_de date, p_ate date)
returns table (concedente_id uuid, concedente text, situacao public.situacao_concedente, convenios_vigentes bigint, estagios bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select k.id, k.razao_social, k.situacao,
         (select count(distinct v.convenio_id) from public.convenio_vigencia v join public.convenio cv on cv.id = v.convenio_id
           where cv.concedente_id = k.id
             and v.vigencia_inicio <= coalesce(p_ate, app.hoje())
             and v.vigencia_fim >= coalesce(p_de, coalesce(p_ate, app.hoje()))),
         (select count(*) from app.estagios_no_periodo(p_curso_id, k.id, p_de, p_ate))
  from public.concedente k
  where exists (select 1 from app.cursos_gerenciaveis())
    and (p_concedente_id is null or k.id = p_concedente_id)
    and exists (
      select 1 from public.convenio_vigencia v join public.convenio cv on cv.id = v.convenio_id
      where cv.concedente_id = k.id
        and v.vigencia_inicio <= coalesce(p_ate, app.hoje())
        and v.vigencia_fim >= coalesce(p_de, coalesce(p_ate, app.hoje()))
    )
  order by k.razao_social
$$;

-- RF067: internships ended in the period, by course; rate = concluded / ended, in percent
create or replace function app.relatorio_taxa_conclusao(p_curso_id uuid, p_concedente_id uuid, p_de date, p_ate date)
returns table (curso_id uuid, curso text, concluidos bigint, rescindidos bigint, taxa_conclusao_percentual numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.nome,
         count(*) filter (where g.situacao = 'CONCLUIDO'),
         count(*) filter (where g.situacao = 'RESCINDIDO'),
         round(100.0 * count(*) filter (where g.situacao = 'CONCLUIDO') / count(*), 2)
  from public.estagio g
  join public.curso c on c.id = g.curso_id
  where g.curso_id in (select app.cursos_gerenciaveis())
    and (p_curso_id is null or g.curso_id = p_curso_id)
    and (p_concedente_id is null or g.concedente_id = p_concedente_id)
    and g.situacao in ('CONCLUIDO', 'RESCINDIDO')
    and (g.encerrado_em at time zone 'America/Sao_Paulo')::date between coalesce(p_de, '-infinity'::date) and coalesce(p_ate, app.hoje())
  group by c.id, c.nome
  order by c.nome
$$;

-- RF067, RN-35: enrolled students whose latest assessment is not complete (a student never
-- assessed is calculated on the spot). The concedente filter does not apply; the period is
-- the moment of the assessment (until p_ate).
create or replace function app.relatorio_pendencias_integralizacao(p_curso_id uuid, p_ate date)
returns table (
  estudante_id uuid,
  matricula text,
  nome text,
  curso_id uuid,
  curso text,
  estagio_faltante_minutos integer,
  atividades_faltante_minutos integer,
  apurado_em timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.matricula, u.nome, c.id, c.nome,
         greatest(0, coalesce(a.estagio_obrigatorio_exigido_minutos - a.estagio_obrigatorio_concluido_minutos,
                              (x.calculo ->> 'estagio_exigido')::integer - (x.calculo ->> 'estagio_concluido')::integer)),
         greatest(0, coalesce(a.atividades_exigido_minutos - a.atividades_aproveitado_minutos,
                              (x.calculo ->> 'atividades_exigido')::integer - (x.calculo ->> 'atividades_aproveitado')::integer)),
         a.criado_em
  from public.estudante e
  join public.usuario u on u.id = e.usuario_id
  join public.curso c on c.id = e.curso_id
  left join lateral (
    select * from public.apuracao_integralizacao ap
    where ap.estudante_id = e.id and ap.curso_id = e.curso_id
      and (ap.criado_em at time zone 'America/Sao_Paulo')::date <= coalesce(p_ate, app.hoje())
    order by ap.criado_em desc limit 1
  ) a on true
  left join lateral (
    select app.calcular_integralizacao(e.id) as calculo where a.id is null
  ) x on true
  where e.curso_id in (select app.cursos_gerenciaveis())
    and (p_curso_id is null or e.curso_id = p_curso_id)
    and e.situacao_academica = 'MATRICULADO'
    and coalesce(a.situacao_geral::text, case
          when (x.calculo ->> 'estagio_concluido')::integer >= (x.calculo ->> 'estagio_exigido')::integer
           and (x.calculo ->> 'atividades_aproveitado')::integer >= (x.calculo ->> 'atividades_exigido')::integer then 'CUMPRIDO'
          else 'PENDENTE' end) <> 'CUMPRIDO'
  order by c.nome, u.nome, e.matricula
$$;

revoke all on function app.cursos_gerenciaveis() from public;
revoke all on function app.estagios_no_periodo(uuid, uuid, date, date) from public;
revoke all on function app.relatorio_estagiarios_ativos(uuid, uuid, date, date) from public;
revoke all on function app.relatorio_concedentes_parceiras(uuid, uuid, date, date) from public;
revoke all on function app.relatorio_taxa_conclusao(uuid, uuid, date, date) from public;
revoke all on function app.relatorio_pendencias_integralizacao(uuid, date) from public;

grant execute on function app.relatorio_estagiarios_ativos(uuid, uuid, date, date) to app_runtime;
grant execute on function app.relatorio_concedentes_parceiras(uuid, uuid, date, date) to app_runtime;
grant execute on function app.relatorio_taxa_conclusao(uuid, uuid, date, date) to app_runtime;
grant execute on function app.relatorio_pendencias_integralizacao(uuid, date) to app_runtime;
