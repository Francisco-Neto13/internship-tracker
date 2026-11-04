import type { z } from "zod";

// Issue #97: the screen says what is wrong while the person fills in the form, with the same Zod
// schema the API uses. It only helps: the server checks everything again.

// Zod's own messages, which a form must not show. A message written in a schema is kept.
const PADRAO_DO_ZOD = /^(Invalid|Too |Expected|Unrecognized)/;

type Problema = z.core.$ZodIssue;

function faixa(problema: Problema & { minimum?: unknown; maximum?: unknown; origin?: unknown }): string {
  const { code, minimum, maximum, origin } = problema;
  const numero = Number(code === "too_small" ? minimum : maximum);
  if (origin === "string") {
    if (code === "too_big") return `Use no máximo ${numero.toLocaleString("pt-BR")} caracteres`;
    return numero <= 1 ? "Preencha este campo" : `Use ao menos ${numero.toLocaleString("pt-BR")} caracteres`;
  }
  if (code === "too_big") return `O valor máximo é ${numero.toLocaleString("pt-BR")}`;
  return numero < 1 ? "Informe um valor maior que zero" : `O valor mínimo é ${numero.toLocaleString("pt-BR")}`;
}

/** What a person reads for one problem of a schema. */
export function mensagemDoProblema(problema: Problema): string {
  if (problema.message && !PADRAO_DO_ZOD.test(problema.message)) return problema.message;
  switch (problema.code) {
    case "too_small":
    case "too_big":
      return faixa(problema);
    case "invalid_type":
      return "Preencha este campo";
    case "invalid_format": {
      const formato = (problema as { format?: string }).format;
      if (formato === "email") return "Informe um e-mail válido";
      if (formato === "date") return "Informe uma data válida";
      return "Formato inválido";
    }
    case "invalid_value":
    case "invalid_union":
      return "Escolha uma opção válida";
    default:
      return "Valor inválido";
  }
}

/** Problems by field: the name is the last text in the path, the first problem of each one wins. */
export function errosPorCampo(schema: z.ZodType, corpo: unknown): Record<string, string> {
  const resultado = schema.safeParse(corpo);
  if (resultado.success) return {};
  const erros: Record<string, string> = {};
  for (const problema of resultado.error.issues) {
    const campo = [...problema.path].reverse().find((parte) => typeof parte === "string") as string | undefined;
    if (campo && !erros[campo]) erros[campo] = mensagemDoProblema(problema);
  }
  return erros;
}
