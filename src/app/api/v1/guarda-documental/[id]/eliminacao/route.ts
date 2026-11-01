import { authenticatedRoute, dataResponse } from "@/lib/api";
import { documentoIdParamSchema } from "@/modules/administracao/schemas/guarda";
import { eliminarDocumentoVencido } from "@/modules/administracao/services/guarda-service";

// RF069, RN-30: the administrator eliminates the object of a document past its retention
// period; the row and its hash stay, marked as eliminated and audited
export const POST = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = documentoIdParamSchema.parse(params);
  const { eliminadoEm } = await eliminarDocumentoVencido(identity, id);
  return dataResponse({ id, eliminado_em: eliminadoEm.toISOString() });
});
