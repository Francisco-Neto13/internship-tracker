import { Award, ClipboardList, TrendingUp } from "lucide-react";
import { formatarDataCurta, formatarDataHora } from "@/lib/datas";
import type { Identity } from "@/lib/identity";
import { listAvaliacoes, listCriterios } from "@/modules/acompanhamento/services/avaliacao-service";
import type { AcoesNoEstagio } from "@/modules/estagios/domain/papeis";
import { BaixarArquivo } from "@/shared/ui/baixar-arquivo";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { Indicador, Progresso } from "@/shared/ui/indicador";
import { Painel } from "@/shared/ui/painel";
import { StatusBadge } from "@/shared/ui/status-badge";
import { NovaAvaliacao } from "./nova-avaliacao";

// RF042, RF043: como o estagiário foi avaliado pela concedente, critério a critério, e o registro
// de uma nova avaliação por quem avalia. A média vai de 0 a 10, qualquer que seja a escala de cada
// critério. A avaliação final é exigida para a conclusão.

const nota = (valor: number) => valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export async function DesempenhoEstagio({ identity, estagioId, ativo, acoes }: { identity: Identity; estagioId: string; ativo: boolean; acoes: AcoesNoEstagio }) {
  const [avaliacoes, criterios] = await Promise.all([listAvaliacoes(identity, estagioId), listCriterios(identity, false)]);
  const porId = new Map(criterios.map((criterio) => [criterio.id, criterio]));
  const ativos = criterios.filter((criterio) => criterio.ativo);
  const final = avaliacoes.find((avaliacao) => avaliacao.momento === "FINAL");
  const medias = avaliacoes.flatMap((avaliacao) => (avaliacao.media === null || avaliacao.media === undefined ? [] : [avaliacao.media]));
  const mediaGeral = medias.length > 0 ? medias.reduce((soma, media) => soma + media, 0) / medias.length : null;
  const podeAvaliar = ativo && acoes.avaliar;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="desempenho-resumo">
        <Indicador rotulo="Média final" valor={final?.media ?? null} formatar={(valor) => `${nota(valor)} / 10`} contexto="da avaliação final" motivoSemValor="Avaliação final ainda não registrada" icone={Award} />
        <Indicador rotulo="Média geral" valor={mediaGeral} formatar={(valor) => `${nota(valor)} / 10`} contexto="de todas as avaliações" motivoSemValor="Nenhuma avaliação registrada" icone={TrendingUp} />
        <Indicador rotulo="Avaliações" valor={avaliacoes.length} contexto={final ? "final já registrada" : "final ainda pendente"} icone={ClipboardList} />
      </div>

      <div className={podeAvaliar ? "colunas-alinhadas grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]" : "flex flex-col"}>
        <div className="flex flex-col gap-4" data-testid="avaliacoes">
          {avaliacoes.length === 0 && <EstadoVazio titulo="Nenhuma avaliação registrada" descricao="As avaliações feitas pelo supervisor ou pela concedente aparecem aqui, com a nota de cada critério." />}
          {avaliacoes.map((avaliacao) => (
            <Painel
              key={avaliacao.id}
              titulo={avaliacao.momento === "FINAL" ? "Avaliação final" : `Periódica · ${formatarDataCurta(avaliacao.periodoInicio)} a ${formatarDataCurta(avaliacao.periodoFim)}`}
              descricao={`${avaliacao.avaliadorNome ?? "Avaliador"} · ${formatarDataHora(avaliacao.criadoEm)}`}
              acoes={
                <>
                  <StatusBadge tone="neutral">{avaliacao.media === null || avaliacao.media === undefined ? "Sem nota" : `Média ${nota(avaliacao.media)} / 10`}</StatusBadge>
                  <BaixarArquivo url={`/api/v1/estagios/${estagioId}/avaliacoes/${avaliacao.id}/pdf`} rotulo="Baixar PDF" tamanho="sm" />
                </>
              }
            >
              <div className="flex flex-col gap-4">
                {avaliacao.respostas.map((resposta) => {
                  const criterio = porId.get(resposta.criterioId);
                  return <Progresso key={resposta.id} rotulo={criterio?.descricao ?? "Critério"} atual={resposta.nota} total={criterio?.escalaMaxima ?? resposta.nota} detalhe={resposta.comentario ?? undefined} />;
                })}
                {avaliacao.observacoes && <p className="rounded-lg bg-nevoa-50 px-3 py-2 text-sm whitespace-pre-line text-navy-900/80">{avaliacao.observacoes}</p>}
              </div>
            </Painel>
          ))}
        </div>
        {podeAvaliar && (
          <Painel titulo="Nova avaliação" descricao="Dê uma nota a cada critério definido pela instituição.">
            {ativos.length === 0 ? (
              <EstadoVazio compacto variante="indisponivel" titulo="Sem critérios de avaliação" descricao="O administrador define os critérios em Parâmetros institucionais." />
            ) : (
              <NovaAvaliacao key={avaliacoes.length} estagioId={estagioId} criterios={ativos.map(({ id, descricao, escalaMinima, escalaMaxima }) => ({ id, descricao, escalaMinima, escalaMaxima }))} jaTemFinal={Boolean(final)} />
            )}
          </Painel>
        )}
      </div>
    </div>
  );
}
