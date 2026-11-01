import { redirect } from "next/navigation";
import { DomainError } from "@/lib/errors";
import { getIdentity } from "@/lib/session";
import { listAtividades, listFilaAnalise } from "@/modules/atividades/services/atividade-service";
import { getMinhaIntegralizacao } from "@/modules/integralizacao/services/integralizacao-service";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";
import { NovaAtividade } from "./nova-atividade";

// RF049 to RF055: the student registers and follows its activities; the coordination analyzes
// the queue, seeing what the approval would count (RF051). Functional screen, refined later.

const SITUACAO: Record<string, [string, StatusTone]> = {
  EM_ANALISE: ["Em análise", "pending"],
  DEVOLVIDA: ["Devolvida", "danger"],
  APROVADA: ["Aprovada", "ok"],
  RECUSADA: ["Recusada", "neutral"],
};

const horas = (minutos: number | null) => (minutos === null ? "-" : `${minutos / 60} h`);

export default async function AtividadesComplementaresPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const [atividades, fila, integralizacao] = await Promise.all([
    listAtividades(identity, {}),
    listFilaAnalise(identity),
    getMinhaIntegralizacao(identity).catch((error: unknown) => {
      if (error instanceof DomainError && error.kind === "NOT_FOUND") return null;
      throw error;
    }),
  ]);
  const minhas = integralizacao ? atividades.filter((atividade) => atividade.estudanteId === integralizacao.estudanteId) : [];

  return (
    <section className="flex flex-col gap-6">
      <PageHeader eyebrow="M06 Atividades Complementares" title="Atividades complementares" description="Cadastro com comprovante, análise e limites por categoria (RF048-RF055)." />

      {integralizacao && (
        <>
          <h2 className="text-sm font-medium text-navy-900/60">Minhas atividades</h2>
          {minhas.length === 0 ? (
            <EstadoVazio variante="vazio" titulo="Nenhuma atividade" descricao="Cadastre a primeira atividade abaixo." />
          ) : (
            <ul className="surface-card flex flex-col divide-y divide-navy-900/10 text-sm" data-testid="minhas-atividades">
              {minhas.map((atividade) => (
                <li key={atividade.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-navy-900">
                  {atividade.descricao} · {atividade.categoriaNome} · declaradas {horas(atividade.horasDeclaradasMinutos)} · aproveitadas{" "}
                  {horas(atividade.horasAproveitadasMinutos)}
                  <StatusBadge tone={SITUACAO[atividade.situacao][1]}>{SITUACAO[atividade.situacao][0]}</StatusBadge>
                  {atividade.situacao === "DEVOLVIDA" && <BotaoAcao url={`/api/v1/atividades-complementares/${atividade.id}/reenvio`} rotulo="Reenviar" />}
                </li>
              ))}
            </ul>
          )}
          {integralizacao.categorias.length > 0 ? (
            <NovaAtividade estudanteId={integralizacao.estudanteId} categorias={integralizacao.categorias.map((categoria) => ({ id: categoria.categoriaId, nome: categoria.categoriaNome ?? categoria.categoriaId }))} />
          ) : (
            <EstadoVazio variante="vazio" titulo="Curso sem categorias" descricao="A coordenação ainda não definiu os limites por categoria do seu curso." />
          )}
        </>
      )}

      {fila.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-navy-900/60">Fila de análise</h2>
          <ul className="surface-card flex flex-col divide-y divide-navy-900/10 text-sm" data-testid="fila-analise">
            {fila.map(({ atividade, previa }) => (
              <li key={atividade.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-navy-900">
                {atividade.estudanteNome ?? atividade.matricula} · {atividade.descricao} · {atividade.categoriaNome} · {horas(atividade.horasDeclaradasMinutos)}
                {previa && previa.excedentesMinutos > 0 && (
                  <StatusBadge tone="danger">{`Aproveitaria ${horas(previa.aproveitadosMinutos)}; ${horas(previa.excedentesMinutos)} excedentes`}</StatusBadge>
                )}
                <BotaoAcao url={`/api/v1/atividades-complementares/${atividade.id}/aprovacao`} rotulo="Aprovar" variante="default" />
                <BotaoAcao url={`/api/v1/atividades-complementares/${atividade.id}/devolucao`} rotulo="Devolver" pedirMotivo={{ campo: "motivo", pergunta: "O que o estudante precisa complementar?" }} />
                <BotaoAcao url={`/api/v1/atividades-complementares/${atividade.id}/recusa`} rotulo="Recusar" variante="destructive" pedirMotivo={{ campo: "motivo", pergunta: "Motivo da recusa" }} />
              </li>
            ))}
          </ul>
        </>
      )}

      {!integralizacao && fila.length === 0 && (
        <EstadoVazio variante="vazio" titulo="Nada para analisar" descricao="Nenhuma atividade aguardando análise no seu recorte." />
      )}
    </section>
  );
}
