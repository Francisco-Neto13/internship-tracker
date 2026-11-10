import { authenticatedRoute } from "@/lib/api";
import { idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { pdfRelatorio } from "@/modules/acompanhamento/services/relatorio-service";
import { pdfResponse } from "../../../_estagios/pdf-response";

// RF037 to RF039: the report as a PDF, with its versions and opinions
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return pdfResponse(await pdfRelatorio(identity, id), `relatorio-${id}.pdf`);
});
