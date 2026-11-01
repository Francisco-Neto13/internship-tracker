import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema } from "@/modules/estagios/schemas/estagio";
import { historicoTce } from "@/modules/estagios/services/aditivo-service";

// RF021: version in force and every previous one, rebuilt from the effective amendments
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const versoes = await historicoTce(identity, id);
  return dataResponse(versoes.map((versao) => ({ vigente_desde: versao.vigenteDesde.toISOString(), origem: versao.origem, valores: versao.valores })));
});
