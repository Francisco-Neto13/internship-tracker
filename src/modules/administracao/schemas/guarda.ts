import { dataSchema } from "@/lib/campos";
import { z } from "zod";

// Contracts of /api/v1/guarda-documental (RF069)
export const guardaQuerySchema = z.object({ ate: dataSchema.optional() });
export const documentoIdParamSchema = z.object({ id: z.uuid() });
