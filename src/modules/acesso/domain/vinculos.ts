import { DomainError, type DomainErrorDetail } from "@/lib/errors";
import type { Perfil } from "../schemas/perfil";

// Profile links of a user (RF001, RF003, RN-37). Pure rules: the service loads and
// persists, the database enforces the same constraints again (vinculo_perfil checks).

export type VinculoDesejado = { perfil: Perfil; cursoId: string | null };
export type VinculoAtual = VinculoDesejado & { id: string };

// Supervisor and concedente are scoped by the concedente they belong to (RF031,
// DER-LOGICO §4.1). That column arrives with the concedente table in Fase 2; a link
// created now would violate the check constraint that migration adds.
const PERFIS_QUE_EXIGEM_CONCEDENTE: readonly Perfil[] = ["SUPERVISOR", "CONCEDENTE"];

function chave(vinculo: VinculoDesejado) {
  return `${vinculo.perfil}:${vinculo.cursoId ?? ""}`;
}

/** Rejects an invalid set of links, reporting every problem at once. */
export function validarVinculos(vinculos: VinculoDesejado[]): void {
  const detalhes: DomainErrorDetail[] = [];
  const vistos = new Set<string>();

  vinculos.forEach((vinculo, indice) => {
    const field = `perfis.${indice}`;

    if (PERFIS_QUE_EXIGEM_CONCEDENTE.includes(vinculo.perfil)) {
      detalhes.push({
        code: "PERFIL_EXIGE_CONCEDENTE",
        field,
        issue: `O perfil ${vinculo.perfil} depende do cadastro de concedentes, previsto para a Fase 2`,
        requisito: "RF031",
      });
    }
    if (vinculo.perfil === "COORDENACAO" && !vinculo.cursoId) {
      detalhes.push({
        code: "COORDENACAO_EXIGE_CURSO",
        field: `${field}.curso_id`,
        issue: "A coordenação é sempre de um curso",
        requisito: "RN-37",
      });
    }
    if (vinculo.perfil !== "COORDENACAO" && vinculo.cursoId) {
      detalhes.push({
        code: "CURSO_SO_PARA_COORDENACAO",
        field: `${field}.curso_id`,
        issue: "Só o perfil de coordenação é vinculado a um curso",
        requisito: "RN-37",
      });
    }
    if (vistos.has(chave(vinculo))) {
      detalhes.push({ code: "PERFIL_DUPLICADO", field, issue: "O mesmo vínculo aparece mais de uma vez" });
    }
    vistos.add(chave(vinculo));
  });

  if (detalhes.length > 0) {
    throw new DomainError({
      code: "VINCULOS_INVALIDOS",
      kind: "UNPROCESSABLE",
      message: "Os vínculos de perfil informados não são válidos.",
      requisito: "RF001",
      details: detalhes,
    });
  }
}

/**
 * What changes when the links of a user are replaced: links that stay keep their row and
 * history, links that leave are closed, new ones are opened. Nothing is deleted.
 */
export function diferencaVinculos(atuais: VinculoAtual[], desejados: VinculoDesejado[]) {
  const desejadas = new Set(desejados.map(chave));
  const atuaisPorChave = new Set(atuais.map(chave));

  return {
    encerrar: atuais.filter((vinculo) => !desejadas.has(chave(vinculo))).map((vinculo) => vinculo.id),
    abrir: desejados.filter((vinculo) => !atuaisPorChave.has(chave(vinculo))),
  };
}

/** The administrator cannot remove their own administrator profile and lock everyone out. */
export function impedirAutorremocaoAdministrador(
  solicitanteId: string,
  usuarioId: string,
  desejados: VinculoDesejado[],
): void {
  if (solicitanteId === usuarioId && !desejados.some((vinculo) => vinculo.perfil === "ADMINISTRADOR")) {
    throw new DomainError({
      code: "AUTORREMOCAO_ADMINISTRADOR_VEDADA",
      kind: "CONFLICT",
      message: "Você não pode remover o próprio perfil de administrador.",
      requisito: "RF001",
    });
  }
}

/** The administrator cannot inactivate their own account. */
export function impedirAutoinativacao(solicitanteId: string, usuarioId: string): void {
  if (solicitanteId === usuarioId) {
    throw new DomainError({
      code: "AUTOINATIVACAO_VEDADA",
      kind: "CONFLICT",
      message: "Você não pode inativar a própria conta.",
      requisito: "RF001",
    });
  }
}
