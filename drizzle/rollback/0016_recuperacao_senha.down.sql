-- Reverts 0016_recuperacao_senha (RF002). PostgreSQL cannot drop an enum value, so the type is
-- rebuilt without it, and the requests already notified are lost. app.notificar and
-- app.notificar_estagio have the type in their signatures and are recreated by npm run db:migrate
-- from the previous commit.
begin;
drop function if exists app.solicitar_recuperacao_senha(text);
drop function if exists app.notificar(uuid, public.tipo_notificacao, text, text, text, uuid, text);
drop function if exists app.notificar_estagio(uuid, text[], public.tipo_notificacao, text, text, text);
delete from public.notificacao where tipo = 'RECUPERACAO_SENHA';
alter type public.tipo_notificacao rename to tipo_notificacao_antigo;
create type public.tipo_notificacao as enum (
  'CONVENIO_A_VENCER', 'RELATORIO_PENDENTE', 'RELATORIO_ATRASADO', 'DIVERGENCIA_CARGA_HORARIA', 'SUBSTITUICAO_RESPONSAVEL',
  'MUDANCA_SITUACAO', 'PRAZO_GUARDA_ATINGIDO', 'DURACAO_MAXIMA_ATINGIDA', 'RELATORIO_ANALISADO', 'ATIVIDADE_ANALISADA'
);
alter table public.notificacao alter column tipo type public.tipo_notificacao using tipo::text::public.tipo_notificacao;
drop type public.tipo_notificacao_antigo;
commit;
