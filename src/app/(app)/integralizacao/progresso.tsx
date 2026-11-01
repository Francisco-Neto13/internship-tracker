import type { Integralizacao } from "@/modules/integralizacao/services/integralizacao-service";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { StatusBadge } from "@/shared/ui/status-badge";

// RF057, RN-24: progress of a student against the course requirements, shared by the student's
// page and the coordination's view of the student
export function ProgressoIntegralizacao({ integralizacao }: { integralizacao: Integralizacao }) {
  const { apuracao, progresso } = integralizacao;
  const tom = (situacao: string) => (situacao === "CUMPRIDO" ? "ok" : "pending");
  return (
    <div className="flex flex-col gap-4" data-testid="integralizacao">
      <dl className="surface-card grid gap-3 p-5 text-sm sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <dt className="text-navy-900/60">Estágio obrigatório</dt>
          <dd className="text-navy-900">
            {apuracao.estagioConcluidoMinutos / 60} h de {apuracao.estagioExigidoMinutos / 60} h{" "}
            <StatusBadge tone={tom(progresso.estagio.situacao)}>{progresso.estagio.situacao === "CUMPRIDO" ? "Cumprido" : "Pendente"}</StatusBadge>
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-navy-900/60">Atividades complementares</dt>
          <dd className="text-navy-900">
            {apuracao.atividadesAproveitadoMinutos / 60} h de {apuracao.atividadesExigidoMinutos / 60} h{" "}
            <StatusBadge tone={tom(progresso.atividades.situacao)}>{progresso.atividades.situacao === "CUMPRIDO" ? "Cumprido" : "Pendente"}</StatusBadge>
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-navy-900/60">Situação geral</dt>
          <dd className="text-navy-900">
            <StatusBadge tone={tom(progresso.situacaoGeral)}>{progresso.situacaoGeral === "CUMPRIDO" ? "Integralizado" : "Pendente"}</StatusBadge>
          </dd>
        </div>
      </dl>
      {integralizacao.categorias.length > 0 && (
        <ul className="surface-card flex flex-col divide-y divide-navy-900/10 text-sm">
          {integralizacao.categorias.map((categoria) => (
            <li key={categoria.categoriaId} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-navy-900">
              <span>{categoria.categoriaNome}</span>
              <span className="text-navy-900/70">
                {categoria.aproveitadoMinutos / 60} h de {categoria.limiteMinutos / 60} h {categoria.aproveitadoMinutos >= categoria.limiteMinutos ? "(limite atingido)" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3 text-sm text-navy-900/60">
        {integralizacao.apuradoEm ? `Apurado em ${integralizacao.apuradoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : "Calculado agora (nenhuma apuração registrada ainda)"}
        <BotaoAcao url={`/api/v1/estudantes/${integralizacao.estudanteId}/integralizacao/apuracao`} rotulo="Recalcular" />
      </div>
    </div>
  );
}
