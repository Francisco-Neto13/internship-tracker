import { minutosParaHoras } from "@/lib/horas";
import type { Parametros } from "@/modules/academico/domain/parametros";

// JSON shape of /api/v1/parametros (RF006): hours, snake_case
export function parametrosJson(p: Parametros & { origem?: string; id?: string; criadoEm?: Date }) {
  return {
    ...(p.id ? { id: p.id } : {}),
    ...(p.origem ? { origem: p.origem } : {}),
    vigencia_inicio: p.vigenciaInicio,
    limite_horas_diarias_obrigatorio: minutosParaHoras(p.limiteDiarioObrigatorioMinutos),
    limite_horas_diarias_nao_obrigatorio: minutosParaHoras(p.limiteDiarioNaoObrigatorioMinutos),
    limite_horas_semanais: minutosParaHoras(p.limiteSemanalMinutos),
    bloquear_excedente: p.bloquearExcedente,
    duracao_maxima_meses: p.duracaoMaximaMeses,
    tolerancia_divergencia_percentual: p.toleranciaDivergenciaPercentual,
    prazo_guarda_anos: p.prazoGuardaAnos,
    antecedencia_alerta_convenio_dias: p.antecedenciaAlertaConvenioDias,
    ...(p.criadoEm ? { criado_em: p.criadoEm.toISOString() } : {}),
  };
}
