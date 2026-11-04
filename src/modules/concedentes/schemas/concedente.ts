import { cepSchema, LIMITE, telefoneSchema, UFS } from "@/lib/campos";
import { z } from "zod";

// Contracts of /api/v1/concedentes, /portes-concedente and /setores-atuacao (RF007, RF008,
// RF013). JSON snake_case; services receive camelCase.

const texto = (max: number) => z.string().trim().min(1).max(max);
const opcional = (max: number) => z.string().trim().max(max).nullish().transform((valor) => valor || null);

const campos = {
  razao_social: texto(LIMITE.razaoSocial),
  nome_fantasia: opcional(LIMITE.nomeFantasia),
  cnpj: z.string().trim().min(14).max(LIMITE.cnpj),
  logradouro: texto(LIMITE.logradouro),
  numero_endereco: texto(LIMITE.numeroEndereco),
  complemento: opcional(LIMITE.complemento),
  bairro: texto(LIMITE.bairro),
  municipio: texto(LIMITE.municipio),
  uf: z.string().trim().toUpperCase().pipe(z.enum(UFS, "Escolha uma UF válida")),
  cep: cepSchema,
  email_contato: z.email().trim().toLowerCase().max(LIMITE.email),
  telefone_contato: telefoneSchema,
  representante_legal_nome: texto(LIMITE.representante),
  representante_legal_cargo: opcional(LIMITE.cargo),
  area_atuacao: texto(LIMITE.areaAtuacao),
  porte_id: z.uuid().nullish().transform((valor) => valor ?? null),
  setor_atuacao_id: z.uuid().nullish().transform((valor) => valor ?? null),
};

export const createConcedenteBodySchema = z.object(campos);

export const updateConcedenteBodySchema = z
  .object(Object.fromEntries(Object.entries(campos).map(([chave, schema]) => [chave, schema.optional()])) as {
    [K in keyof typeof campos]: z.ZodOptional<(typeof campos)[K]>;
  })
  .refine((body) => Object.values(body).some((valor) => valor !== undefined), { message: "Informe ao menos um campo para alterar" });

type CamposBody = Partial<z.infer<typeof createConcedenteBodySchema>>;

export function toConcedenteValues<T extends CamposBody>(body: T) {
  const map = {
    razaoSocial: body.razao_social,
    nomeFantasia: body.nome_fantasia,
    cnpj: body.cnpj,
    logradouro: body.logradouro,
    numeroEndereco: body.numero_endereco,
    complemento: body.complemento,
    bairro: body.bairro,
    municipio: body.municipio,
    uf: body.uf,
    cep: body.cep,
    emailContato: body.email_contato,
    telefoneContato: body.telefone_contato,
    representanteLegalNome: body.representante_legal_nome,
    representanteLegalCargo: body.representante_legal_cargo,
    areaAtuacao: body.area_atuacao,
    porteId: body.porte_id,
    setorAtuacaoId: body.setor_atuacao_id,
  };
  return Object.fromEntries(Object.entries(map).filter(([, valor]) => valor !== undefined)) as {
    [K in keyof typeof map]?: Exclude<(typeof map)[K], undefined>;
  };
}

export const listConcedentesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  situacao: z.enum(["ATIVA", "SUSPENSA"]).optional(),
  porte_id: z.uuid().optional(),
  setor_atuacao_id: z.uuid().optional(),
  busca: z.string().trim().min(1).max(LIMITE.busca).optional(),
});

export const suspensaoBodySchema = z.object({ motivo: texto(LIMITE.motivoSuspensao) });

export const classificacaoBodySchema = z.object({ nome: texto(100) });

export const updateClassificacaoBodySchema = z
  .object({ nome: texto(100).optional(), ativo: z.boolean().optional() })
  .refine((body) => body.nome !== undefined || body.ativo !== undefined, { message: "Informe ao menos um campo para alterar" });

export const incluirInativosQuerySchema = z.object({
  incluir_inativos: z.enum(["true", "false"]).default("false").transform((valor) => valor === "true"),
});

export const idParamSchema = z.object({ id: z.uuid() });
