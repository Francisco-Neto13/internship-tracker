import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { getRelatorio } from "@/modules/acompanhamento/services/relatorio-service";
import { relatorioJson, versaoJson } from "../../_acompanhamento/json";

// RF039: the report with all versions, attachments and opinions
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { relatorio, versoes } = await getRelatorio(identity, id);
  return dataResponse({ ...relatorioJson(relatorio), versoes: versoes.map(versaoJson) });
});
