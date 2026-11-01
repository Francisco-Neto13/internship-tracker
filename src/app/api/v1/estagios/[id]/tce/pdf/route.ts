import { authenticatedRoute } from "@/lib/api";
import { idParamSchema } from "@/modules/estagios/schemas/estagio";
import { pdfTce } from "@/modules/estagios/services/documento-estagio-service";
import { pdfResponse } from "../../../../_estagios/pdf-response";

// RF022: the TCE in force as a PDF, with its SHA-256 and the signatures over it
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return pdfResponse(await pdfTce(identity, id), `tce-${id}.pdf`);
});
