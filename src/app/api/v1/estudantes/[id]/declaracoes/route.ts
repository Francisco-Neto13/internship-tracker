import { authenticatedRoute, dataResponse } from "@/lib/api";
import { declaracaoBodySchema } from "@/modules/integralizacao/schemas/declaracao";
import { emitirDeclaracao, listDeclaracoes } from "@/modules/integralizacao/services/declaracao-service";
import { z } from "zod";
import { declaracaoJson } from "../../../_integralizacao/declaracao-json";

const params = z.object({ id: z.uuid() });

// RF058: declarations of the student; the PDF downloads through /documentos/{documento_id}
export const GET = authenticatedRoute<{ id: string }>(async ({ identity, params: bruto }) => {
  const { id } = params.parse(bruto);
  return dataResponse((await listDeclaracoes(identity, id)).map(declaracaoJson));
});

// The student or its coordination issues one when the fact is true (RN-17, RN-35)
export const POST = authenticatedRoute<{ id: string }>(async ({ request, identity, params: bruto }) => {
  const { id } = params.parse(bruto);
  const body = declaracaoBodySchema.parse(await request.json());
  const emitida = await emitirDeclaracao(identity, id, { tipo: body.tipo, estagioId: body.tipo === "CONCLUSAO_ESTAGIO" ? body.estagio_id : null });
  return dataResponse(declaracaoJson(emitida), { status: 201 });
});
