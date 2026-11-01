import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { DomainError } from "@/lib/errors";
import { getIdentity } from "@/lib/session";
import { dataLocal } from "@/modules/academico/domain/parametros";
import { getConcedente, listHistoricoSituacao } from "@/modules/concedentes/services/concedente-service";
import { listConveniosDaConcedente } from "@/modules/concedentes/services/convenio-service";
import { getHistoricoConcedente } from "@/modules/estagios/services/estagio-service";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
import { NovoConvenio } from "./novo-convenio";

// RF007 to RF014 for one concedente: data, situation, agreements and internship history
export default async function ConcedentePage({ params }: { params: Promise<{ id: string }> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const parsed = z.object({ id: z.uuid() }).safeParse(await params);
  if (!parsed.success) notFound();
  const { id } = parsed.data;

  const concedente = await getConcedente(identity, id).catch((error: unknown) => {
    if (error instanceof DomainError && error.kind === "NOT_FOUND") notFound();
    throw error;
  });
  const [convenios, historicoSituacao, historico] = await Promise.all([
    listConveniosDaConcedente(identity, id),
    listHistoricoSituacao(identity, id),
    getHistoricoConcedente(identity, id),
  ]);
  const hoje = dataLocal();

  return (
    <section className="flex flex-col gap-6">
      <PageHeader eyebrow="M03 Concedentes e Convênios" title={concedente.razaoSocial} description={`CNPJ ${concedente.cnpj}`} />
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge tone={concedente.situacao === "ATIVA" ? "ok" : "danger"}>{concedente.situacao}</StatusBadge>
        {concedente.situacao === "ATIVA" ? (
          <BotaoAcao url={`/api/v1/concedentes/${id}/suspensao`} rotulo="Suspender" variante="destructive" pedirMotivo={{ campo: "motivo", pergunta: "Motivo da suspensão" }} />
        ) : (
          <BotaoAcao url={`/api/v1/concedentes/${id}/reativacao`} rotulo="Reativar" />
        )}
        <span className="text-sm text-navy-900/60">
          {historico.total} estágio(s)
          {historico.taxaConclusao !== null && ` · conclusão ${(historico.taxaConclusao * 100).toFixed(0)}%`}
        </span>
      </div>

      <FormularioApi
        url={`/api/v1/concedentes/${id}`}
        metodo="PATCH"
        rotuloEnviar="Salvar dados"
        campos={[
          { nome: "razao_social", rotulo: "Razão social", valorInicial: concedente.razaoSocial },
          { nome: "nome_fantasia", rotulo: "Nome fantasia", valorInicial: concedente.nomeFantasia, vazioComoNulo: true },
          { nome: "email_contato", rotulo: "E-mail de contato", tipo: "email", valorInicial: concedente.emailContato },
          { nome: "telefone_contato", rotulo: "Telefone", valorInicial: concedente.telefoneContato, vazioComoNulo: true },
          { nome: "representante_legal_nome", rotulo: "Representante legal", valorInicial: concedente.representanteLegalNome },
          { nome: "area_atuacao", rotulo: "Área de atuação", valorInicial: concedente.areaAtuacao },
        ]}
      />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-navy-900/60">Convênios</h2>
        <ul className="surface-card flex flex-col divide-y divide-navy-900/10" data-testid="convenios">
          {convenios.length === 0 && <li className="px-5 py-3 text-sm text-navy-900/60">Nenhum convênio visível.</li>}
          {convenios.map((convenio) => (
            <li key={convenio.id} className="flex flex-col gap-1 px-5 py-3 text-sm text-navy-900">
              <span className="flex flex-wrap items-center gap-2">
                <strong>{convenio.numero}</strong>
                <StatusBadge tone={convenio.vigenteEm(hoje) ? "ok" : "neutral"}>{convenio.vigenteEm(hoje) ? "Vigente" : convenio.situacao}</StatusBadge>
              </span>
              <span className="text-navy-900/60">
                {convenio.vigencias.map((v) => `${v.vigenciaInicio} a ${v.vigenciaFim}`).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
        <NovoConvenio concedenteId={id} />
      </div>

      {historicoSituacao.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-navy-900/60">Histórico de situação</h2>
          <ul className="surface-card flex flex-col divide-y divide-navy-900/10">
            {historicoSituacao.map((item) => (
              <li key={item.id} className="px-5 py-3 text-sm text-navy-900">
                {item.situacaoNova} · {item.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {item.decididoPorNome}
                {item.motivo && ` · ${item.motivo}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
