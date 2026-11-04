import { z } from "zod";

// Issue #97: one rule per field. The Zod schemas of the API and the fields on screen read the same
// values, so the screen cannot allow what the server refuses. The server stays the authority.

export const LIMITE = {
  // Concedente
  razaoSocial: 200,
  nomeFantasia: 200,
  cnpj: 18,
  areaAtuacao: 200,
  logradouro: 200,
  numeroEndereco: 20,
  complemento: 100,
  bairro: 100,
  municipio: 100,
  cep: 9,
  email: 254,
  telefone: 30,
  representante: 200,
  cargo: 100,
  motivoSuspensao: 1000,
  numeroConvenio: 50,
  // Curso, estudante, conta
  codigoCurso: 20,
  nomeCurso: 200,
  matricula: 30,
  nomeUsuario: 200,
  // Estágio
  seguradora: 200,
  numeroApolice: 100,
  condicoes: 5000,
  atividadesPrevistas: 20_000,
  compatibilidade: 10_000,
  justificativaEstagio: 2000,
  parecerPlano: 5000,
  motivoRescisao: 2000,
  descricaoAfastamento: 2000,
  // Acompanhamento
  observacaoFrequencia: 1000,
  motivoCancelamento: 1000,
  parecerHomologacao: 2000,
  conteudoRelatorio: 50_000,
  parecerRelatorio: 10_000,
  participantes: 1000,
  observacoesAcompanhamento: 10_000,
  // Atividades complementares
  descricaoAtividade: 500,
  instituicao: 300,
  motivoAtividade: 4000,
  // Filtros
  busca: 100,
  registroAuditoria: 100,
  codigoConta: 36,
} as const;

export const SENHA_MINIMO = 15;
export const SENHA_MAXIMO = 128;

/** Hours of a course: above this, it is a typing mistake (a whole degree has about 4000 h). */
export const HORAS_CURSO_MAXIMO = 20_000;

export const UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"] as const;

const DATA_MINIMA = "2000-01-01";
const DATA_MAXIMA = "2100-12-31";

/** Also read by the date field, so the calendar opens inside the range. */
export const FAIXA_DATA = { min: DATA_MINIMA, max: DATA_MAXIMA };

/** A real date in a range that makes sense for internships: 0026 or 9999 are typing mistakes. */
export const dataSchema = z.iso.date().refine((data) => data >= DATA_MINIMA && data <= DATA_MAXIMA, {
  message: "Informe uma data entre 2000 e 2100",
});

export const cepSchema = z
  .string()
  .trim()
  .regex(/^\d{5}-?\d{3}$/, "CEP com 8 dígitos")
  .transform((valor) => valor.replace("-", ""));

export const telefoneSchema = z
  .string()
  .trim()
  .max(LIMITE.telefone)
  .regex(/^[0-9()+\-\s]*$/, "Telefone só com números")
  .nullish()
  .transform((valor) => valor || null);
