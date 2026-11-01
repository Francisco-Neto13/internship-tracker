import { minutosParaHoras } from "@/lib/horas";
import type { Integralizacao } from "@/modules/integralizacao/services/integralizacao-service";

// JSON of /integralizacao (ENDPOINTS-API §8): hours, with what is left and the pending categories (RN-24)
export function integralizacaoJson(item: Integralizacao) {
  const { apuracao, progresso } = item;
  return {
    estudante_id: item.estudanteId,
    apurado_em: item.apuradoEm?.toISOString() ?? null,
    gatilho: item.gatilho,
    apuracoes: item.apuracoes,
    estagio_obrigatorio: {
      exigido: minutosParaHoras(apuracao.estagioExigidoMinutos),
      concluido: minutosParaHoras(apuracao.estagioConcluidoMinutos),
      pendente: minutosParaHoras(progresso.estagio.pendenteMinutos),
      situacao: progresso.estagio.situacao,
    },
    atividades_complementares: {
      exigido: minutosParaHoras(apuracao.atividadesExigidoMinutos),
      aproveitado: minutosParaHoras(apuracao.atividadesAproveitadoMinutos),
      pendente: minutosParaHoras(progresso.atividades.pendenteMinutos),
      situacao: progresso.atividades.situacao,
      por_categoria: item.categorias.map((categoria) => ({
        categoria_id: categoria.categoriaId,
        categoria: categoria.categoriaNome,
        limite: minutosParaHoras(categoria.limiteMinutos),
        aproveitado: minutosParaHoras(categoria.aproveitadoMinutos),
        situacao: categoria.aproveitadoMinutos >= categoria.limiteMinutos ? "LIMITE_ATINGIDO" : "EM_ANDAMENTO",
      })),
    },
    situacao_geral: progresso.situacaoGeral,
  };
}
