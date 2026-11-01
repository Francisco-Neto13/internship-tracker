import { authenticatedRoute, dataResponse, searchParamsOf } from "@/lib/api";
import { dataLocal } from "@/modules/academico/domain/parametros";
import { getParametrosVigentes } from "@/modules/academico/services/parametro-service";
import { aVencerQuerySchema } from "@/modules/concedentes/schemas/convenio";
import { listConveniosAVencer } from "@/modules/concedentes/services/convenio-service";

// RF012: agreements that lapse within `dias` (default: the institutional alert lead time,
// RF006) and have no later period. In-app notification itself arrives with the notificacao
// table (Fase 5); this endpoint feeds the dashboard and that routine.
export const GET = authenticatedRoute(async ({ request, identity }) => {
  const query = aVencerQuerySchema.parse(searchParamsOf(request));
  const hoje = dataLocal();
  const dias = query.dias ?? (await getParametrosVigentes(identity, hoje)).antecedenciaAlertaConvenioDias;
  const itens = await listConveniosAVencer(identity, hoje, dias);
  return dataResponse(
    itens.map((item) => ({
      convenio_id: item.id,
      numero: item.numero,
      concedente_id: item.concedenteId,
      concedente: item.concedenteRazaoSocial,
      vigencia_fim: item.vigenciaFim,
    })),
    { meta: { de: hoje, dias } },
  );
});
