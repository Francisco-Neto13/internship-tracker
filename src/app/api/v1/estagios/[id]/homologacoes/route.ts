import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { listHomologacoes } from "@/modules/acompanhamento/services/frequencia-service";
import { homologacaoJson } from "../../../_acompanhamento/json";

// RF027: who homologated which period, when, how many hours and the opinion
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse((await listHomologacoes(identity, id)).map(homologacaoJson));
});
