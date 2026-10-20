import { isExclusionViolation, isRlsViolation, isUniqueViolation } from "@/db/errors";
import { withUser } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { exigirDocumento } from "@/shared/documentos/documento-service";
import { findConcedenteById } from "../repositories/concedente-repository";
import {
  findConvenioById,
  findConveniosAVencer,
  findConveniosDaConcedente,
  findVigencias,
  insertConvenio,
  insertVigencia,
  updateConvenio,
  type ConvenioRow,
  type VigenciaRow,
} from "../repositories/convenio-repository";

// RF009 to RF012, RN-02. A period is inclusive on both ends; renewal adds a new period and
// keeps the previous ones (RF011). Writes by administrator or coordination (RLS).

export type ConvenioDetalhado = ConvenioRow & { vigencias: VigenciaRow[]; vigenteEm: (data: string) => boolean };

const naoEncontrado = () =>
  new DomainError({ code: "CONVENIO_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Convênio não encontrado.", requisito: "RF009" });

function translateWriteError(error: unknown, acao: string): unknown {
  if (isRlsViolation(error)) {
    return new DomainError({ code: "ACESSO_NEGADO", kind: "FORBIDDEN", message: `O perfil atual não permite ${acao}.`, requisito: "RF003" });
  }
  if (isUniqueViolation(error, "convenio_numero_unique")) {
    return new DomainError({ code: "NUMERO_CONVENIO_DUPLICADO", kind: "CONFLICT", message: "Já existe convênio com este número.", requisito: "RF009" });
  }
  if (isExclusionViolation(error, "convenio_vigencia_sem_sobreposicao")) {
    return new DomainError({
      code: "VIGENCIA_SOBREPOSTA",
      kind: "CONFLICT",
      message: "O período informado se sobrepõe a uma vigência do convênio.",
      requisito: "RF011",
    });
  }
  return error;
}

function validarPeriodo(inicio: string, fim: string) {
  if (fim < inicio) {
    throw new DomainError({
      code: "PERIODO_INVALIDO",
      kind: "UNPROCESSABLE",
      message: "O fim da vigência precisa ser igual ou posterior ao início.",
      requisito: "RN-02",
    });
  }
}

function detalhar(row: ConvenioRow, vigencias: VigenciaRow[]): ConvenioDetalhado {
  return {
    ...row,
    vigencias,
    vigenteEm: (data) => row.situacao === "ATIVO" && vigencias.some((v) => v.vigenciaInicio <= data && data <= v.vigenciaFim),
  };
}

export async function listConveniosDaConcedente(identity: Identity, concedenteId: string): Promise<ConvenioDetalhado[]> {
  return withUser(identity, async (tx) => {
    if (!(await findConcedenteById(tx, concedenteId))) {
      throw new DomainError({ code: "CONCEDENTE_NAO_ENCONTRADA", kind: "NOT_FOUND", message: "Concedente não encontrada.", requisito: "RF007" });
    }
    const convenios = await findConveniosDaConcedente(tx, concedenteId);
    const vigencias = await findVigencias(tx, convenios.map((item) => item.id));
    return convenios.map((item) => detalhar(item, vigencias.filter((v) => v.convenioId === item.id)));
  });
}

export async function getConvenio(identity: Identity, id: string): Promise<ConvenioDetalhado> {
  return withUser(identity, async (tx) => {
    const row = await findConvenioById(tx, id);
    if (!row) throw naoEncontrado();
    return detalhar(row, await findVigencias(tx, [id]));
  });
}

/** RF009: agreement with its first period and the signed document already uploaded (D8). */
export async function createConvenio(
  identity: Identity,
  concedenteId: string,
  input: { numero: string; observacao: string | null; vigenciaInicio: string; vigenciaFim: string; documentoId: string },
): Promise<ConvenioDetalhado> {
  validarPeriodo(input.vigenciaInicio, input.vigenciaFim);
  await exigirDocumento(identity, input.documentoId, { tipo: "CONVENIO", concedenteId });
  try {
    return await withUser(identity, async (tx) => {
      if (!(await findConcedenteById(tx, concedenteId))) {
        throw new DomainError({ code: "CONCEDENTE_NAO_ENCONTRADA", kind: "NOT_FOUND", message: "Concedente não encontrada.", requisito: "RF007" });
      }
      const criado = await insertConvenio(tx, { concedenteId, numero: input.numero, observacao: input.observacao });
      const vigencia = await insertVigencia(tx, {
        convenioId: criado.id,
        vigenciaInicio: input.vigenciaInicio,
        vigenciaFim: input.vigenciaFim,
        renovaVigenciaId: null,
        documentoId: input.documentoId,
        registradoPorUsuarioId: identity.userId,
      });
      return detalhar(criado, [vigencia]);
    });
  } catch (error) {
    throw translateWriteError(error, "registrar convênio");
  }
}

/** RF011: a new period after the last one; the previous periods stay as history. */
export async function renovarConvenio(
  identity: Identity,
  id: string,
  input: { vigenciaInicio: string; vigenciaFim: string; documentoId: string },
): Promise<ConvenioDetalhado> {
  validarPeriodo(input.vigenciaInicio, input.vigenciaFim);
  try {
    const atual = await getConvenio(identity, id);
    await exigirDocumento(identity, input.documentoId, { tipo: "CONVENIO", concedenteId: atual.concedenteId });
    if (atual.situacao !== "ATIVO") {
      throw new DomainError({ code: "CONVENIO_ENCERRADO", kind: "CONFLICT", message: "Convênio encerrado não é renovado.", requisito: "RF011" });
    }
    const ultima = atual.vigencias.at(-1);
    if (ultima && input.vigenciaInicio <= ultima.vigenciaFim) {
      throw new DomainError({
        code: "RENOVACAO_ANTES_DO_FIM",
        kind: "UNPROCESSABLE",
        message: `A nova vigência começa depois de ${ultima.vigenciaFim}, fim da vigência atual.`,
        requisito: "RF011",
      });
    }
    return await withUser(identity, async (tx) => {
      await insertVigencia(tx, {
        convenioId: id,
        vigenciaInicio: input.vigenciaInicio,
        vigenciaFim: input.vigenciaFim,
        renovaVigenciaId: ultima?.id ?? null,
        documentoId: input.documentoId,
        registradoPorUsuarioId: identity.userId,
      });
      return detalhar(atual, await findVigencias(tx, [id]));
    });
  } catch (error) {
    throw translateWriteError(error, "renovar convênio");
  }
}

export async function atualizarObservacao(identity: Identity, id: string, observacao: string | null) {
  return alterarConvenio(identity, id, { observacao }, "editar convênio");
}

/** RF009: early termination (denúncia); the periods stay, the agreement stops counting (RF010). */
export async function encerrarConvenio(identity: Identity, id: string, motivo: string) {
  const atual = await getConvenio(identity, id);
  if (atual.situacao === "ENCERRADO") {
    throw new DomainError({ code: "CONVENIO_ENCERRADO", kind: "CONFLICT", message: "O convênio já está encerrado.", requisito: "RF009" });
  }
  return alterarConvenio(identity, id, { situacao: "ENCERRADO", motivoEncerramento: motivo }, "encerrar convênio");
}

async function alterarConvenio(
  identity: Identity,
  id: string,
  values: Partial<Pick<ConvenioRow, "observacao" | "situacao" | "motivoEncerramento">>,
  acao: string,
): Promise<ConvenioDetalhado> {
  try {
    return await withUser(identity, async (tx) => {
      const atualizado = await updateConvenio(tx, id, values);
      if (!atualizado) {
        if (await findConvenioById(tx, id)) {
          throw new DomainError({ code: "ACESSO_NEGADO", kind: "FORBIDDEN", message: `O perfil atual não permite ${acao}.`, requisito: "RF003" });
        }
        throw naoEncontrado();
      }
      return detalhar(atualizado, await findVigencias(tx, [id]));
    });
  } catch (error) {
    throw translateWriteError(error, acao);
  }
}

/** RF012: agreements lapsing between `hoje` and `hoje + dias` without a later period. */
export async function listConveniosAVencer(identity: Identity, hoje: string, dias: number) {
  const ate = new Date(`${hoje}T00:00:00Z`);
  ate.setUTCDate(ate.getUTCDate() + dias);
  return withUser(identity, (tx) => findConveniosAVencer(tx, hoje, ate.toISOString().slice(0, 10)));
}
