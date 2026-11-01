import { authenticatedRoute } from "@/lib/api";
import { idParamSchema } from "@/modules/estagios/schemas/estagio";
import { pdfAditivo } from "@/modules/estagios/services/documento-estagio-service";
import { pdfResponse } from "../../../_estagios/pdf-response";

// RF022: an amendment as a PDF, with its content hash and the signatures over it
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return pdfResponse(await pdfAditivo(identity, id), `aditivo-${id}.pdf`);
});
