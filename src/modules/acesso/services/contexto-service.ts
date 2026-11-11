import { sql } from "drizzle-orm";
import { isForeignKeyViolation, isRlsViolation, isTriggerRule } from "@/db/errors";
import { withUser } from "@/db/with-user";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import {
  encerrarContextos,
  findContasParaContexto,
  findContextoAberto,
  insertContexto,
  type ContaParaContexto,
  type ContextoAberto,
} from "../repositories/contexto-repository";
import type { Perfil } from "../schemas/perfil";

// RF003: the administrator sees the system as another account, to check what each profile
// reaches. The switch lives in the database, tied to the session, and every request reads it
// again (src/lib/session.ts): the screen never decides on its own who is looking.

/** The account this administrator session is viewing as, or null. */
export async function contextoDaSessao(administrador: Identity, sessaoId: string): Promise<ContextoAberto | null> {
  return withUser(administrador, (tx) => findContextoAberto(tx, sessaoId));
}

export async function iniciarContexto(administrador: Identity, sessaoId: string, usuarioId: string): Promise<ContextoAberto> {
  if (usuarioId === administrador.userId) {
    throw new DomainError({
      code: "CONTEXTO_PROPRIA_CONTA",
      kind: "UNPROCESSABLE",
      message: "Essa é a sua própria conta. Para voltar a ela, use “Voltar ao meu perfil”.",
      requisito: "RF003",
    });
  }
  try {
    return await withUser(administrador, async (tx) => {
      await encerrarContextos(tx, sessaoId);
      await insertContexto(tx, { administradorId: administrador.userId, usuarioId, sessaoId });
      const aberto = await findContextoAberto(tx, sessaoId);
      if (!aberto) throw restritoAoAdministrador();
      return aberto;
    });
  } catch (error) {
    if (isRlsViolation(error)) throw restritoAoAdministrador();
    if (isTriggerRule(error, "CONTA_INATIVA")) {
      throw new DomainError({ code: "CONTA_INATIVA", kind: "UNPROCESSABLE", message: "Essa conta está inativa.", requisito: "RF003" });
    }
    if (isForeignKeyViolation(error, "contexto_administrador_usuario_id_usuario_id_fk")) {
      throw new DomainError({ code: "NOT_FOUND", kind: "NOT_FOUND", message: "Conta não encontrada.", requisito: "RF003" });
    }
    throw error;
  }
}

/** Back to the administrator's own view. Without an open switch there is nothing to end. */
export async function encerrarContexto(administrador: Identity, sessaoId: string): Promise<void> {
  await withUser(administrador, (tx) => encerrarContextos(tx, sessaoId));
}

export async function listContasParaContexto(
  administrador: Identity,
  filtros: { busca?: string; perfil?: Perfil; limite: number },
): Promise<ContaParaContexto[]> {
  return withUser(administrador, async (tx) => {
    const { rows } = await tx.execute<{ sim: boolean }>(sql`select app.tem_perfil_vigente('ADMINISTRADOR') as sim`);
    if (!rows[0]?.sim) throw restritoAoAdministrador();
    return findContasParaContexto(tx, { administradorId: administrador.userId, ...filtros });
  });
}

function restritoAoAdministrador() {
  return new DomainError({
    code: "CONTEXTO_RESTRITO_AO_ADMINISTRADOR",
    kind: "FORBIDDEN",
    message: "Só o administrador vê o sistema como outra conta.",
    requisito: "RF003",
  });
}
