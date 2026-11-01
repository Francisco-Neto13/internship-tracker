import { z } from "zod";

// Contracts of /api/v1/guarda-documental (RF069)
export const guardaQuerySchema = z.object({ ate: z.iso.date().optional() });
export const documentoIdParamSchema = z.object({ id: z.uuid() });
