-- M05 Avaliação de desempenho (RF042, RF043, RN-15, RF014) e acompanhamento (RF033, RN-11)
-- DER-LOGICO §4.5. The triggers enforce who evaluates, the scale of each grade and that an
-- evaluation is complete; the averages are aggregates that expose no individual evaluation.

-- criterio_avaliacao: a criterion already answered keeps its meaning (RF042)
create or replace function app.validar_alteracao_criterio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.codigo <> old.codigo then
    raise exception 'REGISTRO_IMUTAVEL: o código do critério não muda' using errcode = 'P0001';
  end if;
  if (new.descricao, new.escala_minima, new.escala_maxima) is distinct from (old.descricao, old.escala_minima, old.escala_maxima)
     and exists (select 1 from public.resposta_avaliacao r where r.criterio_id = old.id) then
    raise exception 'CRITERIO_EM_USO: critério já respondido não muda; desative-o e crie outro' using errcode = 'P0001';
  end if;
  return new;
end
$$;

-- RF042, RN-15: the concedente evaluates (the supervisor in force or its representative) an
-- ATIVO internship; a periodic evaluation covers a closed period inside the internship. The
-- profile under which it was made is recorded.
create or replace function app.validar_avaliacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estagio record;
  v_usuario uuid := app.usuario_atual_id();
begin
  select g.situacao, g.data_inicio, g.data_fim_prevista into v_estagio from public.estagio g where g.id = new.estagio_id;
  if v_estagio.situacao is distinct from 'ATIVO' then
    raise exception 'ESTAGIO_NAO_ATIVO: a avaliação é registrada com o estágio ativo' using errcode = 'P0001';
  end if;
  if v_usuario is not null then
    if new.avaliador_usuario_id is distinct from v_usuario then
      raise exception 'AVALIACAO_RESTRITA_A_CONCEDENTE: a avaliação é registrada em nome de quem avalia' using errcode = 'P0001';
    end if;
    if app.e_responsavel_vigente(new.estagio_id, 'SUPERVISOR') then
      new.avaliador_perfil := 'SUPERVISOR';
    elsif app.representa_concedente_do_estagio(new.estagio_id) then
      new.avaliador_perfil := 'CONCEDENTE';
    else
      raise exception 'AVALIACAO_RESTRITA_A_CONCEDENTE: só o supervisor ou a concedente do estágio avaliam' using errcode = 'P0001';
    end if;
  end if;
  if new.momento = 'PERIODICA' then
    if new.periodo_inicio < v_estagio.data_inicio or new.periodo_fim > v_estagio.data_fim_prevista then
      raise exception 'PERIODO_INVALIDO: o período avaliado fica dentro do estágio' using errcode = 'P0001';
    end if;
    if new.periodo_fim > app.hoje() then
      raise exception 'DATA_FUTURA: o período avaliado termina no máximo hoje' using errcode = 'P0001';
    end if;
  else
    new.periodo_inicio := null;
    new.periodo_fim := null;
  end if;
  new.observacoes := nullif(btrim(new.observacoes), '');
  return new;
end
$$;

-- RF042: grades only within the scale of an active criterion, given in the same transaction
-- as the evaluation, by its author
create or replace function app.validar_resposta_avaliacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_criterio record;
  v_avaliacao record;
begin
  select c.ativo, c.escala_minima, c.escala_maxima into v_criterio from public.criterio_avaliacao c where c.id = new.criterio_id;
  if not coalesce(v_criterio.ativo, false) then
    raise exception 'CRITERIO_INATIVO: o critério não está ativo' using errcode = 'P0001';
  end if;
  if new.nota < v_criterio.escala_minima or new.nota > v_criterio.escala_maxima then
    raise exception 'NOTA_FORA_DA_ESCALA: % fora de % a %', new.nota, v_criterio.escala_minima, v_criterio.escala_maxima using errcode = 'P0001';
  end if;
  select a.criado_em, a.avaliador_usuario_id into v_avaliacao from public.avaliacao_desempenho a where a.id = new.avaliacao_id;
  if v_avaliacao.criado_em <> now() then
    raise exception 'AVALIACAO_FECHADA: as notas entram junto com a avaliação' using errcode = 'P0001';
  end if;
  if app.usuario_atual_id() is not null and v_avaliacao.avaliador_usuario_id is distinct from app.usuario_atual_id() then
    raise exception 'AVALIACAO_RESTRITA_A_CONCEDENTE: só quem avalia atribui as notas' using errcode = 'P0001';
  end if;
  new.comentario := nullif(btrim(new.comentario), '');
  return new;
end
$$;

-- RF042, checked at commit: every active criterion answered
create or replace function app.exigir_respostas_avaliacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.resposta_avaliacao r where r.avaliacao_id = new.id)
     or exists (
       select 1 from public.criterio_avaliacao c
       where c.ativo and not exists (select 1 from public.resposta_avaliacao r where r.avaliacao_id = new.id and r.criterio_id = c.id)
     ) then
    raise exception 'AVALIACAO_INCOMPLETA: todos os critérios ativos precisam de nota' using errcode = 'P0001';
  end if;
  return null;
end
$$;

create or replace function app.estagio_da_avaliacao(p_avaliacao_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.estagio_id from public.avaliacao_desempenho a where a.id = p_avaliacao_id
$$;

create or replace function app.e_avaliador(p_avaliacao_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.avaliacao_desempenho a where a.id = p_avaliacao_id and a.avaliador_usuario_id = app.usuario_atual_id())
$$;

-- Grade of an evaluation on a 0 to 10 scale: each grade normalized by its criterion's scale,
-- then averaged, so criteria with different scales weigh the same (RF014, RF042)
create or replace function app.media_avaliacao(p_avaliacao_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select round(avg((r.nota - c.escala_minima)::numeric * 10 / (c.escala_maxima - c.escala_minima)), 2)
  from public.resposta_avaliacao r
  join public.criterio_avaliacao c on c.id = r.criterio_id
  where r.avaliacao_id = p_avaliacao_id
    and app.pode_ler_estagio(app.estagio_da_avaliacao(p_avaliacao_id))
$$;

-- RF014: average of the final evaluations of a concedente's internships (one per internship,
-- so a long internship with many periodic evaluations does not weigh more), 0 to 10. Same
-- audience as app.historico_estagios_concedente; aggregate only.
create or replace function app.media_avaliacoes_concedente(p_concedente_id uuid)
returns table (media numeric, avaliacoes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with por_avaliacao as (
    select avg((r.nota - c.escala_minima)::numeric * 10 / (c.escala_maxima - c.escala_minima)) as nota
    from public.avaliacao_desempenho a
    join public.estagio g on g.id = a.estagio_id
    join public.resposta_avaliacao r on r.avaliacao_id = a.id
    join public.criterio_avaliacao c on c.id = r.criterio_id
    where g.concedente_id = p_concedente_id and a.momento = 'FINAL'
    group by a.id
  )
  select round(avg(nota), 2), count(*)
  from por_avaliacao
  where app.tem_perfil_vigente('ADMINISTRADOR') or app.tem_perfil_vigente('COORDENACAO') or app.representa_concedente(p_concedente_id)
$$;

-- RF033, RN-11: the advisor in force records visits, contacts and meetings that already
-- happened during the internship; only the author edits, while the internship is ATIVO
create or replace function app.validar_acompanhamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estagio record;
  v_usuario uuid := app.usuario_atual_id();
begin
  if tg_op = 'UPDATE' and (new.estagio_id <> old.estagio_id or new.registrado_por_usuario_id <> old.registrado_por_usuario_id) then
    raise exception 'REGISTRO_IMUTAVEL: estágio e autor do acompanhamento não mudam' using errcode = 'P0001';
  end if;
  select g.situacao, g.data_inicio into v_estagio from public.estagio g where g.id = new.estagio_id;
  if v_estagio.situacao is distinct from 'ATIVO' then
    raise exception 'ESTAGIO_NAO_ATIVO: o acompanhamento é registrado com o estágio ativo' using errcode = 'P0001';
  end if;
  if new.data_ocorrencia < v_estagio.data_inicio then
    raise exception 'DATA_FORA_DO_ESTAGIO: o acompanhamento é posterior ao início do estágio' using errcode = 'P0001';
  end if;
  if new.data_ocorrencia > app.hoje() then
    raise exception 'DATA_FUTURA: registra-se o acompanhamento que já aconteceu' using errcode = 'P0001';
  end if;
  if v_usuario is not null and (new.registrado_por_usuario_id is distinct from v_usuario
     or not app.e_responsavel_vigente(new.estagio_id, 'ORIENTADOR')) then
    raise exception 'ACOMPANHAMENTO_RESTRITO_AO_ORIENTADOR: só o professor orientador registra e edita o próprio acompanhamento' using errcode = 'P0001';
  end if;
  return new;
end
$$;

revoke all on function app.validar_alteracao_criterio() from public;
revoke all on function app.validar_avaliacao() from public;
revoke all on function app.validar_resposta_avaliacao() from public;
revoke all on function app.exigir_respostas_avaliacao() from public;
revoke all on function app.estagio_da_avaliacao(uuid) from public;
revoke all on function app.e_avaliador(uuid) from public;
revoke all on function app.media_avaliacao(uuid) from public;
revoke all on function app.media_avaliacoes_concedente(uuid) from public;
revoke all on function app.validar_acompanhamento() from public;

grant execute on function app.estagio_da_avaliacao(uuid) to app_runtime;
grant execute on function app.e_avaliador(uuid) to app_runtime;
grant execute on function app.media_avaliacao(uuid) to app_runtime;
grant execute on function app.media_avaliacoes_concedente(uuid) to app_runtime;
