import { authenticatedRoute, dataResponse, SEM_CACHE } from "@/lib/api";
import { listarAcessosDocumento } from "@/shared/documentos/documento-service";
import { documentoIdParamSchema } from "@/shared/documentos/schemas";

// RF073, RN-38: who viewed or downloaded a sensitive document, when and under which profile
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = documentoIdParamSchema.parse(params);
  const acessos = await listarAcessosDocumento(identity, id);
  return dataResponse(
    acessos.map((acesso) => ({
      ocorrido_em: acesso.ocorridoEm.toISOString(),
      usuario_id: acesso.usuarioId,
      usuario_nome: acesso.usuarioNome,
      perfil: acesso.perfil,
    })),
    { headers: SEM_CACHE },
  );
});
