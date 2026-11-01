-- Reverts 0012_notificacoes (RF070). Removes every notification (no business decision lives in
-- them; the facts that caused them are audited at their source).
drop trigger if exists notificar_situacao_estagio on public.estagio;
drop trigger if exists notificar_substituicao on public.responsavel_estagio;
drop trigger if exists notificar_divergencia on public.divergencia_carga_horaria;
drop trigger if exists notificar_parecer_relatorio on public.parecer_relatorio;
drop trigger if exists notificar_analise_atividade on public.analise_atividade;
drop table if exists public.notificacao;
-- Functions whose signature uses the type below (drizzle/sql recreates them on migrate)
drop function if exists app.notificar(uuid, public.tipo_notificacao, text, text, text, uuid, text);
drop function if exists app.notificar_estagio(uuid, text[], public.tipo_notificacao, text, text, text);
drop type if exists public.tipo_notificacao;
