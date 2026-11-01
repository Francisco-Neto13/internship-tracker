import { authenticatedRoute, dataResponse } from "@/lib/api";
import { getMediaAvaliacoesConcedente } from "@/modules/acompanhamento/services/avaliacao-service";
import { idParamSchema } from "@/modules/concedentes/schemas/concedente";
import { getHistoricoConcedente } from "@/modules/estagios/services/estagio-service";

// RF014: internships of the concedente by situation, completion rate and the average of the
// final evaluations (0 to 10), with no personal data. M04 and M05 answer each part.
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const [historico, avaliacoes] = await Promise.all([getHistoricoConcedente(identity, id), getMediaAvaliacoesConcedente(identity, id)]);
  return dataResponse({
    total: historico.total,
    por_situacao: historico.porSituacao,
    taxa_conclusao: historico.taxaConclusao,
    media_avaliacoes: avaliacoes.media,
    avaliacoes_finais: avaliacoes.avaliacoes,
  });
});
