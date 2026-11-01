import { dataLocal } from "@/modules/academico/domain/parametros";
import type { ConvenioDetalhado } from "@/modules/concedentes/services/convenio-service";

// JSON shape of /api/v1/convenios: every period, oldest first, and whether it is valid today
export function convenioJson(row: ConvenioDetalhado) {
  return {
    id: row.id,
    concedente_id: row.concedenteId,
    numero: row.numero,
    observacao: row.observacao,
    situacao: row.situacao,
    motivo_encerramento: row.motivoEncerramento,
    vigente_hoje: row.vigenteEm(dataLocal()),
    vigencias: row.vigencias.map((vigencia) => ({
      id: vigencia.id,
      vigencia_inicio: vigencia.vigenciaInicio,
      vigencia_fim: vigencia.vigenciaFim,
      renova_vigencia_id: vigencia.renovaVigenciaId,
      documento_id: vigencia.documentoId,
      registrado_por_usuario_id: vigencia.registradoPorUsuarioId,
      criado_em: vigencia.criadoEm.toISOString(),
    })),
  };
}
