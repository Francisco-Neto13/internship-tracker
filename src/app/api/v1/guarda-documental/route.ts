import { authenticatedRoute, dataResponse, searchParamsOf } from "@/lib/api";
import { guardaQuerySchema } from "@/modules/administracao/schemas/guarda";
import { listDocumentosEmGuarda } from "@/modules/administracao/services/guarda-service";

// RF069: documents whose retention period ends until `ate` (default: today), administrator
// only; other profiles receive an empty list. Metadata only: no name, no content (RN-38).
export const GET = authenticatedRoute(async ({ request, identity }) => {
  const { ate } = guardaQuerySchema.parse(searchParamsOf(request));
  const itens = await listDocumentosEmGuarda(identity, ate ?? null);
  return dataResponse(
    itens.map((item) => ({
      id: item.id,
      tipo: item.tipo,
      sensivel: item.sensivel,
      escopo: item.escopo,
      data_liberacao_guarda: item.dataLiberacaoGuarda,
      criado_em: item.criadoEm.toISOString(),
    })),
  );
});
