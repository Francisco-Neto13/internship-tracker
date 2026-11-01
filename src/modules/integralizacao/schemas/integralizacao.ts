import { z } from "zod";

// Contracts of /api/v1/estudantes/{id}/integralizacao (RF056, RF057)
export const estudanteIdParamSchema = z.object({ id: z.uuid() });
