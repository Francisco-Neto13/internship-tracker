import { authenticatedRoute, dataResponse } from "@/lib/api";
import { listFilaAnalise } from "@/modules/atividades/services/atividade-service";
import { atividadeJson, previaJson } from "../../_atividades/json";

// RF053: the coordination's queue, oldest sending first, with the preview of the hours the
// approval would count (RF051)
export const GET = authenticatedRoute(async ({ identity }) => {
  const fila = await listFilaAnalise(identity);
  return dataResponse(fila.map((item) => ({ ...atividadeJson(item.atividade), previa_aproveitamento: previaJson(item.previa) })));
});
