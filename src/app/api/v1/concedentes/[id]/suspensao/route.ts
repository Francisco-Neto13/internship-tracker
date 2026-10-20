import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema, suspensaoBodySchema } from "@/modules/concedentes/schemas/concedente";
import { alterarSituacaoConcedente } from "@/modules/concedentes/services/concedente-service";
import { concedenteJson } from "../../json";

// RF008, RN-31: blocks new internships; those in progress are preserved
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const { motivo } = suspensaoBodySchema.parse(await request.json());
  const resultado = await alterarSituacaoConcedente(identity, id, "SUSPENSA", motivo);
  return dataResponse({
    ...concedenteJson(resultado.concedente),
    estagios_em_andamento_preservados: resultado.estagiosEmAndamentoPreservados,
  });
});
