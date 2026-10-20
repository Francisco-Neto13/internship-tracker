import { withUser } from "@/db/with-user";
import { gerarCsv } from "@/lib/csv";
import { DomainError } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import {
  countRegistros,
  findRegistros,
  findUltimosRegistros,
  type AuditoriaDetalhadaRow,
  type FiltroAuditoria,
} from "../repositories/auditoria-repository";

/** Ceiling of one export; past it the administrator narrows the filters (RF066). */
export const EXPORTACAO_LIMITE = 10_000;

/** Most recent audit entries visible to the identity. RLS grants read only to
 * ADMINISTRADOR (RF065, RF066); every other profile resolves to an empty list. */
export async function listUltimosRegistros(identity: Identity, limit = 50) {
  return withUser(identity, (tx) => findUltimosRegistros(tx, limit));
}

/** RF066: filtered query of the trail. Other profiles see an empty trail, never an error. */
export async function listRegistros(
  identity: Identity,
  filtro: FiltroAuditoria,
  pagina: { page: number; limit: number },
): Promise<{ items: AuditoriaDetalhadaRow[]; total: number }> {
  return withUser(identity, async (tx) => ({
    items: await findRegistros(tx, filtro, { limit: pagina.limit, offset: (pagina.page - 1) * pagina.limit }),
    total: await countRegistros(tx, filtro),
  }));
}

const CABECALHO = [
  "id",
  "ocorrido_em",
  "operacao",
  "tabela",
  "registro_id",
  "usuario_id",
  "autor_nome",
  "autor_email",
  "campos_alterados",
  "dados_anteriores",
  "dados_novos",
];

/**
 * RF066: the filtered trail as CSV (src/lib/csv.ts). Counted and read in one transaction,
 * so the limit check and the rows agree. Over the limit it fails instead of cutting
 * silently: a partial audit export reads as a complete one.
 */
export async function exportarRegistros(identity: Identity, filtro: FiltroAuditoria): Promise<string> {
  const registros = await withUser(identity, async (tx) => {
    const total = await countRegistros(tx, filtro);
    if (total > EXPORTACAO_LIMITE) {
      throw new DomainError({
        code: "EXPORTACAO_EXCEDE_LIMITE",
        kind: "UNPROCESSABLE",
        message: `A consulta tem ${total} registros; o limite da exportação é ${EXPORTACAO_LIMITE}. Restrinja os filtros.`,
        requisito: "RF066",
      });
    }
    return findRegistros(tx, filtro, { limit: EXPORTACAO_LIMITE, offset: 0 });
  });

  return gerarCsv(
    CABECALHO,
    registros.map((registro) => [
      registro.id,
      registro.ocorridoEm,
      registro.operacao,
      registro.tabela,
      registro.registroId,
      registro.usuarioId,
      registro.autorNome,
      registro.autorEmail,
      registro.camposAlterados?.join(","),
      registro.dadosAnteriores,
      registro.dadosNovos,
    ]),
  );
}
