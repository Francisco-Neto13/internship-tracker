import { createHash } from "node:crypto";
import { DomainError, type DomainErrorDetail } from "@/lib/errors";

// RF015, RF044, RN-32, Lei 11.788/2008. Pure rules about the TCE content; the service loads
// the facts (parameters, other internships) and the database enforces them again.

export type TipoEstagio = "OBRIGATORIO" | "NAO_OBRIGATORIO";

export type DadosTce = {
  estudanteId: string;
  cursoId: string;
  concedenteId: string;
  convenioId: string;
  tipo: TipoEstagio;
  dataInicio: string;
  dataFimPactuada: string;
  cargaDiariaMinutos: number;
  cargaSemanalMinutos: number;
  cargaTotalMinutos: number;
  condicoesPactuadas: string;
  bolsaValor: string | null;
  auxilioTransporteValor: string | null;
  seguroExigido: boolean;
  dispensaDuracaoMaxima: boolean;
};

/**
 * RNF-08, RF019: SHA-256 of the canonical TCE content (sorted keys, fixed number format),
 * frozen when the TCE is closed for signature (D9). The same content always gives the same
 * hash, so a signature proves which content was signed.
 */
export function hashTce(dados: DadosTce): string {
  const canonico = Object.fromEntries(
    Object.entries({
      ...dados,
      bolsaValor: dados.bolsaValor === null ? null : Number(dados.bolsaValor).toFixed(2),
      auxilioTransporteValor: dados.auxilioTransporteValor === null ? null : Number(dados.auxilioTransporteValor).toFixed(2),
    }).sort(([a], [b]) => a.localeCompare(b)),
  );
  return createHash("sha256").update(JSON.stringify(canonico)).digest("hex");
}

/** Lei 11.788/2008, art. 11 (DER §5.4): last day allowed at the same concedente. */
export function limiteDuracaoMaxima(dataInicio: string, duracaoMaximaMeses: number, diasUsadosNoPar: number): string {
  const limite = new Date(`${dataInicio}T00:00:00Z`);
  limite.setUTCMonth(limite.getUTCMonth() + duracaoMaximaMeses);
  limite.setUTCDate(limite.getUTCDate() - 1 - diasUsadosNoPar);
  return limite.toISOString().slice(0, 10);
}

/**
 * Validates the TCE against the law and the parameters in force on its start date:
 * - RN-32, art. 12: grant and transport aid compulsory in the non-mandatory internship (RF044);
 * - art. 10 (RF024 at the TCE): daily and weekly workload within the institutional limits;
 * - art. 11 (RF062): end within the maximum duration at the same concedente, unless exempt (D5).
 * Reports every problem at once.
 */
export function validarTce(
  dados: Pick<
    DadosTce,
    "tipo" | "dataInicio" | "dataFimPactuada" | "cargaDiariaMinutos" | "cargaSemanalMinutos" | "cargaTotalMinutos" | "bolsaValor" | "auxilioTransporteValor" | "dispensaDuracaoMaxima"
  >,
  limites: { limiteDiarioMinutos: number; limiteSemanalMinutos: number; duracaoMaximaMeses: number; diasUsadosNoPar: number },
): void {
  const detalhes: DomainErrorDetail[] = [];

  if (dados.dataFimPactuada <= dados.dataInicio) {
    detalhes.push({ code: "PERIODO_INVALIDO", field: "data_fim_pactuada", issue: "O término precisa ser posterior ao início", requisito: "RN-32" });
  }
  if (dados.tipo === "NAO_OBRIGATORIO") {
    if (!(Number(dados.bolsaValor) > 0)) {
      detalhes.push({ code: "BOLSA_OBRIGATORIA", field: "bolsa_valor", issue: "Estágio não obrigatório exige bolsa (Lei 11.788/2008, art. 12)", requisito: "RF044" });
    }
    if (!(Number(dados.auxilioTransporteValor) > 0)) {
      detalhes.push({
        code: "AUXILIO_TRANSPORTE_OBRIGATORIO",
        field: "auxilio_transporte_valor",
        issue: "Estágio não obrigatório exige auxílio-transporte (Lei 11.788/2008, art. 12)",
        requisito: "RF044",
      });
    }
  }
  if (dados.cargaDiariaMinutos > limites.limiteDiarioMinutos) {
    detalhes.push({
      code: "LIMITE_JORNADA_EXCEDIDO",
      field: "carga_horas_diaria",
      issue: `A jornada diária passa do limite de ${limites.limiteDiarioMinutos / 60} h (Lei 11.788/2008, art. 10)`,
      requisito: "RF024",
    });
  }
  if (dados.cargaSemanalMinutos > limites.limiteSemanalMinutos) {
    detalhes.push({
      code: "LIMITE_JORNADA_EXCEDIDO",
      field: "carga_horas_semanal",
      issue: `A jornada semanal passa do limite de ${limites.limiteSemanalMinutos / 60} h (Lei 11.788/2008, art. 10)`,
      requisito: "RF024",
    });
  }
  if (dados.cargaDiariaMinutos > dados.cargaSemanalMinutos) {
    detalhes.push({ code: "CARGA_INCONSISTENTE", field: "carga_horas_diaria", issue: "A carga diária não pode passar da semanal", requisito: "RN-32" });
  }
  if (!dados.dispensaDuracaoMaxima) {
    const limite = limiteDuracaoMaxima(dados.dataInicio, limites.duracaoMaximaMeses, limites.diasUsadosNoPar);
    if (dados.dataFimPactuada > limite) {
      detalhes.push({
        code: "DURACAO_MAXIMA_EXCEDIDA",
        field: "data_fim_pactuada",
        issue: `Na mesma concedente o estágio pode ir até ${limite} (Lei 11.788/2008, art. 11)`,
        requisito: "RF062",
      });
    }
  }

  if (detalhes.length > 0) {
    throw new DomainError({
      code: "TCE_INVALIDO",
      kind: "UNPROCESSABLE",
      message: "O termo de compromisso não atende às regras do estágio.",
      requisito: "RF015",
      details: detalhes,
    });
  }
}
