import { authenticatedRoute, dataResponse, searchParamsOf } from "@/lib/api";
import { createEstudanteBodySchema, listEstudantesQuerySchema } from "@/modules/academico/schemas/estudante";
import { createEstudante, listEstudantes } from "@/modules/academico/services/estudante-service";

type EstudanteResult = {
  id: string;
  usuarioId: string;
  cursoId: string;
  nome?: string | null;
  matricula: string;
  periodo: number;
  situacaoAcademica: string;
};

function toJson(row: EstudanteResult) {
  return {
    id: row.id,
    usuario_id: row.usuarioId,
    curso_id: row.cursoId,
    nome: row.nome ?? null,
    matricula: row.matricula,
    periodo: row.periodo,
    situacao_academica: row.situacaoAcademica,
  };
}

// RF005: the list already comes filtered by RLS for the caller's profile and links
export const GET = authenticatedRoute(async ({ request, identity }) => {
  const query = listEstudantesQuerySchema.parse(searchParamsOf(request));
  const { items, total } = await listEstudantes(identity, {
    page: query.page,
    limit: query.limit,
    cursoId: query.curso_id,
  });
  return dataResponse(items.map(toJson), { meta: { total, page: query.page, limit: query.limit } });
});

export const POST = authenticatedRoute(async ({ request, identity }) => {
  const body = createEstudanteBodySchema.parse(await request.json());
  const created = await createEstudante(identity, {
    usuarioId: body.usuario_id,
    cursoId: body.curso_id,
    matricula: body.matricula,
    periodo: body.periodo,
  });
  return dataResponse(toJson(created), { status: 201 });
});
