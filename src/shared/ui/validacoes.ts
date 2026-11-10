import { z } from "zod";
import { LIMITE } from "@/lib/campos";
import { updateCursoBodySchema } from "@/modules/academico/schemas/curso";
import { definirExigenciasBodySchema, definirParametrosBodySchema } from "@/modules/academico/schemas/parametros";
import { acompanhamentoBodySchema, criterioBodySchema } from "@/modules/acompanhamento/schemas/avaliacao";
import { frequenciaBodySchema, homologacaoBodySchema } from "@/modules/acompanhamento/schemas/frequencia";
import { envioRelatorioBodySchema } from "@/modules/acompanhamento/schemas/relatorio";
import { cnpjValido } from "@/modules/concedentes/domain/cnpj";
import { createConcedenteBodySchema, updateConcedenteBodySchema } from "@/modules/concedentes/schemas/concedente";
import { aditivoBodySchema, apoliceBodySchema, planoBodySchema, rescisaoBodySchema } from "@/modules/estagios/schemas/estagio";

// Rules a form checks while it is filled in (issue #97). A page on the server names one, because a
// schema cannot cross to the browser as a prop. Each is the schema of the route the form sends to.
// The ones written here are the schemas that read @/db/schema, which must not reach the browser.
export const VALIDACOES = {
  // The API checks the digits in the service; here the person hears it on leaving the field
  concedenteNovo: createConcedenteBodySchema.extend({ cnpj: z.string().trim().refine(cnpjValido, "CNPJ inválido") }),
  concedenteEdicao: updateConcedenteBodySchema,
  cursoEdicao: updateCursoBodySchema,
  exigenciaCurso: definirExigenciasBodySchema,
  estudanteEdicao: z.object({ matricula: z.string().trim().min(1).max(LIMITE.matricula), periodo: z.number().int().min(1).max(20) }),
  parametros: definirParametrosBodySchema,
  frequencia: frequenciaBodySchema,
  homologacao: homologacaoBodySchema,
  relatorio: envioRelatorioBodySchema,
  acompanhamento: acompanhamentoBodySchema,
  criterio: criterioBodySchema,
  apolice: apoliceBodySchema,
  plano: planoBodySchema,
  rescisao: rescisaoBodySchema,
  aditivo: aditivoBodySchema,
  usuario: z.object({ nome: z.string().trim().min(1).max(LIMITE.nomeUsuario), email: z.email().trim().toLowerCase().max(LIMITE.email) }),
} satisfies Record<string, z.ZodType>;

export type NomeValidacao = keyof typeof VALIDACOES;
