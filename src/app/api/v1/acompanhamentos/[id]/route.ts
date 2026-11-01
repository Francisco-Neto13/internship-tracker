import { authenticatedRoute, dataResponse } from "@/lib/api";
import { alterarAcompanhamentoBodySchema } from "@/modules/acompanhamento/schemas/avaliacao";
import { idParamSchema } from "@/modules/acompanhamento/schemas/frequencia";
import { alterarAcompanhamento } from "@/modules/acompanhamento/services/avaliacao-service";
import { acompanhamentoJson } from "../../_acompanhamento/json";

// RF033: the author corrects the record while the internship is active (audited)
export const PATCH = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = alterarAcompanhamentoBodySchema.parse(await request.json());
  return dataResponse(acompanhamentoJson(await alterarAcompanhamento(identity, id, body)));
});
