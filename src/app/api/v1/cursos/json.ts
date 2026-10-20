import type { CursoRow } from "@/modules/academico/repositories/curso-repository";

// JSON shape of /api/v1/cursos responses: durations in hours, snake_case (AGENTS.md conventions)
export function cursoJson(row: CursoRow) {
  return {
    id: row.id,
    codigo: row.codigo,
    nome: row.nome,
    carga_minima_estagio_horas: row.cargaMinimaEstagioMinutos / 60,
    carga_atividades_complementares_horas: row.cargaAtividadesComplementaresMinutos / 60,
  };
}
