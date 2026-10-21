import { z } from "zod";
import { TAMANHO_MAXIMO_BYTES, TIPOS_MIME_PERMITIDOS, tipoDocumento } from "@/db/schema";

// Contracts of /api/v1/documentos (D8, RF009, RF050, RF071)

export const solicitarUploadBodySchema = z
  .object({
    tipo: z.enum(tipoDocumento.enumValues),
    tipo_mime: z.enum(TIPOS_MIME_PERMITIDOS),
    tamanho_bytes: z.number().int().min(1).max(TAMANHO_MAXIMO_BYTES),
    sha256: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[0-9a-f]{64}$/, "SHA-256 em hexadecimal"),
    nome_original: z.string().trim().min(1).max(255),
    concedente_id: z.uuid().nullish(),
    estagio_id: z.uuid().nullish(),
    estudante_id: z.uuid().nullish(),
  })
  .refine((body) => body.concedente_id || body.estagio_id || body.estudante_id, {
    message: "Informe a quem o documento pertence (concedente_id, estagio_id ou estudante_id)",
  });

export const confirmarUploadBodySchema = z.object({ upload_id: z.string().min(10).max(4096) });

export const documentoIdParamSchema = z.object({ id: z.uuid() });
