import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/concedentes/schemas/concedente";
import { updateConvenioBodySchema } from "@/modules/concedentes/schemas/convenio";
import { atualizarObservacao, getConvenio } from "@/modules/concedentes/services/convenio-service";
import { convenioJson } from "../json";

export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse(convenioJson(await getConvenio(identity, id)));
});

// RF009: only non-historical data; periods change through /renovacao, status through /encerramento
export const PATCH = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { observacao } = updateConvenioBodySchema.parse(await request.json());
  return dataResponse(convenioJson(await atualizarObservacao(identity, id, observacao)));
});
