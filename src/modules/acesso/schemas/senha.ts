import { SENHA_MAXIMO, SENHA_MINIMO } from "@/lib/campos";
import { z } from "zod";

// RF002: contract of POST /api/v1/auth/senha. Bounds match src/lib/auth.ts (NIST SP
// 800-63B-4, 3.1.1.2: at least 15 characters, at least 64 accepted; any character allowed).
export { SENHA_MAXIMO, SENHA_MINIMO };

export const trocarSenhaBodySchema = z
  .object({
    senha_atual: z.string().min(1).max(SENHA_MAXIMO),
    nova_senha: z
      .string()
      .min(SENHA_MINIMO, `A nova senha precisa ter ao menos ${SENHA_MINIMO} caracteres`)
      .max(SENHA_MAXIMO, `A nova senha pode ter no máximo ${SENHA_MAXIMO} caracteres`),
  })
  .refine((body) => body.nova_senha !== body.senha_atual, {
    path: ["nova_senha"],
    message: "A nova senha precisa ser diferente da atual",
  });
