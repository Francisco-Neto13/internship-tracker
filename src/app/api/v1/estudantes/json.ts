import type { EstudanteRow } from "@/modules/academico/repositories/estudante-repository";

// JSON shape of /api/v1/estudantes responses (snake_case). nome and email come from the
// usuario row and are null if its own policy hides it from the caller.
export function estudanteJson(row: Omit<EstudanteRow, "nome" | "email"> & Partial<Pick<EstudanteRow, "nome" | "email">>) {
  return {
    id: row.id,
    usuario_id: row.usuarioId,
    curso_id: row.cursoId,
    nome: row.nome ?? null,
    email: row.email ?? null,
    matricula: row.matricula,
    periodo: row.periodo,
    situacao_academica: row.situacaoAcademica,
  };
}
