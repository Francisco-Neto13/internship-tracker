import { authenticatedRoute } from "@/lib/api";
import { idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { pdfFrequencia } from "@/modules/acompanhamento/services/frequencia-service";
import { pdfResponse } from "../../../../_estagios/pdf-response";

// RF026: the attendance sheet of the internship as a PDF
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return pdfResponse(await pdfFrequencia(identity, id), `folha-frequencia-${id}.pdf`);
});
