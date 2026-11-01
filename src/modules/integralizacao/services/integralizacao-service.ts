import { withUser, type Transaction } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { progresso, type Apuracao } from "../domain/progresso";
import { apurar, calcular, countApuracoes, estudanteAtualId, estudanteVisivel, findApuracaoVigente, nomesDasCategorias } from "../repositories/apuracao-repository";

// M07 integralization (RF056, RF057, RN-24, RN-35). The database calculates and stores each
// assessment (app.apurar_integralizacao) on every event that changes it; this service reads
// the one in force, recalculates on request and derives what is left (RN-24).

const naoEncontrado = () =>
  new DomainError({ code: "ESTUDANTE_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Estudante não encontrado.", requisito: "RF057" });

async function exigirVisivel(tx: Transaction, estudanteId: string) {
  if (!(await estudanteVisivel(tx, estudanteId))) throw naoEncontrado();
}

export type Integralizacao = {
  estudanteId: string;
  /** null when no event produced an assessment yet: the numbers are calculated now, not stored */
  apuradoEm: Date | null;
  gatilho: string | null;
  apuracoes: number;
  apuracao: Apuracao;
  categorias: { categoriaId: string; categoriaNome: string | null; limiteMinutos: number; aproveitadoMinutos: number }[];
  progresso: ReturnType<typeof progresso>;
};

async function montar(tx: Transaction, estudanteId: string): Promise<Integralizacao> {
  const vigente = await findApuracaoVigente(tx, estudanteId);
  if (vigente) {
    const apuracao: Apuracao = {
      estagioExigidoMinutos: vigente.apuracao.estagioObrigatorioExigidoMinutos,
      estagioConcluidoMinutos: vigente.apuracao.estagioObrigatorioConcluidoMinutos,
      atividadesExigidoMinutos: vigente.apuracao.atividadesExigidoMinutos,
      atividadesAproveitadoMinutos: vigente.apuracao.atividadesAproveitadoMinutos,
      categorias: vigente.categorias,
    };
    return {
      estudanteId,
      apuradoEm: vigente.apuracao.criadoEm,
      gatilho: vigente.apuracao.gatilho,
      apuracoes: await countApuracoes(tx, estudanteId),
      apuracao,
      categorias: vigente.categorias,
      progresso: progresso(apuracao),
    };
  }
  const calculado = await calcular(tx, estudanteId);
  if (!calculado) throw naoEncontrado();
  const nomes = await nomesDasCategorias(tx, calculado.categorias.map((categoria) => categoria.categoriaId));
  return {
    estudanteId,
    apuradoEm: null,
    gatilho: null,
    apuracoes: 0,
    apuracao: calculado,
    categorias: calculado.categorias.map((categoria) => ({ ...categoria, categoriaNome: nomes.get(categoria.categoriaId) ?? null })),
    progresso: progresso(calculado),
  };
}

/** RF057: the integralization of a student the caller follows (the student or its coordination). */
export async function getIntegralizacao(identity: Identity, estudanteId: string) {
  return withUser(identity, async (tx) => {
    await exigirVisivel(tx, estudanteId);
    return montar(tx, estudanteId);
  });
}

/** RF057: the student's own integralization. */
export async function getMinhaIntegralizacao(identity: Identity) {
  return withUser(identity, async (tx) => {
    const estudanteId = await estudanteAtualId(tx);
    if (!estudanteId) {
      throw new DomainError({ code: "ESTUDANTE_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "O usuário não é estudante.", requisito: "RF057" });
    }
    return montar(tx, estudanteId);
  });
}

/** RF056: stores a new assessment on request (gatilho MANUAL), the same calculation as the events. */
export async function reapurar(identity: Identity, estudanteId: string) {
  return withUser(identity, async (tx) => {
    await exigirVisivel(tx, estudanteId);
    await apurar(tx, estudanteId);
    return montar(tx, estudanteId);
  });
}
