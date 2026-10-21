import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/concedentes/schemas/concedente";
import { getHistoricoConcedente } from "@/modules/estagios/services/estagio-service";

// RF014: internships of the concedente by situation and completion rate (no personal data).
// The average evaluation arrives with avaliacao_desempenho (Fase 3).
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const historico = await getHistoricoConcedente(identity, id);
  return dataResponse({
    total: historico.total,
    por_situacao: historico.porSituacao,
    taxa_conclusao: historico.taxaConclusao,
    media_avaliacoes: historico.mediaAvaliacoes,
  });
});
