-- Reverts 0004_documentos_convenios (RF009-RF012, documento). Fails while estagio or
-- other tables reference documento or convenio: revert those migrations first.
drop table if exists public.convenio_vigencia;
drop table if exists public.convenio;
drop table if exists public.documento;
drop type if exists public.situacao_convenio;
drop type if exists public.tipo_documento;
-- btree_gist stays: other objects may use it, and keeping it is harmless
