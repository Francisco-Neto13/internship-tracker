-- Audit trail written by the database, so no route, script or migration can skip it
-- (RF065, RN-28). The function is SECURITY DEFINER: runtime roles hold no INSERT
-- privilege on auditoria and cannot forge entries.

-- Columns whose content never enters the trail (AGENTS.md: the administrator reads the
-- trail but not report or medical-leave content; RN-38, RF071). Declarative like the
-- policies: rebuilt on every migration, and listed before the table exists, so the rule
-- holds from the first row a future table receives. The trail still records that the
-- column changed (campos_alterados) and keeps "[omitido]" in place of the value.
create table if not exists app.coluna_sensivel (
  tabela text not null,
  coluna text not null,
  motivo text not null,
  primary key (tabela, coluna)
);
revoke all on app.coluna_sensivel from public;

delete from app.coluna_sensivel;
insert into app.coluna_sensivel (tabela, coluna, motivo) values
  ('versao_relatorio', 'conteudo', 'Conteúdo de relatório: o administrador não lê (RF037, AGENTS.md)'),
  ('parecer_relatorio', 'texto', 'Parecer sobre relatório: o administrador não lê (RF038, AGENTS.md)'),
  ('afastamento', 'descricao', 'Dado de saúde (LGPD art. 5º, II; RN-38)'),
  -- M05: free text on hours and their analysis may carry personal or health information
  -- ("faltei por consulta"); the administrator has no access to these tables (RN-37)
  ('registro_frequencia', 'observacao', 'Texto livre do estudante sobre o dia (RF023; LGPD art. 6º, III)'),
  ('homologacao_frequencia', 'observacao', 'Parecer do supervisor sobre o período (RF027)'),
  ('divergencia_carga_horaria', 'parecer', 'Análise do orientador sobre a divergência (RF028)');

create or replace function app.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_anteriores jsonb;
  v_novos jsonb;
  v_alterados text[];
  v_coluna text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_anteriores := to_jsonb(old);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_novos := to_jsonb(new);
  end if;

  if tg_op = 'UPDATE' then
    select array_agg(n.key order by n.key)
      into v_alterados
      from jsonb_each(v_novos) n
     where n.value is distinct from v_anteriores -> n.key;

    if v_alterados is null then
      return null;
    end if;
  end if;

  -- Masked after the diff, so a change to a sensitive column is still recorded as a change
  for v_coluna in select c.coluna from app.coluna_sensivel c where c.tabela = tg_table_name loop
    if v_anteriores ? v_coluna and jsonb_typeof(v_anteriores -> v_coluna) <> 'null' then
      v_anteriores := jsonb_set(v_anteriores, array[v_coluna], '"[omitido]"'::jsonb);
    end if;
    if v_novos ? v_coluna and jsonb_typeof(v_novos -> v_coluna) <> 'null' then
      v_novos := jsonb_set(v_novos, array[v_coluna], '"[omitido]"'::jsonb);
    end if;
  end loop;

  insert into public.auditoria (usuario_id, tabela, registro_id, operacao, dados_anteriores, dados_novos, campos_alterados)
  values (
    app.usuario_atual_id(),
    tg_table_name,
    coalesce(v_novos ->> 'id', v_anteriores ->> 'id'),
    tg_op,
    v_anteriores,
    v_novos,
    v_alterados
  );

  return null;
end
$$;

-- RN-28: the trail is append-only for every role, the owner included
create or replace function app.bloquear_alteracao_auditoria()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'auditoria aceita apenas inclusao (RN-28): % bloqueado', tg_op
    using errcode = 'insufficient_privilege';
end
$$;

create or replace function app.definir_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end
$$;

revoke all on function app.registrar_auditoria() from public;
revoke all on function app.bloquear_alteracao_auditoria() from public;
revoke all on function app.definir_atualizado_em() from public;

-- Immutable tables (versioned parameters, history rows): no UPDATE for any role, the
-- owner included. Runtime roles also lack the grant; this covers scripts and migrations.
create or replace function app.bloquear_alteracao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'REGISTRO_IMUTAVEL: % em % não é permitido', tg_op, tg_table_name
    using errcode = 'P0001';
end
$$;

revoke all on function app.bloquear_alteracao() from public;
