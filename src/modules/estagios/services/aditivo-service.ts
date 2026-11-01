import { createHash } from "node:crypto";
import { withUser } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { parametrosVigentesEm } from "@/modules/academico/services/parametro-service";
import { limiteDuracaoMaxima } from "../domain/tce";
import {
  cancelarAditivo,
  efetivarAditivo,
  findAditivoById,
  findAditivos,
  findAssinaturasAditivo,
  insertAditivo,
  type AditivoRow,
} from "../repositories/aditivo-repository";
import { diasUsadosNoPar, findEstagioById, lockEstagio, podeAssinar } from "../repositories/estagio-repository";
import { findResponsavelAtual, insertAssinatura, nomeDoUsuario } from "../repositories/formalizacao-repository";
import { estagioNaoEncontrado, traduzirErroEstagio } from "./erros";
import { PERFIL_DA_PARTE } from "./formalizacao-service";

// RF020, RF021, RF061, RF062, RN-06, RN-26 (DER §5.7). After activation the TCE changes only
// through an amendment signed by the three parties; the third signature makes it effective
// and applies its effect in the same transaction (app.efetivar_aditivo).

type Parte = "ESTUDANTE" | "INSTITUICAO" | "CONCEDENTE";

export type NovoAditivo =
  | { tipo: "PRORROGACAO"; justificativa: string; novaDataFimPactuada: string }
  | {
      tipo: "ALTERACAO_CARGA_HORARIA";
      justificativa: string;
      novaCargaDiariaMinutos?: number;
      novaCargaSemanalMinutos?: number;
      novaCargaTotalMinutos?: number;
    }
  | { tipo: "SUBSTITUICAO_SUPERVISOR"; justificativa: string; novoSupervisorUsuarioId: string };

function hashConteudo(estagioId: string, numeroBase: number, input: NovoAditivo): string {
  const canonico = JSON.stringify(Object.entries({ estagioId, numeroBase, ...input }).sort(([a], [b]) => a.localeCompare(b)));
  return createHash("sha256").update(canonico).digest("hex");
}

/** RF020: proposes an amendment to an active internship; one pending at a time. */
export async function criarAditivo(identity: Identity, estagioId: string, input: NovoAditivo): Promise<AditivoRow> {
  try {
    return await withUser(identity, async (tx) => {
      const estagio = await lockEstagio(tx, estagioId);
      if (!estagio) throw estagioNaoEncontrado();
      if (estagio.situacao !== "ATIVO") {
        throw new DomainError({
          code: "ESTAGIO_NAO_ATIVO",
          kind: "CONFLICT",
          message: "Aditivo vale para estágio ativo; na formalização, reabra o TCE.",
          requisito: "RF020",
        });
      }

      const parametros = await parametrosVigentesEm(tx, estagio.dataInicio);
      const supervisorAtual = await findResponsavelAtual(tx, estagioId, "SUPERVISOR");
      if (input.tipo === "PRORROGACAO") {
        if (input.novaDataFimPactuada <= estagio.dataFimPactuada) {
          throw new DomainError({
            code: "PRORROGACAO_INVALIDA",
            kind: "UNPROCESSABLE",
            message: `A prorrogação precisa ir além de ${estagio.dataFimPactuada}.`,
            requisito: "RF061",
          });
        }
        if (!estagio.dispensaDuracaoMaxima) {
          // The new end moves the expected end by the same delta (afastamento extensions included)
          const delta = (Date.parse(input.novaDataFimPactuada) - Date.parse(estagio.dataFimPactuada)) / 86_400_000;
          const novoFimPrevisto = new Date(Date.parse(estagio.dataFimPrevista) + delta * 86_400_000).toISOString().slice(0, 10);
          const limite = limiteDuracaoMaxima(
            estagio.dataInicio,
            parametros.duracaoMaximaMeses,
            await diasUsadosNoPar(tx, estagio.estudanteId, estagio.concedenteId, estagioId),
          );
          if (novoFimPrevisto > limite) {
            throw new DomainError({
              code: "DURACAO_MAXIMA_EXCEDIDA",
              kind: "UNPROCESSABLE",
              message: `Na mesma concedente o estágio pode ir até ${limite} (Lei 11.788/2008, art. 11).`,
              requisito: "RF062",
            });
          }
        }
      }
      if (input.tipo === "ALTERACAO_CARGA_HORARIA") {
        const diaria = input.novaCargaDiariaMinutos ?? estagio.cargaDiariaMinutos;
        const semanal = input.novaCargaSemanalMinutos ?? estagio.cargaSemanalMinutos;
        const limiteDiario =
          estagio.tipo === "OBRIGATORIO" ? parametros.limiteDiarioObrigatorioMinutos : parametros.limiteDiarioNaoObrigatorioMinutos;
        if (diaria > limiteDiario || semanal > parametros.limiteSemanalMinutos || diaria > semanal) {
          throw new DomainError({
            code: "LIMITE_JORNADA_EXCEDIDO",
            kind: "UNPROCESSABLE",
            message: "A nova jornada passa dos limites diário ou semanal (Lei 11.788/2008, art. 10).",
            requisito: "RF024",
          });
        }
      }

      const snapshotAnterior = {
        data_fim_pactuada: estagio.dataFimPactuada,
        data_fim_prevista: estagio.dataFimPrevista,
        carga_diaria_minutos: estagio.cargaDiariaMinutos,
        carga_semanal_minutos: estagio.cargaSemanalMinutos,
        carga_total_minutos: estagio.cargaTotalMinutos,
        supervisor_usuario_id: supervisorAtual?.usuarioId ?? null,
      };
      const quantidade = (await findAditivos(tx, estagioId)).length;
      return insertAditivo(tx, {
        estagioId,
        tipo: input.tipo,
        justificativa: input.justificativa,
        snapshotAnterior,
        novaDataFimPactuada: input.tipo === "PRORROGACAO" ? input.novaDataFimPactuada : null,
        novaCargaDiariaMinutos: input.tipo === "ALTERACAO_CARGA_HORARIA" ? (input.novaCargaDiariaMinutos ?? null) : null,
        novaCargaSemanalMinutos: input.tipo === "ALTERACAO_CARGA_HORARIA" ? (input.novaCargaSemanalMinutos ?? null) : null,
        novaCargaTotalMinutos: input.tipo === "ALTERACAO_CARGA_HORARIA" ? (input.novaCargaTotalMinutos ?? null) : null,
        novoSupervisorUsuarioId: input.tipo === "SUBSTITUICAO_SUPERVISOR" ? input.novoSupervisorUsuarioId : null,
        hashConteudo: hashConteudo(estagioId, quantidade, input),
        criadoPorUsuarioId: identity.userId,
      });
    });
  } catch (error) {
    throw traduzirErroEstagio(error, "propor aditivo");
  }
}

/**
 * RF020: a party signs the amendment. With the third signature the amendment becomes
 * VIGENTE and its effect is applied to the internship (prorrogação, cargas or supervisor).
 */
export async function assinarAditivo(identity: Identity, aditivoId: string, parte: Parte, enderecoIp: string | null) {
  try {
    return await withUser(identity, async (tx) => {
      const aditivo = await findAditivoById(tx, aditivoId);
      if (!aditivo) {
        throw new DomainError({ code: "ADITIVO_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Aditivo não encontrado.", requisito: "RF020" });
      }
      if (aditivo.situacao !== "AGUARDANDO_ASSINATURAS") {
        throw new DomainError({ code: "ADITIVO_NAO_ASSINAVEL", kind: "CONFLICT", message: "O aditivo não está aguardando assinaturas.", requisito: "RF020" });
      }
      if (!(await podeAssinar(tx, aditivo.estagioId, parte))) {
        throw new DomainError({ code: "ACESSO_NEGADO", kind: "FORBIDDEN", message: `O perfil atual não permite assinar pela parte ${parte}.`, requisito: "RF003" });
      }
      await insertAssinatura(tx, {
        estagioId: aditivo.estagioId,
        aditivoId,
        parte,
        signatarioUsuarioId: identity.userId,
        signatarioNome: (await nomeDoUsuario(tx, identity.userId)) ?? "",
        signatarioPerfil: PERFIL_DA_PARTE[parte],
        hashDocumento: aditivo.hashConteudo,
        documentoId: null,
        enderecoIp,
      });
      const efetivado = await efetivarAditivo(tx, aditivoId);
      return { aditivo: (await findAditivoById(tx, aditivoId))!, efetivado, assinaturas: await findAssinaturasAditivo(tx, aditivoId) };
    });
  } catch (error) {
    throw traduzirErroEstagio(error, "assinar o aditivo");
  }
}

export async function cancelarAditivoPendente(identity: Identity, aditivoId: string, motivo: string): Promise<AditivoRow> {
  try {
    return await withUser(identity, async (tx) => {
      const atual = await findAditivoById(tx, aditivoId);
      if (!atual) {
        throw new DomainError({ code: "ADITIVO_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Aditivo não encontrado.", requisito: "RF020" });
      }
      const cancelado = await cancelarAditivo(tx, aditivoId, motivo);
      if (cancelado) return cancelado;
      if (atual.situacao !== "AGUARDANDO_ASSINATURAS") {
        throw new DomainError({ code: "ADITIVO_NAO_ASSINAVEL", kind: "CONFLICT", message: "Só um aditivo pendente é cancelado.", requisito: "RF020" });
      }
      throw new DomainError({ code: "ACESSO_NEGADO", kind: "FORBIDDEN", message: "O perfil atual não permite cancelar aditivo.", requisito: "RF003" });
    });
  } catch (error) {
    throw traduzirErroEstagio(error, "cancelar o aditivo");
  }
}

export async function listAditivos(identity: Identity, estagioId: string) {
  return withUser(identity, async (tx) => {
    if (!(await findEstagioById(tx, estagioId))) throw estagioNaoEncontrado();
    return findAditivos(tx, estagioId);
  });
}

/**
 * RF021 (DER §5.7): the TCE version in force and every earlier one, rebuilt from the
 * snapshots of the effective amendments, newest first.
 */
export async function historicoTce(identity: Identity, estagioId: string) {
  return withUser(identity, async (tx) => {
    const estagio = await findEstagioById(tx, estagioId);
    if (!estagio) throw estagioNaoEncontrado();
    type Valores = Pick<Record<string, unknown>, string>;
    const campos = ["data_fim_pactuada", "data_fim_prevista", "carga_diaria_minutos", "carga_semanal_minutos", "carga_total_minutos", "supervisor_usuario_id"];
    const efetivados = (await findAditivos(tx, estagioId))
      .filter((item) => item.situacao === "VIGENTE")
      .sort((a, b) => b.numero - a.numero);

    let valores: Valores = {
      data_fim_pactuada: estagio.dataFimPactuada,
      data_fim_prevista: estagio.dataFimPrevista,
      carga_diaria_minutos: estagio.cargaDiariaMinutos,
      carga_semanal_minutos: estagio.cargaSemanalMinutos,
      carga_total_minutos: estagio.cargaTotalMinutos,
    };
    const versoes: { vigenteDesde: Date; origem: string; valores: Valores }[] = [];
    for (const item of efetivados) {
      versoes.push({ vigenteDesde: item.efetivadoEm!, origem: `ADITIVO ${item.numero}`, valores });
      const anterior = item.snapshotAnterior as Valores;
      valores = Object.fromEntries(campos.filter((campo) => campo in anterior).map((campo) => [campo, anterior[campo]]));
    }
    versoes.push({ vigenteDesde: estagio.ativadoEm ?? estagio.criadoEm, origem: "TCE", valores });
    return versoes;
  });
}
