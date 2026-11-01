import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/concedentes/schemas/concedente";
import { listHistoricoSituacao } from "@/modules/concedentes/services/concedente-service";

// RF008: every suspension and reactivation, with reason and author (RLS: administrator,
// coordination and the concedente itself)
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const historico = await listHistoricoSituacao(identity, id);
  return dataResponse(
    historico.map((item) => ({
      id: item.id,
      situacao_nova: item.situacaoNova,
      motivo: item.motivo,
      decidido_por: { id: item.decididoPorUsuarioId, nome: item.decididoPorNome },
      criado_em: item.criadoEm.toISOString(),
    })),
  );
});
