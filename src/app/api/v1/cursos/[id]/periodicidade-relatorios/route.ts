import { authenticatedRoute, dataResponse } from "@/lib/api";
import { definirPeriodicidadesBodySchema, uuidParamSchema } from "@/modules/academico/schemas/parametros";
import { definirPeriodicidades, getPeriodicidades, type PeriodicidadeCurso } from "@/modules/academico/services/periodicidade-service";

function periodicidadeJson(item: PeriodicidadeCurso) {
  return {
    tipo_estagio: item.tipoEstagio,
    intervalo_meses: item.intervaloMeses,
    prazo_entrega_dias: item.prazoEntregaDias,
    prazo_relatorio_final_dias: item.prazoRelatorioFinalDias,
    origem: item.origem,
  };
}

// RF036: periodicity and deadlines by internship type (the default when the course set none)
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = uuidParamSchema.parse(params);
  return dataResponse((await getPeriodicidades(identity, id)).map(periodicidadeJson));
});

// RF036: administrator or coordination of the course; reports already generated keep their deadlines
export const PUT = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = uuidParamSchema.parse(params);
  const { periodicidades } = definirPeriodicidadesBodySchema.parse(await request.json());
  const resultado = await definirPeriodicidades(
    identity,
    id,
    periodicidades.map((item) => ({
      tipoEstagio: item.tipo_estagio,
      intervaloMeses: item.intervalo_meses,
      prazoEntregaDias: item.prazo_entrega_dias,
      prazoRelatorioFinalDias: item.prazo_relatorio_final_dias,
    })),
  );
  return dataResponse(resultado.map(periodicidadeJson));
});
