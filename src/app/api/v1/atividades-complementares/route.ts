import { authenticatedRoute, dataResponse, searchParamsOf } from "@/lib/api";
import { atividadesQuerySchema, cadastroAtividadeBodySchema } from "@/modules/atividades/schemas/atividade";
import { cadastrarAtividade, listAtividades } from "@/modules/atividades/services/atividade-service";
import { atividadeJson } from "../_atividades/json";

// RF049, RF053: activities the caller follows (the student's own; the coordination's courses)
export const GET = authenticatedRoute(async ({ request, identity }) => {
  const filtros = atividadesQuerySchema.parse(searchParamsOf(request));
  return dataResponse((await listAtividades(identity, filtros)).map(atividadeJson));
});

// RF046, RF049, RF050: the student registers with its proofs (uploaded first through
// /documentos/upload, tipo COMPROVANTE_ATIVIDADE); origem_estagio_id counts a non-mandatory
// internship under the double-count bar (RF047)
export const POST = authenticatedRoute(async ({ request, identity }) => {
  const body = cadastroAtividadeBodySchema.parse(await request.json());
  return dataResponse(atividadeJson(await cadastrarAtividade(identity, body)), { status: 201 });
});
