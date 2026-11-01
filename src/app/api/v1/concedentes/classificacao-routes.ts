import { authenticatedRoute, dataResponse, searchParamsOf } from "@/lib/api";
import type { Catalogo, ClassificacaoRow } from "@/modules/concedentes/repositories/concedente-repository";
import {
  classificacaoBodySchema,
  idParamSchema,
  incluirInativosQuerySchema,
  updateClassificacaoBodySchema,
} from "@/modules/concedentes/schemas/concedente";
import { createClassificacao, listClassificacoes, updateClassificacaoDados } from "@/modules/concedentes/services/concedente-service";

// RF013: /portes-concedente and /setores-atuacao share the same contract

function classificacaoJson(row: ClassificacaoRow) {
  return { id: row.id, nome: row.nome, ativo: row.ativo };
}

export function rotasColecao(catalogo: Catalogo) {
  return {
    GET: authenticatedRoute(async ({ request, identity }) => {
      const { incluir_inativos } = incluirInativosQuerySchema.parse(searchParamsOf(request));
      return dataResponse((await listClassificacoes(identity, catalogo, incluir_inativos)).map(classificacaoJson));
    }),
    POST: authenticatedRoute(async ({ request, identity }) => {
      const { nome } = classificacaoBodySchema.parse(await request.json());
      return dataResponse(classificacaoJson(await createClassificacao(identity, catalogo, nome)), { status: 201 });
    }),
  };
}

export function rotasItem(catalogo: Catalogo) {
  return {
    PATCH: authenticatedRoute<{ id: string }>(async ({ request, identity, params }) => {
      const { id } = idParamSchema.parse(params);
      const body = updateClassificacaoBodySchema.parse(await request.json());
      return dataResponse(classificacaoJson(await updateClassificacaoDados(identity, catalogo, id, body)));
    }),
  };
}
