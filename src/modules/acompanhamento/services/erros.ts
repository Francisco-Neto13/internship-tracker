import { isForeignKeyViolation, isRlsViolation, isTriggerRule, isUniqueViolation } from "@/db/errors";
import { DomainError, type DomainErrorKind } from "@/lib/errors";

// Database rules of M05 (triggers and unique indexes) translated into stable domain codes.
// The services check most of them first for a clear message; these are the barriers when a
// race or a direct path reaches the database.

type Regra = { codigo: string; kind: DomainErrorKind; mensagem: string; requisito: string };

const REGRAS_DE_GATILHO: Regra[] = [
  { codigo: "ESTAGIO_NAO_ATIVO", kind: "CONFLICT", mensagem: "Só estágio ativo recebe esta operação.", requisito: "RF023" },
  { codigo: "DATA_FORA_DO_ESTAGIO", kind: "UNPROCESSABLE", mensagem: "A data está fora do período do estágio.", requisito: "RF023" },
  { codigo: "DATA_FUTURA", kind: "UNPROCESSABLE", mensagem: "Não se registra nem homologa dia que ainda não aconteceu.", requisito: "RF023" },
  { codigo: "DIA_EM_AFASTAMENTO", kind: "UNPROCESSABLE", mensagem: "O dia está dentro de um afastamento registrado.", requisito: "RF030" },
  { codigo: "REGISTRO_DE_TERCEIRO", kind: "FORBIDDEN", mensagem: "O lançamento é registrado em nome de quem o faz.", requisito: "RN-28" },
  { codigo: "LANCAMENTO_RESTRITO_AO_ESTUDANTE", kind: "FORBIDDEN", mensagem: "Só o estudante registra a própria frequência.", requisito: "RF023" },
  { codigo: "AJUSTE_INVALIDO", kind: "UNPROCESSABLE", mensagem: "O ajuste corrige um lançamento do mesmo dia.", requisito: "RF029" },
  { codigo: "AJUSTE_SEM_SUBSTITUTO", kind: "UNPROCESSABLE", mensagem: "O lançamento substituído precisa do lançamento que o corrige.", requisito: "RF029" },
  { codigo: "AJUSTE_RESTRITO", kind: "FORBIDDEN", mensagem: "Só o estudante ou a coordenação corrigem o lançamento.", requisito: "RF029" },
  { codigo: "LANCAMENTO_HOMOLOGADO", kind: "CONFLICT", mensagem: "Lançamento homologado só é corrigido pela coordenação, por substituição.", requisito: "RF029" },
  { codigo: "TRANSICAO_FREQUENCIA_INVALIDA", kind: "CONFLICT", mensagem: "A situação do lançamento não permite esta operação.", requisito: "RF029" },
  { codigo: "LIMITE_JORNADA_EXCEDIDO", kind: "UNPROCESSABLE", mensagem: "O lançamento passa do limite diário ou semanal de jornada.", requisito: "RF024" },
  { codigo: "HOMOLOGACAO_INVALIDA", kind: "UNPROCESSABLE", mensagem: "A homologação não cobre o lançamento.", requisito: "RF027" },
  { codigo: "HOMOLOGACAO_RESTRITA_AO_SUPERVISOR", kind: "FORBIDDEN", mensagem: "Só o supervisor do estágio homologa a frequência.", requisito: "RF027" },
  { codigo: "HOMOLOGACAO_INCONSISTENTE", kind: "CONFLICT", mensagem: "O total homologado não confere com os lançamentos marcados.", requisito: "RF027" },
  { codigo: "DIVERGENCIA_JA_ANALISADA", kind: "CONFLICT", mensagem: "A divergência já foi analisada.", requisito: "RF028" },
  { codigo: "ANALISE_RESTRITA_AO_ORIENTADOR", kind: "FORBIDDEN", mensagem: "Só o professor orientador analisa a divergência.", requisito: "RF028" },
  { codigo: "REGISTRO_IMUTAVEL", kind: "CONFLICT", mensagem: "O registro não pode ser alterado.", requisito: "RN-28" },
];

const UNICOS: Record<string, Omit<Regra, "kind">> = {
  frequencia_um_vigente_por_dia: { codigo: "FREQUENCIA_DUPLICADA", mensagem: "Já existe lançamento para este dia; corrija-o por ajuste.", requisito: "RF023" },
  registro_frequencia_substitui_registro_id_unique: { codigo: "LANCAMENTO_JA_AJUSTADO", mensagem: "Este lançamento já foi substituído.", requisito: "RF029" },
};

/** Adds rules of other M05 aggregates (relatórios, avaliação) without repeating the plumbing. */
export function tradutorDeErros(regrasExtras: Regra[] = [], unicosExtras: Record<string, Omit<Regra, "kind">> = {}) {
  const regras = [...REGRAS_DE_GATILHO, ...regrasExtras];
  const unicos = { ...UNICOS, ...unicosExtras };
  return (error: unknown, acao: string): unknown => {
    if (error instanceof DomainError) return error;
    if (isRlsViolation(error)) {
      return new DomainError({ code: "ACESSO_NEGADO", kind: "FORBIDDEN", message: `O perfil atual não permite ${acao}.`, requisito: "RF003" });
    }
    for (const regra of regras) {
      if (isTriggerRule(error, regra.codigo)) {
        return new DomainError({ code: regra.codigo, kind: regra.kind, message: regra.mensagem, requisito: regra.requisito });
      }
    }
    for (const [constraint, regra] of Object.entries(unicos)) {
      if (isUniqueViolation(error, constraint)) {
        return new DomainError({ code: regra.codigo, kind: "CONFLICT", message: regra.mensagem, requisito: regra.requisito });
      }
    }
    if (isForeignKeyViolation(error, "registro_frequencia_estagio_id_estagio_id_fk")) return estagioNaoEncontrado();
    return error;
  };
}

export const traduzirErroFrequencia = tradutorDeErros();

export const estagioNaoEncontrado = () =>
  new DomainError({ code: "ESTAGIO_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Estágio não encontrado.", requisito: "RF015" });

export const acessoNegado = (acao: string) =>
  new DomainError({ code: "ACESSO_NEGADO", kind: "FORBIDDEN", message: `O perfil atual não permite ${acao}.`, requisito: "RF003" });

export type { Regra };
