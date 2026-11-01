import type { CategoriaRow } from "@/modules/academico/repositories/categoria-repository";

export function categoriaJson(row: CategoriaRow) {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    ativa: row.ativa,
    criado_em: row.criadoEm.toISOString(),
  };
}
