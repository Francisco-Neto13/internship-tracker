import { authenticatedRoute, dataResponse } from "@/lib/api";
import { enderecoIpDaRequisicao } from "@/lib/endereco-ip";
import { assinaturaBodySchema, idParamSchema } from "@/modules/estagios/schemas/estagio";
import { assinarAditivo } from "@/modules/estagios/services/aditivo-service";
import { aditivoJson, assinaturaJson } from "../../../estagios/json";

// RF020: "nova manifestação das partes"; the third signature makes it effective (efetivado true)
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { parte } = assinaturaBodySchema.parse(await request.json());
  const resultado = await assinarAditivo(identity, id, parte, enderecoIpDaRequisicao(request.headers));
  return dataResponse(
    { ...aditivoJson(resultado.aditivo), efetivado: resultado.efetivado, assinaturas: resultado.assinaturas.map(assinaturaJson) },
    { status: 201 },
  );
});
