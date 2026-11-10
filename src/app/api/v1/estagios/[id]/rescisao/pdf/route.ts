import { authenticatedRoute } from "@/lib/api";
import { idParamSchema } from "@/modules/estagios/schemas/estagio";
import { pdfRescisao } from "@/modules/estagios/services/documento-estagio-service";
import { pdfResponse } from "../../../../_estagios/pdf-response";

// RF063, RF064: the termination term of the internship as a PDF
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return pdfResponse(await pdfRescisao(identity, id), `termo-rescisao-${id}.pdf`);
});
