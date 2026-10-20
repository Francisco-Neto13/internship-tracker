import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { aprovacaoRelatorioBodySchema } from "@/modules/acompanhamento/schemas/relatorio";
import { decidirRelatorio } from "@/modules/acompanhamento/services/relatorio-service";
import { parecerJson } from "../../../_acompanhamento/json";

// RF038: the advisor approves the latest version, with an optional opinion
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { parecer } = aprovacaoRelatorioBodySchema.parse(await request.json());
  return dataResponse(parecerJson(await decidirRelatorio(identity, id, "APROVADO", parecer ?? null)), { status: 201 });
});
