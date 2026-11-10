import { z } from "zod";
import { authenticatedRoute } from "@/lib/api";
import { pdfAvaliacao } from "@/modules/acompanhamento/services/avaliacao-service";
import { pdfResponse } from "../../../../../_estagios/pdf-response";

const paramsSchema = z.object({ id: z.uuid(), avaliacaoId: z.uuid() });

// RF042, RF043: a performance evaluation as a PDF
export const GET = authenticatedRoute<{ id: string; avaliacaoId: string }>(async ({ identity, params }) => {
  const { id, avaliacaoId } = paramsSchema.parse(params);
  return pdfResponse(await pdfAvaliacao(identity, id, avaliacaoId), `avaliacao-${avaliacaoId}.pdf`);
});
