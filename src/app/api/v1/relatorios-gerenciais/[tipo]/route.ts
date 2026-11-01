import { authenticatedRoute, dataResponse, searchParamsOf } from "@/lib/api";
import { relatorioQuerySchema, tipoRelatorioParamSchema } from "@/modules/administracao/schemas/relatorios-gerenciais";
import { gerarRelatorio } from "@/modules/administracao/services/relatorio-gerencial-service";

// RF067: estagiarios-ativos, concedentes-parceiras, taxa-conclusao, pendencias-integralizacao.
// Administrator: every course; coordination: its courses; any other profile: empty list.
export const GET = authenticatedRoute<{ tipo: string }>(async ({ request, identity, params }) => {
  const { tipo } = tipoRelatorioParamSchema.parse(params);
  const filtro = relatorioQuerySchema.parse(searchParamsOf(request));
  return dataResponse(await gerarRelatorio(identity, tipo, filtro));
});
