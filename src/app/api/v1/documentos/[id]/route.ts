import { authenticatedRoute, dataResponse, SEM_CACHE } from "@/lib/api";
import { obterDocumento } from "@/shared/documentos/documento-service";
import { documentoIdParamSchema } from "@/shared/documentos/schemas";
import { documentoJson } from "../json";

// RNF-06, RF071: metadata as RLS allows, plus a one-minute signed download URL only when
// app.pode_baixar_documento says so (url_download null otherwise: the administrator sees the
// metadata of a sensitive document, never its content)
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params }) => {
  const { id } = documentoIdParamSchema.parse(params);
  const { documento, url } = await obterDocumento(identity, id);
  return dataResponse(documentoJson(documento, url), { headers: SEM_CACHE });
});
