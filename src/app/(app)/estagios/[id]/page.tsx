import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { DomainError } from "@/lib/errors";
import { getIdentity } from "@/lib/session";
import { getEstagioDetalhado } from "@/modules/estagios/services/estagio-service";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

// One internship: TCE, formalization steps (D9) and the actions of each step. Every button
// calls the API, which decides by profile and link (RLS) and by life cycle; refused actions
// show the API message. Functional screen, refined later.

const SITUACAO: Record<string, string> = { EM_FORMALIZACAO: "Em formalização", ATIVO: "Ativo", CONCLUIDO: "Concluído", RESCINDIDO: "Rescindido" };

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-navy-900/60">{titulo}</h2>
      {children}
    </div>
  );
}

export default async function EstagioPage({ params }: { params: Promise<{ id: string }> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const parsed = z.object({ id: z.uuid() }).safeParse(await params);
  if (!parsed.success) notFound();
  const { id } = parsed.data;

  const detalhe = await getEstagioDetalhado(identity, id).catch((error: unknown) => {
    if (error instanceof DomainError && error.kind === "NOT_FOUND") notFound();
    throw error;
  });
  const { estagio, etapas } = detalhe;
  const emFormalizacao = estagio.situacao === "EM_FORMALIZACAO";
  const planoAtual = detalhe.planos[0];
  const api = `/api/v1/estagios/${id}`;

  return (
    <section className="flex flex-col gap-6">
      <PageHeader eyebrow="M04 Gestão de Estágios" title={`Estágio ${estagio.dataInicio} a ${estagio.dataFimPrevista}`} description={estagio.condicoesPactuadas} />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <StatusBadge tone={estagio.situacao === "ATIVO" ? "ok" : "pending"}>{SITUACAO[estagio.situacao]}</StatusBadge>
        <span className="text-navy-900/70">
          {estagio.tipo === "OBRIGATORIO" ? "Obrigatório" : "Não obrigatório"} · {estagio.cargaDiariaMinutos / 60} h/dia ·{" "}
          {estagio.cargaSemanalMinutos / 60} h/semana · {estagio.cargaTotalMinutos / 60} h no total
        </span>
        {estagio.dispensaDuracaoMaxima && <StatusBadge tone="neutral">Dispensa do limite de 2 anos (art. 11)</StatusBadge>}
      </div>

      {emFormalizacao && (
        <Bloco titulo="Formalização">
          <p className="text-sm text-navy-900/70" data-testid="etapas-formalizacao">
            TCE {etapas.tce === "FECHADO" ? "fechado para assinatura" : "em edição"} · assinaturas pendentes:{" "}
            {etapas.partesPendentes.length === 0 ? "nenhuma" : etapas.partesPendentes.join(", ")}
          </p>
          <div className="flex flex-wrap gap-3">
            {etapas.tce === "EM_EDICAO" ? (
              <BotaoAcao url={`${api}/tce/fechamento`} rotulo="Fechar TCE para assinatura" />
            ) : (
              <>
                <BotaoAcao url={`${api}/tce/reabertura`} rotulo="Reabrir TCE" pedirMotivo={{ campo: "justificativa", pergunta: "Justificativa da reabertura" }} />
                {etapas.partesPendentes.map((parte) => (
                  <BotaoAcao key={parte} url={`${api}/assinaturas`} rotulo={`Assinar como ${parte}`} corpo={{ parte }} />
                ))}
              </>
            )}
            <BotaoAcao url={`${api}/ativacao`} rotulo="Ativar estágio" variante="default" />
          </div>
        </Bloco>
      )}

      <Bloco titulo="Responsáveis">
        <ul className="surface-card flex flex-col divide-y divide-navy-900/10 text-sm">
          {detalhe.responsaveis.length === 0 && <li className="px-5 py-3 text-navy-900/60">Nenhum responsável vinculado.</li>}
          {detalhe.responsaveis.map((r) => (
            <li key={r.id} className="px-5 py-3 text-navy-900">
              {r.papel} · {r.usuarioNome ?? r.usuarioId} · desde {r.vigenciaInicio}
              {r.vigenciaFim && (r.vigenciaFim === r.vigenciaInicio ? " · designação anulada" : ` até ${r.vigenciaFim}`)}
            </li>
          ))}
        </ul>
        {emFormalizacao && (
          <FormularioApi
            url={`${api}/responsaveis`}
            rotuloEnviar="Vincular responsável"
            campos={[
              { nome: "papel", rotulo: "Papel", tipo: "select", obrigatorio: true, opcoes: [{ valor: "ORIENTADOR", rotulo: "Orientador" }, { valor: "SUPERVISOR", rotulo: "Supervisor" }] },
              { nome: "usuario_id", rotulo: "Id do usuário (veja em Administração > Usuários)" },
            ]}
          />
        )}
      </Bloco>

      <Bloco titulo="Plano de atividades">
        {planoAtual ? (
          <div className="surface-card flex flex-col gap-2 p-5 text-sm text-navy-900">
            <span>
              Versão {planoAtual.versao} · {planoAtual.situacao}
              {planoAtual.parecer && ` · parecer: ${planoAtual.parecer}`}
            </span>
            <p className="whitespace-pre-line text-navy-900/80">{planoAtual.atividadesPrevistas}</p>
            <div className="flex flex-wrap gap-3">
              {planoAtual.situacao === "RASCUNHO" && <BotaoAcao url={`${api}/plano-atividades/envio`} rotulo="Enviar ao orientador" />}
              {planoAtual.situacao === "AGUARDANDO_APROVACAO" && (
                <>
                  <BotaoAcao url={`${api}/plano-atividades/aprovacao`} rotulo="Aprovar (orientador)" variante="default" />
                  <BotaoAcao url={`${api}/plano-atividades/devolucao`} rotulo="Devolver (orientador)" pedirMotivo={{ campo: "parecer", pergunta: "Parecer da devolução" }} />
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-navy-900/60">Nenhum plano registrado.</p>
        )}
        <FormularioApi
          url={`${api}/plano-atividades`}
          metodo="PUT"
          rotuloEnviar="Salvar plano"
          campos={[
            { nome: "atividades_previstas", rotulo: "Atividades previstas", tipo: "textarea", valorInicial: planoAtual?.situacao === "RASCUNHO" ? planoAtual.atividadesPrevistas : "" },
            {
              nome: "justificativa_compatibilidade",
              rotulo: "Compatibilidade com o curso",
              tipo: "textarea",
              valorInicial: planoAtual?.situacao === "RASCUNHO" ? planoAtual.justificativaCompatibilidade : "",
            },
          ]}
        />
      </Bloco>

      <Bloco titulo="Apólice de seguro">
        <ul className="surface-card flex flex-col divide-y divide-navy-900/10 text-sm">
          {detalhe.apolices.length === 0 && <li className="px-5 py-3 text-navy-900/60">Nenhuma apólice registrada.</li>}
          {detalhe.apolices.map((a) => (
            <li key={a.id} className="px-5 py-3 text-navy-900">
              {a.seguradora} · {a.numeroApolice} · {a.vigenciaInicio} a {a.vigenciaFim} · contratante {a.contratante}
            </li>
          ))}
        </ul>
        <FormularioApi
          url={`${api}/apolices`}
          rotuloEnviar="Registrar apólice"
          campos={[
            { nome: "seguradora", rotulo: "Seguradora" },
            { nome: "numero_apolice", rotulo: "Número" },
            { nome: "contratante", rotulo: "Contratante", tipo: "select", obrigatorio: true, opcoes: [{ valor: "CONCEDENTE", rotulo: "Concedente" }, { valor: "INSTITUICAO", rotulo: "Instituição" }] },
            { nome: "vigencia_inicio", rotulo: "Início", tipo: "date" },
            { nome: "vigencia_fim", rotulo: "Fim", tipo: "date" },
          ]}
        />
      </Bloco>

      {detalhe.assinaturas.length > 0 && (
        <Bloco titulo="Assinaturas">
          <ul className="surface-card flex flex-col divide-y divide-navy-900/10 text-sm" data-testid="assinaturas">
            {detalhe.assinaturas.map((a) => (
              <li key={a.id} className="px-5 py-3 text-navy-900">
                {a.aditivoId ? "Aditivo" : "TCE"} · {a.parte} · {a.signatarioNome} · {a.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                {a.hashDocumento !== estagio.hashTce && !a.aditivoId && " · sobre versão anterior do TCE"}
              </li>
            ))}
          </ul>
        </Bloco>
      )}

      {estagio.situacao === "ATIVO" && (
        <Bloco titulo="Aditivos">
          <ul className="surface-card flex flex-col divide-y divide-navy-900/10 text-sm">
            {detalhe.aditivos.length === 0 && <li className="px-5 py-3 text-navy-900/60">Nenhum aditivo.</li>}
            {detalhe.aditivos.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-navy-900">
                Nº {a.numero} · {a.tipo} · {a.situacao}
                {a.situacao === "AGUARDANDO_ASSINATURAS" &&
                  (["ESTUDANTE", "INSTITUICAO", "CONCEDENTE"] as const).map((parte) => (
                    <BotaoAcao key={parte} url={`/api/v1/aditivos/${a.id}/assinaturas`} rotulo={`Assinar como ${parte}`} corpo={{ parte }} />
                  ))}
              </li>
            ))}
          </ul>
          <FormularioApi
            url={`${api}/aditivos`}
            rotuloEnviar="Propor prorrogação"
            extras={{ tipo: "PRORROGACAO" }}
            campos={[
              { nome: "nova_data_fim_pactuada", rotulo: "Novo término", tipo: "date" },
              { nome: "justificativa", rotulo: "Justificativa", tipo: "textarea" },
            ]}
          />
        </Bloco>
      )}
    </section>
  );
}
