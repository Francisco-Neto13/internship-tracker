import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { pendenciasConclusao } from "@/modules/acompanhamento/services/conclusao-service";

// RF043, RF045, D3: what still keeps the internship from being concluded, all at once
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { situacao, podeConcluir, impedimentos } = await pendenciasConclusao(identity, id);
  return dataResponse({
    situacao,
    pode_concluir: podeConcluir,
    impedimentos: impedimentos.map((item) => ({ code: item.code, mensagem: item.issue, requisito: item.requisito })),
  });
});
