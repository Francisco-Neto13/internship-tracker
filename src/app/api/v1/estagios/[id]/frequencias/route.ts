import { authenticatedRoute, dataResponse, searchParamsOf } from "@/lib/api";
import { frequenciaBodySchema, frequenciasQuerySchema, idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { listFrequencias, registrarFrequencia } from "@/modules/acompanhamento/services/frequencia-service";
import { frequenciaJson } from "../../../_acompanhamento/json";

// RF023: entries of the internship, corrections and cancellations included (history, RF029)
export const GET = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const filtros = frequenciasQuerySchema.parse(searchParamsOf(request));
  return dataResponse((await listFrequencias(identity, id, filtros)).map(frequenciaJson));
});

// RF023 to RF025: the student records a day; over a limit, 422 or SINALIZADO (with "aviso")
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = frequenciaBodySchema.parse(await request.json());
  return dataResponse(frequenciaJson(await registrarFrequencia(identity, id, body)), { status: 201 });
});
