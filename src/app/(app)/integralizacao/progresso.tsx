import { formatarDataHora } from "@/lib/datas";
import { minutosParaHoras } from "@/lib/horas";
import type { Integralizacao } from "@/modules/integralizacao/services/integralizacao-service";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { Progresso } from "@/shared/ui/indicador";
import { Painel } from "@/shared/ui/painel";
import { StatusBadge } from "@/shared/ui/status-badge";

// RF057, RN-24: o estudante frente às exigências do curso, compartilhado pela página do próprio
// estudante e pelo perfil que a coordenação consulta. Categorias com o limite atingido ficam
// marcadas: horas novas nelas não contam mais (RN-24).

const h = (valor: number) => `${valor.toLocaleString("pt-BR")} h`;

export function ProgressoIntegralizacao({ integralizacao, podeRecalcular = true }: { integralizacao: Integralizacao; podeRecalcular?: boolean }) {
  const { apuracao, progresso } = integralizacao;
  const integralizado = progresso.situacaoGeral === "CUMPRIDO";
  return (
    <div className="flex flex-col gap-4" data-testid="integralizacao">
      <Painel
        titulo="Exigências do curso"
        descricao={integralizacao.apuradoEm ? `Apurado em ${formatarDataHora(integralizacao.apuradoEm)}` : "Calculado agora: nenhuma apuração registrada ainda"}
        acoes={
          <>
            <StatusBadge tone={integralizado ? "ok" : "pending"}>{integralizado ? "Integralizado" : "Pendente"}</StatusBadge>
            {podeRecalcular && (
              <BotaoAcao url={`/api/v1/estudantes/${integralizacao.estudanteId}/integralizacao/apuracao`} rotulo="Recalcular" tamanho="sm" sucesso="Apuração registrada" />
            )}
          </>
        }
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Progresso
            rotulo="Estágio obrigatório"
            atual={minutosParaHoras(apuracao.estagioConcluidoMinutos)}
            total={minutosParaHoras(apuracao.estagioExigidoMinutos)}
            formatar={h}
            detalhe={
              progresso.estagio.situacao === "CUMPRIDO"
                ? "Carga mínima cumprida"
                : `Faltam ${h(minutosParaHoras(progresso.estagio.pendenteMinutos))}; conta a carga homologada do estágio obrigatório concluído`
            }
          />
          <Progresso
            rotulo="Atividades complementares"
            atual={minutosParaHoras(apuracao.atividadesAproveitadoMinutos)}
            total={minutosParaHoras(apuracao.atividadesExigidoMinutos)}
            formatar={h}
            detalhe={
              progresso.atividades.situacao === "CUMPRIDO"
                ? "Carga exigida cumprida"
                : `Faltam ${h(minutosParaHoras(progresso.atividades.pendenteMinutos))} de atividades aprovadas`
            }
          />
        </div>
      </Painel>
      {integralizacao.categorias.length > 0 && (
        <Painel titulo="Atividades por categoria" descricao="Horas aproveitadas até o limite de cada categoria no curso">
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {integralizacao.categorias.map((categoria) => {
              const atingido = categoria.aproveitadoMinutos >= categoria.limiteMinutos;
              return (
                <li key={categoria.categoriaId}>
                  <Progresso
                    rotulo={categoria.categoriaNome ?? "Categoria"}
                    atual={minutosParaHoras(categoria.aproveitadoMinutos)}
                    total={minutosParaHoras(categoria.limiteMinutos)}
                    formatar={h}
                    detalhe={atingido ? "Limite atingido: novas horas nesta categoria não contam" : undefined}
                  />
                </li>
              );
            })}
          </ul>
        </Painel>
      )}
    </div>
  );
}
