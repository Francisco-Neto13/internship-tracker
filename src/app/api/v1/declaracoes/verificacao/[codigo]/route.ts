import { verificarDeclaracao } from "@/db/rotinas";
import { errorResponse } from "@/lib/api";
import { codigoVerificacaoParamSchema } from "@/modules/integralizacao/schemas/declaracao";

// RF058: authenticity of a declaration for whoever holds the PDF, without login. Answers only
// what the document shows and its SHA-256; an unknown or malformed code is a plain 404.
export async function GET(_request: Request, { params }: { params: Promise<{ codigo: string }> }): Promise<Response> {
  const parsed = codigoVerificacaoParamSchema.safeParse(await params);
  const encontrada = parsed.success ? await verificarDeclaracao(parsed.data.codigo) : null;
  if (!encontrada) return errorResponse(404, { code: "DECLARACAO_NAO_ENCONTRADA", message: "Nenhuma declaração com este código." });
  return Response.json({ data: encontrada }, { headers: { "Cache-Control": "no-store" } });
}
