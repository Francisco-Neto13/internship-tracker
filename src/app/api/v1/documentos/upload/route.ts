import { authenticatedRoute, dataResponse, SEM_CACHE } from "@/lib/api";
import { solicitarUpload } from "@/shared/documentos/documento-service";
import { solicitarUploadBodySchema } from "@/shared/documentos/schemas";

// D8: step 1 of 2. Checks type, size and permission, then signs a PUT URL to the private
// bucket (5 minutes). The browser sends the file there directly, with the returned headers.
export const POST = authenticatedRoute(async ({ request, identity }) => {
  const body = solicitarUploadBodySchema.parse(await request.json());
  const pedido = await solicitarUpload(identity, {
    tipo: body.tipo,
    tipoMime: body.tipo_mime,
    tamanhoBytes: body.tamanho_bytes,
    sha256: body.sha256,
    nomeOriginal: body.nome_original,
    concedenteId: body.concedente_id ?? null,
    estagioId: body.estagio_id ?? null,
    estudanteId: body.estudante_id ?? null,
  });
  return dataResponse(
    { upload_id: pedido.uploadId, url: pedido.url, metodo: "PUT", cabecalhos: pedido.cabecalhos, expira_em: pedido.expiraEm.toISOString() },
    { status: 201, headers: SEM_CACHE },
  );
});
