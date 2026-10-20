import { authenticatedRoute, dataResponse, searchParamsOf } from "@/lib/api";
import { createEstudanteBodySchema, listEstudantesQuerySchema } from "@/modules/academico/schemas/estudante";
import { createEstudante, listEstudantes } from "@/modules/academico/services/estudante-service";
import { estudanteJson } from "./json";

// RF005: the list already comes filtered by RLS for the caller's profile and links
export const GET = authenticatedRoute(async ({ request, identity }) => {
  const query = listEstudantesQuerySchema.parse(searchParamsOf(request));
  const { items, total } = await listEstudantes(identity, {
    page: query.page,
    limit: query.limit,
    cursoId: query.curso_id,
    situacao: query.situacao,
    busca: query.busca,
  });
  return dataResponse(items.map(estudanteJson), { meta: { total, page: query.page, limit: query.limit } });
});

export const POST = authenticatedRoute(async ({ request, identity }) => {
  const body = createEstudanteBodySchema.parse(await request.json());
  const created = await createEstudante(identity, {
    usuarioId: body.usuario_id,
    cursoId: body.curso_id,
    matricula: body.matricula,
    periodo: body.periodo,
  });
  return dataResponse(estudanteJson(created), { status: 201 });
});
