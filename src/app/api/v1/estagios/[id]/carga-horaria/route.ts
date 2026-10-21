import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { getCargaHoraria } from "@/modules/acompanhamento/services/frequencia-service";
import { cargaHorariaJson } from "../../../_acompanhamento/json";

// RF026, RF028: hours in force, homologated (the ones that count), balance, completion and divergence
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { resumo, divergencia, divergenciaAbertaId } = await getCargaHoraria(identity, id);
  return dataResponse(cargaHorariaJson(resumo, divergencia, divergenciaAbertaId));
});
