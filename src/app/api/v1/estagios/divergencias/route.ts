import { authenticatedRoute, dataResponse } from "@/lib/api";
import { listEstagiosDivergentes } from "@/modules/acompanhamento/services/frequencia-service";
import { divergenciaCalculadaJson, estagioAcompanhadoJson } from "../../_acompanhamento/json";

// RF028: active internships the caller advises or coordinates whose hours diverge now
export const GET = authenticatedRoute(async ({ identity }) => {
  const itens = await listEstagiosDivergentes(identity);
  return dataResponse(
    itens.map((item) => ({
      estagio: estagioAcompanhadoJson(item.estagio),
      divergencia: divergenciaCalculadaJson(item.divergencia),
      divergencia_aberta_id: item.divergenciaAbertaId,
    })),
  );
});
