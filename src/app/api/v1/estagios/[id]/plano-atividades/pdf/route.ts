import { authenticatedRoute } from "@/lib/api";
import { idParamSchema } from "@/modules/estagios/schemas/estagio";
import { pdfPlano } from "@/modules/estagios/services/documento-estagio-service";
import { pdfResponse } from "../../../../_estagios/pdf-response";

// RF022: the activity plan (approved version, or the latest one) as a PDF
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return pdfResponse(await pdfPlano(identity, id), `plano-atividades-${id}.pdf`);
});
