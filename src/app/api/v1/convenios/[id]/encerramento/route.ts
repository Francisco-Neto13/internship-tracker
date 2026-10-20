import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/concedentes/schemas/concedente";
import { encerrarConvenioBodySchema } from "@/modules/concedentes/schemas/convenio";
import { encerrarConvenio } from "@/modules/concedentes/services/convenio-service";
import { convenioJson } from "../../json";

// RF009: early termination with a reason; the agreement stops counting for RF010
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { motivo } = encerrarConvenioBodySchema.parse(await request.json());
  return dataResponse(convenioJson(await encerrarConvenio(identity, id, motivo)));
});
