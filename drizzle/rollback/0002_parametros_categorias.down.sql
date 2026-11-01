-- Reverts 0002_parametros_categorias (RF004, RF006)
drop table if exists public.exigencia_categoria;
drop table if exists public.categoria_atividade;
drop table if exists public.parametro_institucional;
