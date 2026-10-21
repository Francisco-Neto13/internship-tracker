import { authenticatedRoute, dataResponse } from "@/lib/api";
import { createConvenioBodySchema } from "@/modules/concedentes/schemas/convenio";
import { idParamSchema } from "@/modules/concedentes/schemas/concedente";
import { createConvenio, listConveniosDaConcedente } from "@/modules/concedentes/services/convenio-service";
import { convenioJson } from "../../../convenios/json";

// RF009, RF011: agreements of the concedente with every period (RLS: administrator,
// coordination and the concedente itself)
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse((await listConveniosDaConcedente(identity, id)).map(convenioJson));
});

// RF009: number, first period and the signed agreement already uploaded (POST /documentos/upload)
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = createConvenioBodySchema.parse(await request.json());
  const criado = await createConvenio(identity, id, {
    numero: body.numero,
    observacao: body.observacao ?? null,
    vigenciaInicio: body.vigencia_inicio,
    vigenciaFim: body.vigencia_fim,
    documentoId: body.documento_id,
  });
  return dataResponse(convenioJson(criado), { status: 201 });
});
