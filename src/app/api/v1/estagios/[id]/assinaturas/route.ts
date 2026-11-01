import { authenticatedRoute, dataResponse } from "@/lib/api";
import { enderecoIpDaRequisicao } from "@/lib/endereco-ip";
import { assinaturaBodySchema, idParamSchema } from "@/modules/estagios/schemas/estagio";
import { assinarTce, listAssinaturas } from "@/modules/estagios/services/formalizacao-service";
import { assinaturaJson } from "../../json";

// RF019: every signature recorded, of the TCE and of the amendments
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  return dataResponse((await listAssinaturas(identity, id)).map(assinaturaJson));
});

// RF019, RN-28: the party signs the closed TCE in person (who, when, address, hash)
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { parte } = assinaturaBodySchema.parse(await request.json());
  return dataResponse(assinaturaJson(await assinarTce(identity, id, parte, enderecoIpDaRequisicao(request.headers))), { status: 201 });
});
