import { isRlsViolation } from "@/db/errors";
import { withUser } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { PERIODICIDADE_PADRAO, type Periodicidade, type TipoEstagio } from "../domain/periodicidade";
import { findCursoById } from "../repositories/curso-repository";
import { findPeriodicidades, upsertPeriodicidade } from "../repositories/periodicidade-repository";

// RF036, RN-13: report periodicity of a course, by internship type. Reports already generated
// keep the deadline calculated when they were generated (DER §4.2).

const TIPOS: TipoEstagio[] = ["OBRIGATORIO", "NAO_OBRIGATORIO"];

export type PeriodicidadeCurso = Periodicidade & { tipoEstagio: TipoEstagio; origem: "CURSO" | "PADRAO" };

export async function getPeriodicidades(identity: Identity, cursoId: string): Promise<PeriodicidadeCurso[]> {
  return withUser(identity, async (tx) => {
    if (!(await findCursoById(tx, cursoId))) {
      throw new DomainError({ code: "CURSO_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Curso não encontrado.", requisito: "RF004" });
    }
    const definidas = await findPeriodicidades(tx, cursoId);
    return TIPOS.map((tipoEstagio) => {
      const definida = definidas.find((linha) => linha.tipoEstagio === tipoEstagio);
      return definida
        ? {
            tipoEstagio,
            intervaloMeses: definida.intervaloMeses,
            prazoEntregaDias: definida.prazoEntregaDias,
            prazoRelatorioFinalDias: definida.prazoRelatorioFinalDias,
            origem: "CURSO" as const,
          }
        : { tipoEstagio, ...PERIODICIDADE_PADRAO, origem: "PADRAO" as const };
    });
  });
}

/** RF036: administrator or coordination of the course sets the periodicity of each listed type. */
export async function definirPeriodicidades(identity: Identity, cursoId: string, itens: (Periodicidade & { tipoEstagio: TipoEstagio })[]) {
  try {
    await withUser(identity, async (tx) => {
      if (!(await findCursoById(tx, cursoId))) {
        throw new DomainError({ code: "CURSO_NAO_ENCONTRADO", kind: "NOT_FOUND", message: "Curso não encontrado.", requisito: "RF004" });
      }
      for (const { tipoEstagio, ...valores } of itens) {
        if (!(await upsertPeriodicidade(tx, cursoId, tipoEstagio, valores))) throw acessoNegado();
      }
    });
  } catch (error) {
    if (isRlsViolation(error)) throw acessoNegado();
    throw error;
  }
  return getPeriodicidades(identity, cursoId);
}

const acessoNegado = () =>
  new DomainError({ code: "ACESSO_NEGADO", kind: "FORBIDDEN", message: "O perfil atual não permite definir a periodicidade de relatórios.", requisito: "RF003" });
