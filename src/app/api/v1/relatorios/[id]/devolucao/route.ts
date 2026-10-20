import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { devolucaoRelatorioBodySchema } from "@/modules/acompanhamento/schemas/relatorio";
import { decidirRelatorio } from "@/modules/acompanhamento/services/relatorio-service";
import { parecerJson } from "../../../_acompanhamento/json";

// RF038, RF039: the advisor returns the latest version for correction; opinion required
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { parecer } = devolucaoRelatorioBodySchema.parse(await request.json());
  return dataResponse(parecerJson(await decidirRelatorio(identity, id, "DEVOLVIDO", parecer)), { status: 201 });
});
