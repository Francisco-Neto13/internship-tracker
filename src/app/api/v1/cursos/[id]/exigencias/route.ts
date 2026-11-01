import { authenticatedRoute, dataResponse } from "@/lib/api";
import { horasParaMinutos, minutosParaHoras } from "@/lib/horas";
import { definirExigenciasBodySchema, uuidParamSchema } from "@/modules/academico/schemas/parametros";
import { definirExigencias, getExigenciasCurso } from "@/modules/academico/services/categoria-service";

type Exigencias = Awaited<ReturnType<typeof getExigenciasCurso>>;

function exigenciasJson({ curso, categorias }: Exigencias) {
  return {
    curso_id: curso.id,
    carga_minima_estagio_horas: minutosParaHoras(curso.cargaMinimaEstagioMinutos),
    carga_atividades_complementares_horas: minutosParaHoras(curso.cargaAtividadesComplementaresMinutos),
    categorias: categorias.map((item) => ({
      categoria_id: item.categoriaId,
      categoria: item.categoriaNome,
      limite_horas: minutosParaHoras(item.limiteMinutos),
      admite_estagio_nao_obrigatorio: item.admiteEstagioNaoObrigatorio,
    })),
  };
}

// RF004, RN-34: minimum internship, total of complementary hours and limit per category
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = uuidParamSchema.parse(params);
  return dataResponse(exigenciasJson(await getExigenciasCurso(identity, id)));
});

// RF004: sets the listed categories; the others keep their limit (rows are never deleted)
export const PUT = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = uuidParamSchema.parse(params);
  const body = definirExigenciasBodySchema.parse(await request.json());
  const resultado = await definirExigencias(
    identity,
    id,
    body.exigencias.map((item) => ({
      categoriaId: item.categoria_id,
      limiteMinutos: horasParaMinutos(item.limite_horas),
      admiteEstagioNaoObrigatorio: item.admite_estagio_nao_obrigatorio,
    })),
  );
  return dataResponse(exigenciasJson(resultado));
});
