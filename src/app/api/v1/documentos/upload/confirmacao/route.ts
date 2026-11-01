import { authenticatedRoute, dataResponse } from "@/lib/api";
import { confirmarUpload } from "@/shared/documentos/documento-service";
import { confirmarUploadBodySchema } from "@/shared/documentos/schemas";
import { documentoJson } from "../../json";

// D8: step 2 of 2. The server checks the stored object (size, type by its bytes, SHA-256)
// and only then records the document; a divergent file is removed (422 UPLOAD_DIVERGENTE)
export const POST = authenticatedRoute(async ({ request, identity }) => {
  const { upload_id } = confirmarUploadBodySchema.parse(await request.json());
  return dataResponse(documentoJson(await confirmarUpload(identity, upload_id)), { status: 201 });
});
