// RF057, RN-24: what the student sees of an assessment: what is left of the internship and of
// the complementary activities, and the categories that still accept hours. The numbers come
// from app.calcular_integralizacao (DER §5.10); this only derives what is shown.

export type CategoriaApurada = { categoriaId: string; limiteMinutos: number; aproveitadoMinutos: number };

export type Apuracao = {
  estagioExigidoMinutos: number;
  estagioConcluidoMinutos: number;
  atividadesExigidoMinutos: number;
  atividadesAproveitadoMinutos: number;
  categorias: CategoriaApurada[];
};

export type Situacao = "CUMPRIDO" | "PENDENTE";

export function progresso(apuracao: Apuracao) {
  const estagioCumprido = apuracao.estagioConcluidoMinutos >= apuracao.estagioExigidoMinutos;
  const atividadesCumpridas = apuracao.atividadesAproveitadoMinutos >= apuracao.atividadesExigidoMinutos;
  return {
    estagio: {
      situacao: (estagioCumprido ? "CUMPRIDO" : "PENDENTE") as Situacao,
      pendenteMinutos: Math.max(apuracao.estagioExigidoMinutos - apuracao.estagioConcluidoMinutos, 0),
    },
    atividades: {
      situacao: (atividadesCumpridas ? "CUMPRIDO" : "PENDENTE") as Situacao,
      pendenteMinutos: Math.max(apuracao.atividadesExigidoMinutos - apuracao.atividadesAproveitadoMinutos, 0),
      // RN-24: categories that still accept hours
      categoriasPendentes: apuracao.categorias.filter((categoria) => categoria.aproveitadoMinutos < categoria.limiteMinutos).map((categoria) => categoria.categoriaId),
    },
    situacaoGeral: (estagioCumprido && atividadesCumpridas ? "CUMPRIDO" : "PENDENTE") as Situacao,
  };
}
