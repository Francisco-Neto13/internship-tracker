import { authenticatedRoute, dataResponse } from "@/lib/api";
import { idParamSchema, toDadosTce, updateTceBodySchema } from "@/modules/estagios/schemas/estagio";
import { getEstagioDetalhado, updateTce } from "@/modules/estagios/services/estagio-service";
import { aditivoJson, apoliceJson, assinaturaJson, estagioJson, planoJson, responsavelJson } from "../json";

// RF015, RF021: TCE in force, plans, responsible people, insurance, signatures, amendments and
// the formalization steps derived from them (D9)
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const detalhe = await getEstagioDetalhado(identity, id);
  return dataResponse({
    ...estagioJson(detalhe.estagio),
    etapas_formalizacao: {
      tce: detalhe.etapas.tce,
      partes_assinadas: detalhe.etapas.partesAssinadas,
      partes_pendentes: detalhe.etapas.partesPendentes,
    },
    planos: detalhe.planos.map(planoJson),
    responsaveis: detalhe.responsaveis.map(responsavelJson),
    apolices: detalhe.apolices.map(apoliceJson),
    assinaturas: detalhe.assinaturas.map(assinaturaJson),
    aditivos: detalhe.aditivos.map(aditivoJson),
  });
});

// RF015: only while the TCE is in edition; closed, reopen it; active, use an amendment
export const PATCH = authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
  const { id } = idParamSchema.parse(params);
  const body = updateTceBodySchema.parse(await request.json());
  return dataResponse(estagioJson(await updateTce(identity, id, toDadosTce(body))));
});
