import { z } from "zod";

// Contracts of /api/v1/estudantes/{id}/declaracoes and /declaracoes/verificacao (RF058)
export const declaracaoBodySchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("CONCLUSAO_ESTAGIO"), estagio_id: z.uuid() }),
  z.object({ tipo: z.literal("INTEGRALIZACAO_ATIVIDADES") }),
]);

export const codigoVerificacaoParamSchema = z.object({ codigo: z.string().trim().toUpperCase().regex(/^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$/) });
