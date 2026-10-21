import { authenticatedRoute, dataResponse, searchParamsOf } from "@/lib/api";
import type { ConcedenteValues } from "@/modules/concedentes/repositories/concedente-repository";
import { createConcedenteBodySchema, listConcedentesQuerySchema, toConcedenteValues } from "@/modules/concedentes/schemas/concedente";
import { createConcedente, listConcedentes } from "@/modules/concedentes/services/concedente-service";
import { concedenteJson } from "./json";

// RF007, RF013: catalog readable by every authenticated user (formalizing an internship needs it)
export const GET = authenticatedRoute(async ({ request, identity }) => {
  const query = listConcedentesQuerySchema.parse(searchParamsOf(request));
  const { items, total } = await listConcedentes(identity, {
    page: query.page,
    limit: query.limit,
    situacao: query.situacao,
    porteId: query.porte_id,
    setorAtuacaoId: query.setor_atuacao_id,
    busca: query.busca,
  });
  return dataResponse(items.map(concedenteJson), { meta: { total, page: query.page, limit: query.limit } });
});

// RF007: administrator or coordination; a new concedente starts ATIVA
export const POST = authenticatedRoute(async ({ request, identity }) => {
  const body = createConcedenteBodySchema.parse(await request.json());
  const criada = await createConcedente(identity, toConcedenteValues(body) as ConcedenteValues);
  return dataResponse(concedenteJson(criada), { status: 201 });
});
