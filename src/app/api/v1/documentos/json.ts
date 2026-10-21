import type { DocumentoRow } from "@/shared/documentos/documento-repository";

// JSON shape of /api/v1/documentos. The object key is never exposed: access goes through
// the signed URL issued after the permission check.
export function documentoJson(row: DocumentoRow, url?: string | null) {
  return {
    id: row.id,
    tipo: row.tipo,
    nome_original: row.nomeOriginal,
    tipo_mime: row.tipoMime,
    tamanho_bytes: row.tamanhoBytes,
    sha256: row.sha256,
    sensivel: row.sensivel,
    concedente_id: row.concedenteId,
    estagio_id: row.estagioId,
    estudante_id: row.estudanteId,
    enviado_por_usuario_id: row.enviadoPorUsuarioId,
    criado_em: row.criadoEm.toISOString(),
    ...(url !== undefined ? { url_download: url } : {}),
  };
}
