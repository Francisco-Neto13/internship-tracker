import { createHash, randomUUID } from "node:crypto";
import { isTriggerRule } from "@/db/errors";
import { withUser } from "@/db/with-user";
import { DomainError, type DomainErrorKind } from "@/lib/errors";
import type { Identity } from "@/lib/identity";
import { gerarPdfDocumento } from "@/lib/pdf";
import { getArmazenamento } from "@/shared/documentos/armazenamento";
import { insertDocumento } from "@/shared/documentos/documento-repository";
import { documentoDeclaracao, gerarCodigoVerificacao, type DadosDeclaracao } from "../domain/declaracao";
import { dadosDeclaracao, findDeclaracoes, insertDeclaracao, type DeclaracaoRow } from "../repositories/declaracao-repository";

// RF058, RN-17, RN-35: the student or its coordination issues a declaration of a fact the
// database proves. The PDF is written to the storage first and registered as a DECLARACAO
// document with the declaration row in one transaction; if that fails, the object is removed.

const REGRAS: { codigo: string; kind: DomainErrorKind; mensagem: string }[] = [
  { codigo: "DECLARACAO_RESTRITA", kind: "FORBIDDEN", mensagem: "Só o estudante ou a coordenação do curso emitem a declaração." },
  { codigo: "DECLARACAO_INDISPONIVEL", kind: "CONFLICT", mensagem: "O fato declarado ainda não está cumprido." },
];

function traduzir(error: unknown): unknown {
  for (const regra of REGRAS) {
    if (isTriggerRule(error, regra.codigo)) return new DomainError({ code: regra.codigo, kind: regra.kind, message: regra.mensagem, requisito: "RF058" });
  }
  return error;
}

export type NovaDeclaracao = { tipo: DadosDeclaracao["tipo"]; estagioId: string | null };

export async function listDeclaracoes(identity: Identity, estudanteId: string): Promise<DeclaracaoRow[]> {
  return withUser(identity, (tx) => findDeclaracoes(tx, estudanteId));
}

export async function emitirDeclaracao(identity: Identity, estudanteId: string, input: NovaDeclaracao): Promise<DeclaracaoRow> {
  if ((input.tipo === "CONCLUSAO_ESTAGIO") !== (input.estagioId !== null)) {
    throw new DomainError({
      code: "DECLARACAO_INVALIDA",
      kind: "UNPROCESSABLE",
      message: "A declaração de conclusão indica o estágio; a de integralização, não.",
      requisito: "RF058",
    });
  }
  try {
    const dados = await withUser(identity, (tx) => dadosDeclaracao(tx, input.tipo, estudanteId, input.estagioId));
    const codigo = gerarCodigoVerificacao();
    const emitidaEm = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
    const pdf = await gerarPdfDocumento(documentoDeclaracao(dados, codigo, emitidaEm, process.env.BETTER_AUTH_URL));
    const chave = `documentos/${randomUUID()}.pdf`;
    const armazenamento = getArmazenamento();
    await armazenamento.gravar(chave, pdf, "application/pdf");
    try {
      return await withUser(identity, async (tx) => {
        const documento = await insertDocumento(tx, {
          tipo: "DECLARACAO",
          chaveObjeto: chave,
          nomeOriginal: `declaracao-${input.tipo === "CONCLUSAO_ESTAGIO" ? "conclusao-estagio" : "atividades-complementares"}-${dados.matricula}.pdf`,
          tipoMime: "application/pdf",
          tamanhoBytes: pdf.length,
          sha256: createHash("sha256").update(pdf).digest("hex"),
          sensivel: false,
          concedenteId: null,
          estagioId: input.estagioId,
          estudanteId: input.estagioId ? null : estudanteId,
          enviadoPorUsuarioId: identity.userId,
        });
        return insertDeclaracao(tx, {
          estudanteId,
          tipo: input.tipo,
          estagioId: input.estagioId,
          apuracaoId: dados.apuracao_id ?? null,
          documentoId: documento.id,
          codigoVerificacao: codigo,
          emitidaPorUsuarioId: identity.userId,
        });
      });
    } catch (error) {
      await armazenamento.remover(chave);
      throw error;
    }
  } catch (error) {
    throw traduzir(error);
  }
}
