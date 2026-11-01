-- M06 Atividades complementares (RF046 to RF055, RN-18 to RN-23, RN-36; DER-LOGICO §4.6, §5.9, §5.10)
-- The activity is born in analysis with its proof; the coordination of the student's course
-- decides; the minutes counted are decided here, at approval, never by the caller.

-- Students the caller follows: itself, or the students of the courses it coordinates. As a set,
-- so policies run it once per query (the lesson of scripts/db/desempenho.ts).
create or replace function app.estudantes_legiveis()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id
  from public.estudante e
  join public.usuario u on u.id = e.usuario_id
  where e.usuario_id = app.usuario_atual_id() and u.situacao = 'ATIVO'
  union
  select e.id
  from public.estudante e
  join public.vinculo_perfil v on v.curso_id = e.curso_id
  join public.usuario u on u.id = v.usuario_id
  where v.usuario_id = app.usuario_atual_id() and v.perfil = 'COORDENACAO' and u.situacao = 'ATIVO'
    and v.vigencia_inicio <= now() and (v.vigencia_fim is null or v.vigencia_fim > now())
$$;

create or replace function app.coordena_curso_do_estudante(p_estudante_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.estudante e where e.id = p_estudante_id and app.coordena_curso(e.curso_id))
$$;

create or replace function app.estudante_da_atividade(p_atividade_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.estudante_id from public.atividade_complementar a where a.id = p_atividade_id
$$;

-- RF049, RF055: what the student registers, and when it may change. Decisions (APROVADA,
-- RECUSADA, DEVOLVIDA) arrive only from an analise_atividade of this same transaction.
create or replace function app.validar_atividade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := app.usuario_atual_id();
  v_conteudo_mudou boolean;
begin
  if tg_op = 'INSERT' then
    if new.situacao <> 'EM_ANALISE' or new.horas_aproveitadas_minutos is not null then
      raise exception 'TRANSICAO_ATIVIDADE_INVALIDA: a atividade nasce em análise' using errcode = 'P0001';
    end if;
    if v_usuario is not null and (new.registrada_por_usuario_id is distinct from v_usuario
       or new.estudante_id is distinct from app.estudante_atual_id()) then
      raise exception 'CADASTRO_RESTRITO_AO_ESTUDANTE: o estudante cadastra a própria atividade' using errcode = 'P0001';
    end if;
    new.enviada_em := now();
  else
    if new.estudante_id <> old.estudante_id or new.registrada_por_usuario_id <> old.registrada_por_usuario_id then
      raise exception 'REGISTRO_IMUTAVEL: estudante e autor da atividade não mudam' using errcode = 'P0001';
    end if;
    v_conteudo_mudou := (new.categoria_id, new.descricao, new.instituicao_promotora, new.data_inicio, new.data_fim,
      new.horas_declaradas_minutos, new.origem_estagio_id) is distinct from (old.categoria_id, old.descricao,
      old.instituicao_promotora, old.data_inicio, old.data_fim, old.horas_declaradas_minutos, old.origem_estagio_id);
    if v_conteudo_mudou and old.situacao <> 'DEVOLVIDA' then
      raise exception 'ATIVIDADE_IMUTAVEL: a atividade só muda quando devolvida para complementação' using errcode = 'P0001';
    end if;
    if new.situacao <> old.situacao then
      if old.situacao = 'DEVOLVIDA' and new.situacao = 'EM_ANALISE' then
        -- RF055: resending; the history of analyses stays
        if v_usuario is not null and new.estudante_id is distinct from app.estudante_atual_id() then
          raise exception 'CADASTRO_RESTRITO_AO_ESTUDANTE: o estudante reenvia a própria atividade' using errcode = 'P0001';
        end if;
        new.enviada_em := now();
      elsif old.situacao = 'EM_ANALISE' and new.situacao in ('APROVADA', 'RECUSADA', 'DEVOLVIDA') then
        if not exists (
          select 1 from public.analise_atividade an
          where an.atividade_id = new.id and an.decisao::text = new.situacao::text and an.criado_em = now()
        ) then
          raise exception 'TRANSICAO_ATIVIDADE_INVALIDA: a decisão vem da análise da coordenação' using errcode = 'P0001';
        end if;
      else
        raise exception 'TRANSICAO_ATIVIDADE_INVALIDA: % para %', old.situacao, new.situacao using errcode = 'P0001';
      end if;
    elsif new.horas_aproveitadas_minutos is distinct from old.horas_aproveitadas_minutos then
      raise exception 'REGISTRO_IMUTAVEL: as horas aproveitadas vêm da análise' using errcode = 'P0001';
    end if;
    if not v_conteudo_mudou then
      return new;
    end if;
  end if;

  -- Content rules, on registration and on complementation
  if not exists (select 1 from public.categoria_atividade c where c.id = new.categoria_id and c.ativa) then
    raise exception 'CATEGORIA_INATIVA: a categoria não está ativa' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.exigencia_categoria x join public.estudante e on e.curso_id = x.curso_id
    where e.id = new.estudante_id and x.categoria_id = new.categoria_id
  ) then
    raise exception 'CATEGORIA_FORA_DO_CURSO: o curso do estudante não aproveita horas nesta categoria' using errcode = 'P0001';
  end if;
  if new.data_fim > app.hoje() then
    raise exception 'ATIVIDADE_FUTURA: registra-se a atividade já realizada' using errcode = 'P0001';
  end if;
  return new;
end
$$;

-- RF050, RN-21, checked at commit: an activity in analysis has at least one valid proof
create or replace function app.exigir_comprovante_atividade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.situacao = 'EM_ANALISE'
     and not exists (select 1 from public.comprovante_atividade c where c.atividade_id = new.id and c.valido) then
    raise exception 'COMPROVANTE_OBRIGATORIO: a atividade precisa de comprovante' using errcode = 'P0001';
  end if;
  return null;
end
$$;

-- RF050, RF052, RF055: a proof is a COMPROVANTE_ATIVIDADE document of the same student, added
-- when the activity is registered or while it is returned; its hash and owner are copied here
create or replace function app.validar_comprovante_atividade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_atividade record;
  v_documento record;
begin
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - array['valido', 'atualizado_em']) is distinct from (to_jsonb(old) - array['valido', 'atualizado_em'])
       or (new.valido and not old.valido) then
      raise exception 'REGISTRO_IMUTAVEL: o comprovante só pode ser retirado' using errcode = 'P0001';
    end if;
    return new;
  end if;

  select a.estudante_id, a.situacao, a.criado_em into v_atividade from public.atividade_complementar a where a.id = new.atividade_id;
  if not (v_atividade.situacao = 'DEVOLVIDA' or (v_atividade.situacao = 'EM_ANALISE' and v_atividade.criado_em = now())) then
    raise exception 'COMPROVANTE_FORA_DO_ENVIO: comprovante entra no cadastro ou na complementação' using errcode = 'P0001';
  end if;
  if app.usuario_atual_id() is not null and v_atividade.estudante_id is distinct from app.estudante_atual_id() then
    raise exception 'CADASTRO_RESTRITO_AO_ESTUDANTE: o estudante anexa os próprios comprovantes' using errcode = 'P0001';
  end if;
  select d.tipo, d.estudante_id, d.sha256 into v_documento from public.documento d where d.id = new.documento_id;
  if v_documento.tipo is distinct from 'COMPROVANTE_ATIVIDADE' or v_documento.estudante_id is distinct from v_atividade.estudante_id then
    raise exception 'DOCUMENTO_INVALIDO: o comprovante precisa ser documento do tipo COMPROVANTE_ATIVIDADE do estudante' using errcode = 'P0001';
  end if;
  new.estudante_id := v_atividade.estudante_id;
  new.sha256 := v_documento.sha256;
  new.valido := true;
  return new;
end
$$;

-- RF051, RF054, RN-22, RN-23 (DER §5.10): the coordination of the student's course decides an
-- activity in analysis. On approval the minutes counted are the declared ones within what is
-- left of the category limit and of the course total; the rest is the excess, with its reason.
-- The student is locked, so two approvals at once cannot pass a limit together.
create or replace function app.validar_analise_atividade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_atividade record;
  v_limite integer;
  v_total integer;
  v_ja_categoria integer;
  v_ja_total integer;
  v_cabe_categoria integer;
  v_cabe_total integer;
  v_usuario uuid := app.usuario_atual_id();
begin
  select a.id, a.estudante_id, a.categoria_id, a.situacao, a.horas_declaradas_minutos, e.curso_id,
         c.nome as categoria_nome, cu.carga_atividades_complementares_minutos as total_curso
    into v_atividade
    from public.atividade_complementar a
    join public.estudante e on e.id = a.estudante_id
    join public.curso cu on cu.id = e.curso_id
    join public.categoria_atividade c on c.id = a.categoria_id
   where a.id = new.atividade_id;
  perform 1 from public.estudante where id = v_atividade.estudante_id for update;

  if v_atividade.situacao is distinct from 'EM_ANALISE' then
    raise exception 'ATIVIDADE_NAO_ANALISAVEL: só atividade em análise recebe decisão' using errcode = 'P0001';
  end if;
  if v_usuario is not null and (new.analisado_por_usuario_id is distinct from v_usuario
     or not app.coordena_curso(v_atividade.curso_id)) then
    raise exception 'ANALISE_RESTRITA_A_COORDENACAO: só a coordenação do curso do estudante analisa' using errcode = 'P0001';
  end if;
  new.motivo := nullif(btrim(new.motivo), '');

  if new.decisao = 'APROVADA' then
    select x.limite_minutos into v_limite from public.exigencia_categoria x
     where x.curso_id = v_atividade.curso_id and x.categoria_id = v_atividade.categoria_id;
    v_limite := coalesce(v_limite, 0);
    v_total := v_atividade.total_curso;
    select coalesce(sum(a.horas_aproveitadas_minutos) filter (where a.categoria_id = v_atividade.categoria_id), 0),
           coalesce(sum(a.horas_aproveitadas_minutos), 0)
      into v_ja_categoria, v_ja_total
      from public.atividade_complementar a
     where a.estudante_id = v_atividade.estudante_id and a.situacao = 'APROVADA' and a.id <> v_atividade.id;
    v_cabe_categoria := greatest(v_limite - v_ja_categoria, 0);
    v_cabe_total := greatest(v_total - v_ja_total, 0);
    new.horas_aproveitadas_minutos := least(v_atividade.horas_declaradas_minutos, v_cabe_categoria, v_cabe_total);
    new.minutos_excedentes := v_atividade.horas_declaradas_minutos - new.horas_aproveitadas_minutos;
    new.motivo_excedente := case
      when new.minutos_excedentes = 0 then null
      when v_cabe_categoria <= v_cabe_total then format('Limite de %s h da categoria %s no curso atingido', v_limite / 60.0, v_atividade.categoria_nome)
      else format('Carga total de %s h de atividades complementares do curso atingida', v_total / 60.0)
    end;
  else
    new.horas_aproveitadas_minutos := null;
    new.minutos_excedentes := null;
    new.motivo_excedente := null;
  end if;
  return new;
end
$$;

-- Applies the decision to the activity; a refusal frees its proofs for a new activity (the
-- refusal is final: no appeal, a new activity is registered)
create or replace function app.aplicar_analise_atividade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.atividade_complementar
     set situacao = new.decisao::text::public.situacao_atividade,
         horas_aproveitadas_minutos = new.horas_aproveitadas_minutos
   where id = new.atividade_id;
  if new.decisao = 'RECUSADA' then
    update public.comprovante_atividade set valido = false where atividade_id = new.atividade_id and valido;
  end if;
  return null;
end
$$;

revoke all on function app.estudantes_legiveis() from public;
revoke all on function app.coordena_curso_do_estudante(uuid) from public;
revoke all on function app.estudante_da_atividade(uuid) from public;
revoke all on function app.validar_atividade() from public;
revoke all on function app.exigir_comprovante_atividade() from public;
revoke all on function app.validar_comprovante_atividade() from public;
revoke all on function app.validar_analise_atividade() from public;
revoke all on function app.aplicar_analise_atividade() from public;

grant execute on function app.estudantes_legiveis() to app_runtime;
grant execute on function app.coordena_curso_do_estudante(uuid) to app_runtime;
grant execute on function app.estudante_da_atividade(uuid) to app_runtime;
