import { authenticatedRoute, dataResponse, searchParamsOf } from "@/lib/api";
import { createCursoBodySchema, listCursosQuerySchema } from "@/modules/academico/schemas/curso";
import { createCurso, listCursos } from "@/modules/academico/services/curso-service";

type CursoResult = {
  id: string;
  codigo: string;
  nome: string;
  cargaMinimaEstagioMinutos: number;
  cargaAtividadesComplementaresMinutos: number;
};

function toJson(row: CursoResult) {
  return {
    id: row.id,
    codigo: row.codigo,
    nome: row.nome,
    carga_minima_estagio_horas: row.cargaMinimaEstagioMinutos / 60,
    carga_atividades_complementares_horas: row.cargaAtividadesComplementaresMinutos / 60,
  };
}

// RF004: the catalog is readable by any authenticated user; only the administrator maintains it
export const GET = authenticatedRoute(async ({ request, identity }) => {
  const query = listCursosQuerySchema.parse(searchParamsOf(request));
  const { items, total } = await listCursos(identity, { page: query.page, limit: query.limit });
  return dataResponse(items.map(toJson), { meta: { total, page: query.page, limit: query.limit } });
});

export const POST = authenticatedRoute(async ({ request, identity }) => {
  const body = createCursoBodySchema.parse(await request.json());
  const created = await createCurso(identity, {
    codigo: body.codigo,
    nome: body.nome,
    cargaMinimaEstagioMinutos: body.carga_minima_estagio_horas * 60,
    cargaAtividadesComplementaresMinutos: body.carga_atividades_complementares_horas * 60,
  });
  return dataResponse(toJson(created), { status: 201 });
});
