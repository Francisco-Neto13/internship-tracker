import type { Identity } from "@/lib/identity";
import { listDeclaracoes } from "@/modules/integralizacao/services/declaracao-service";
import { BaixarDocumento } from "@/shared/ui/baixar-documento";
import { BotaoAcao } from "@/shared/ui/botao-acao";

// RF058: declarations of the student, with their verification codes; the PDF downloads
// through the document route, which checks the reader (RLS) and issues a short-lived URL
const TIPO: Record<string, string> = { CONCLUSAO_ESTAGIO: "Conclusão de estágio", INTEGRALIZACAO_ATIVIDADES: "Integralização de atividades complementares" };

export async function DeclaracoesEstudante({ identity, estudanteId, atividadesCumpridas }: { identity: Identity; estudanteId: string; atividadesCumpridas: boolean }) {
  const declaracoes = await listDeclaracoes(identity, estudanteId);
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-navy-900/60">Declarações (RF058)</h2>
      <ul className="surface-card flex flex-col divide-y divide-navy-900/10 text-sm" data-testid="declaracoes">
        {declaracoes.length === 0 && <li className="px-5 py-3 text-navy-900/60">Nenhuma declaração emitida.</li>}
        {declaracoes.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-navy-900">
            {TIPO[item.tipo]} · {item.criadoEm.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} · código <span className="font-mono">{item.codigoVerificacao}</span>
            <BaixarDocumento documentoId={item.documentoId} />
          </li>
        ))}
      </ul>
      {atividadesCumpridas && (
        <div>
          <BotaoAcao url={`/api/v1/estudantes/${estudanteId}/declaracoes`} rotulo="Emitir declaração de atividades complementares" corpo={{ tipo: "INTEGRALIZACAO_ATIVIDADES" }} variante="default" />
        </div>
      )}
    </div>
  );
}
