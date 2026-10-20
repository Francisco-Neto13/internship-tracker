import { authenticatedRoute, dataResponse, searchParamsOf } from "@/lib/api";
import { listAuditoriaQuerySchema, toFiltroAuditoria } from "@/modules/administracao/schemas/auditoria";
import { listRegistros } from "@/modules/administracao/services/auditoria-service";

// RF066: filtered query of the audit trail. RLS lets only the administrator read it; any
// other profile receives an empty list (the trail exists, it is not theirs to see).
export const GET = authenticatedRoute(async ({ request, identity }) => {
  const query = listAuditoriaQuerySchema.parse(searchParamsOf(request));
  const { items, total } = await listRegistros(identity, toFiltroAuditoria(query), { page: query.page, limit: query.limit });

  return dataResponse(
    items.map((registro) => ({
      id: registro.id,
      ocorrido_em: registro.ocorridoEm.toISOString(),
      operacao: registro.operacao,
      tabela: registro.tabela,
      registro_id: registro.registroId,
      usuario_id: registro.usuarioId,
      autor: registro.usuarioId ? { nome: registro.autorNome, email: registro.autorEmail } : null,
      campos_alterados: registro.camposAlterados,
      dados_anteriores: registro.dadosAnteriores,
      dados_novos: registro.dadosNovos,
    })),
    { meta: { total, page: query.page, limit: query.limit } },
  );
});
