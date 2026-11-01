import { authenticatedRoute, dataResponse } from "@/lib/api";
import { afastamentoBodySchema, idParamSchema, toNovoAfastamento } from "@/modules/estagios/schemas/estagio";
import { listAfastamentos, registrarAfastamento } from "@/modules/estagios/services/afastamento-service";
import { afastamentoJson } from "../../json";

// RF059, RF060: leaves of the internship (student, advisor and coordination read them)
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse((await listAfastamentos(identity, id)).map(afastamentoJson));
});

// The coordination registers; the planned end moves by the same calendar days, up to the cap
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = afastamentoBodySchema.parse(await request.json());
  return dataResponse(afastamentoJson(await registrarAfastamento(identity, id, toNovoAfastamento(body))), { status: 201 });
});
