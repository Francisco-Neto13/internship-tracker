import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { envioRelatorioBodySchema } from "@/modules/acompanhamento/schemas/relatorio";
import { enviarRelatorio, getRelatorio } from "@/modules/acompanhamento/services/relatorio-service";
import { relatorioJson, versaoJson } from "../../../_acompanhamento/json";

// RF037, RF039, RF041: the student sends the report (first time or corrected), with text and/or
// attachments uploaded first through /documentos/upload (tipo RELATORIO)
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = envioRelatorioBodySchema.parse(await request.json());
  await enviarRelatorio(identity, id, body);
  const { relatorio, versoes } = await getRelatorio(identity, id);
  return dataResponse({ ...relatorioJson(relatorio), versoes: versoes.map(versaoJson) }, { status: 201 });
});
