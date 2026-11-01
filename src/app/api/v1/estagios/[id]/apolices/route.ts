import { authenticatedRoute, dataResponse } from "@/lib/api";
import { apoliceBodySchema, idParamSchema } from "@/modules/estagios/schemas/estagio";
import { listApolices, registrarApolice } from "@/modules/estagios/services/formalizacao-service";
import { apoliceJson } from "../../json";

// RF018, RN-33: every policy recorded (renewals and corrections are new rows)
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse((await listApolices(identity, id)).map(apoliceJson));
});

// RF018: coordination or the concedente records insurer, number, contracting party and period
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = apoliceBodySchema.parse(await request.json());
  const apolice = await registrarApolice(identity, id, {
    seguradora: body.seguradora,
    numeroApolice: body.numero_apolice,
    contratante: body.contratante,
    vigenciaInicio: body.vigencia_inicio,
    vigenciaFim: body.vigencia_fim,
    substituiApoliceId: body.substitui_apolice_id ?? null,
    documentoId: body.documento_id ?? null,
  });
  return dataResponse(apoliceJson(apolice), { status: 201 });
});
