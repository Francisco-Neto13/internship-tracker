import { authenticatedRoute, dataResponse, searchParamsOf } from "@/lib/api";
import { createEstagioBodySchema, listEstagiosQuerySchema, toNovoEstagio } from "@/modules/estagios/schemas/estagio";
import { createEstagio, listEstagios } from "@/modules/estagios/services/estagio-service";
import { estagioJson } from "./json";

// RF015, RF044, RN-37: internships the caller may read (student, responsible people,
// coordination of the course, concedente; administrator for the reports)
export const GET = authenticatedRoute(async ({ request, identity }) => {
  const query = listEstagiosQuerySchema.parse(searchParamsOf(request));
  const { items, total } = await listEstagios(identity, {
    page: query.page,
    limit: query.limit,
    situacao: query.situacao,
    tipo: query.tipo,
    cursoId: query.curso_id,
    concedenteId: query.concedente_id,
    estudanteId: query.estudante_id,
  });
  return dataResponse(items.map(estagioJson), { meta: { total, page: query.page, limit: query.limit } });
});

// RF015: creates the internship in EM_FORMALIZACAO with the TCE in edition (coordination of
// the course, or the student for itself)
export const POST = authenticatedRoute(async ({ request, identity }) => {
  const body = createEstagioBodySchema.parse(await request.json());
  return dataResponse(estagioJson(await createEstagio(identity, toNovoEstagio(body))), { status: 201 });
});
