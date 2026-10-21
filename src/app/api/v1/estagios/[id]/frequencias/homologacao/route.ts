import { authenticatedRoute, dataResponse } from "@/lib/api";
import { homologacaoBodySchema, idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { homologarFrequencia } from "@/modules/acompanhamento/services/frequencia-service";
import { homologacaoJson } from "../../../../_acompanhamento/json";

// RF027: the supervisor homologates the entries waiting in a closed period
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = homologacaoBodySchema.parse(await request.json());
  const { homologacao, lancamentos, sinalizados } = await homologarFrequencia(identity, id, body);
  return dataResponse({ ...homologacaoJson(homologacao), lancamentos_homologados: lancamentos, lancamentos_sinalizados: sinalizados }, { status: 201 });
});
