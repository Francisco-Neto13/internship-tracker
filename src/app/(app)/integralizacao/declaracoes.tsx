import { FileCheck2 } from "lucide-react";
import { formatarDataHora } from "@/lib/datas";
import type { Identity } from "@/lib/identity";
import { TIPO_DECLARACAO } from "@/lib/rotulos";
import { listDeclaracoes } from "@/modules/integralizacao/services/declaracao-service";
import { BaixarDocumento } from "@/shared/ui/baixar-documento";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { Painel } from "@/shared/ui/painel";

// RF058: declarações do estudante com o código de verificação; o PDF baixa pela rota de
// documento, que confere quem lê (RLS) e entrega um link de um minuto.

export async function DeclaracoesEstudante({ identity, estudanteId, atividadesCumpridas }: { identity: Identity; estudanteId: string; atividadesCumpridas: boolean }) {
  const declaracoes = await listDeclaracoes(identity, estudanteId);
  return (
    <Painel
      titulo="Declarações"
      descricao="Cada declaração tem um código que qualquer pessoa confere sem login."
      flush
      acoes={
        atividadesCumpridas && (
          <BotaoAcao
            url={`/api/v1/estudantes/${estudanteId}/declaracoes`}
            rotulo="Emitir declaração de atividades"
            confirmacao={{ titulo: "Emitir a declaração?", descricao: "A declaração fica registrada com um código de verificação público e não pode ser alterada.", confirmar: "Emitir" }}
            corpo={{ tipo: "INTEGRALIZACAO_ATIVIDADES" }}
            tamanho="sm"
            sucesso="Declaração emitida"
          />
        )
      }
    >
      {declaracoes.length === 0 ? (
        <p className="px-5 py-6 text-sm text-navy-900/65">
          Nenhuma declaração emitida.{" "}
          {atividadesCumpridas
            ? "As atividades complementares estão cumpridas: a declaração já pode ser emitida."
            : "A declaração de atividades fica disponível quando a carga exigida for cumprida; a de conclusão, na página do estágio concluído."}
        </p>
      ) : (
        <ul className="divide-y divide-navy-900/[0.07]" data-testid="declaracoes">
          {declaracoes.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <FileCheck2 className="size-5 shrink-0 text-navy-700" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-navy-900">{TIPO_DECLARACAO[item.tipo]}</p>
                <p className="text-xs text-navy-900/65">
                  Emitida em {formatarDataHora(item.criadoEm)} · código <span className="font-mono text-navy-900">{item.codigoVerificacao}</span>
                </p>
              </div>
              <BaixarDocumento documentoId={item.documentoId} rotulo="Baixar PDF" />
            </li>
          ))}
        </ul>
      )}
    </Painel>
  );
}
