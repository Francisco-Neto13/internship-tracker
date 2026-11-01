import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/concedentes/schemas/concedente";
import { renovarConvenioBodySchema } from "@/modules/concedentes/schemas/convenio";
import { renovarConvenio } from "@/modules/concedentes/services/convenio-service";
import { convenioJson } from "../../json";

// RF011: a new period after the current one; the previous periods are kept
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = renovarConvenioBodySchema.parse(await request.json());
  const renovado = await renovarConvenio(identity, id, {
    vigenciaInicio: body.vigencia_inicio,
    vigenciaFim: body.vigencia_fim,
    documentoId: body.documento_id,
  });
  return dataResponse(convenioJson(renovado), { status: 201 });
});
