-- Reverts 0018_auditoria_titular (RF003). The trail loses which administrator acted through the
-- profile switch: export it first (pg_dump -t auditoria). app.registrar_auditoria writes the
-- column, so until npm run db:migrate runs from the previous commit every audited write fails;
-- run both in the same maintenance window.
begin;
drop function if exists app.titular_atual_id();
alter table public.auditoria drop column if exists titular_id;
commit;
