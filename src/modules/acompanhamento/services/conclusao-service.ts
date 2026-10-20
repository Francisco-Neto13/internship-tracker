import { sql } from "drizzle-orm";
import { withUser } from "@/db/with-user";
import type { Identity } from "@/lib/identity";
import { detalharImpedimentos } from "@/modules/estagios/domain/conclusao";
import { carregarEstagioAcompanhado } from "./frequencia-service";

// RF043, RF045, D3 (DER §5.2): what still keeps an ATIVO internship from being concluded. The
// database calculates it (app.impedimentos_conclusao) and refuses the transition while it is
// not empty, so the conclusion of Fase 5 only has to try it.

export async function pendenciasConclusao(identity: Identity, estagioId: string) {
  return withUser(identity, async (tx) => {
    const estagio = await carregarEstagioAcompanhado(tx, estagioId);
    const { rows } = await tx.execute<{ impedimentos: string[] | null }>(
      sql`select app.impedimentos_conclusao(${estagioId}::uuid) as impedimentos`,
    );
    const impedimentos = detalharImpedimentos(rows[0]?.impedimentos ?? []);
    return { situacao: estagio.situacao, podeConcluir: estagio.situacao === "ATIVO" && impedimentos.length === 0, impedimentos };
  });
}
