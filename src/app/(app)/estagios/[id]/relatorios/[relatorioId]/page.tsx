import { notFound } from "next/navigation";
import { z } from "zod";
import { identidadeDaTela } from "@/lib/acesso-tela";
import { LIMITE } from "@/lib/campos";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { DomainError } from "@/lib/errors";
import { SITUACAO_RELATORIO } from "@/lib/rotulos";
import { nomeRelatorio, periodoRelatorio } from "@/modules/acompanhamento/domain/documento-relatorio";
import { getRelatorio } from "@/modules/acompanhamento/services/relatorio-service";
import { getEstagioDetalhado } from "@/modules/estagios/services/estagio-service";
import { BaixarArquivo } from "@/shared/ui/baixar-arquivo";
import { BaixarDocumento } from "@/shared/ui/baixar-documento";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { ListaDefinicao, Painel } from "@/shared/ui/painel";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

// RF037-RF039: o relatório como quem o analisa precisa ler: o texto de cada versão, os anexos, os
// pareceres e o PDF. Quem lê é decidido pela RLS (estudante, orientador e coordenação).

const DECISAO: Record<string, { rotulo: string; tom: "ok" | "pending" }> = { APROVADO: { rotulo: "Aprovado", tom: "ok" }, DEVOLVIDO: { rotulo: "Devolvido", tom: "pending" } };

export default async function RelatorioPage({ params }: { params: Promise<{ id: string; relatorioId: string }> }) {
  const identity = await identidadeDaTela("/relatorios");
  const parsed = z.object({ id: z.uuid(), relatorioId: z.uuid() }).safeParse(await params);
  if (!parsed.success) notFound();
  const { id, relatorioId } = parsed.data;
  const foraDoAlcance = (error: unknown): never => {
    if (error instanceof DomainError && (error.kind === "NOT_FOUND" || error.kind === "FORBIDDEN")) notFound();
    throw error;
  };
  const [{ relatorio, versoes }, { identificacao, acoes }] = await Promise.all([getRelatorio(identity, relatorioId).catch(foraDoAlcance), getEstagioDetalhado(identity, id).catch(foraDoAlcance)]);
  if (relatorio.estagioId !== id) notFound();
  const situacao = SITUACAO_RELATORIO[relatorio.situacao];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        voltar={{ href: `/estagios/${id}?aba=acompanhamento`, rotulo: "Acompanhamento do estágio" }}
        title={nomeRelatorio(relatorio)}
        description={identificacao.estudanteNome ? `${identificacao.estudanteNome} · ${identificacao.concedente ?? "concedente"}` : undefined}
        meta={
          <>
            <StatusBadge tone={situacao.tom}>{situacao.rotulo}</StatusBadge>
            {relatorio.emAtraso && <StatusBadge tone="danger">Em atraso</StatusBadge>}
            <span>{periodoRelatorio(relatorio)}</span>
            <span>Prazo {formatarData(relatorio.prazoEntrega)}</span>
          </>
        }
        acoes={
          <>
            {versoes.length > 0 && <BaixarArquivo url={`/api/v1/relatorios/${relatorioId}/pdf`} rotulo="Baixar PDF" />}
            {acoes.decidirRelatorio && relatorio.situacao === "EM_ANALISE" && (
              <>
                <BotaoAcao url={`/api/v1/relatorios/${relatorioId}/aprovacao`} rotulo="Aprovar" confirmacao={{ titulo: "Aprovar o relatório?", descricao: "A aprovação é definitiva: o relatório não volta para análise e passa a contar para a conclusão do estágio.", confirmar: "Aprovar" }} variante="default" sucesso="Relatório aprovado" />
                <BotaoAcao url={`/api/v1/relatorios/${relatorioId}/devolucao`} rotulo="Devolver" pedirMotivo={{ campo: "parecer", pergunta: "Parecer da devolução", max: LIMITE.parecerRelatorio }} />
              </>
            )}
          </>
        }
      />

      {versoes.length === 0 && identity.titularId ? (
        // RF003: the switch hides report content, the administrator's rule (versao_relatorio_leitura)
        <EstadoVazio titulo="Conteúdo oculto para o administrador" descricao="O texto e os anexos do relatório não aparecem enquanto você vê o sistema como outra pessoa." />
      ) : versoes.length === 0 ? (
        <EstadoVazio titulo="Relatório ainda não enviado" descricao="O texto aparece aqui depois que o estudante enviar o relatório." />
      ) : (
        <div className="flex flex-col gap-4" data-testid="relatorio-versoes">
          {versoes.map((versao, indice) => (
            <Painel key={versao.id} titulo={indice === 0 ? `Versão ${versao.numero} (atual)` : `Versão ${versao.numero}`} descricao={`Enviada em ${formatarDataHora(versao.criadoEm)}${versao.enviadaComAtraso ? ", fora do prazo" : ""}`}>
              <div className="flex flex-col gap-4">
                <p className="text-sm whitespace-pre-line text-navy-900">{versao.conteudo ?? "O conteúdo desta versão está nos anexos."}</p>
                {versao.anexos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {versao.anexos.map((anexo) => (
                      <BaixarDocumento key={anexo.id} documentoId={anexo.documentoId} rotulo={`Baixar ${anexo.nomeOriginal ?? "anexo"}`} />
                    ))}
                  </div>
                )}
                {versao.parecer && (
                  <div className="border-t border-navy-900/[0.07] pt-4">
                    <ListaDefinicao
                      colunas={3}
                      itens={[
                        { rotulo: "Decisão", valor: <StatusBadge tone={DECISAO[versao.parecer.decisao].tom}>{DECISAO[versao.parecer.decisao].rotulo}</StatusBadge> },
                        { rotulo: "Orientador", valor: versao.parecer.emitidoPorNome },
                        { rotulo: "Decidido em", valor: formatarDataHora(versao.parecer.criadoEm) },
                        { rotulo: "Parecer", valor: versao.parecer.texto ? <span className="whitespace-pre-line">{versao.parecer.texto}</span> : "Sem parecer escrito", largo: true },
                      ]}
                    />
                  </div>
                )}
              </div>
            </Painel>
          ))}
        </div>
      )}
    </div>
  );
}
