import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema, rescisaoBodySchema } from "@/modules/estagios/schemas/estagio";
import { getRescisao, rescindirEstagio } from "@/modules/estagios/services/encerramento-service";
import { rescisaoJson } from "../../json";

// RF063, RF064: the rescission of the internship, with the hours consolidated up to its date
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse(rescisaoJson(await getRescisao(identity, id)));
});

export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = rescisaoBodySchema.parse(await request.json());
  const rescisao = await rescindirEstagio(identity, id, {
    dataRescisao: body.data_rescisao,
    solicitante: body.solicitante,
    motivo: body.motivo,
    documentoId: body.documento_id,
  });
  return dataResponse(rescisaoJson(rescisao), { status: 201 });
});
