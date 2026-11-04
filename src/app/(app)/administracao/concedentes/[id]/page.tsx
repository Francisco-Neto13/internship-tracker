import { Briefcase, FileSignature, Percent } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { lerConsulta, type SearchParamsBrutos } from "@/lib/consulta";
import { formatarDataCurta, formatarDataHora } from "@/lib/datas";
import { DomainError } from "@/lib/errors";
import { formatarCnpj, SITUACAO_CONCEDENTE, SITUACAO_ESTAGIO } from "@/lib/rotulos";
import { getIdentity } from "@/lib/session";
import { dataLocal } from "@/modules/academico/domain/parametros";
import { getConcedente, listHistoricoSituacao } from "@/modules/concedentes/services/concedente-service";
import { listConveniosDaConcedente } from "@/modules/concedentes/services/convenio-service";
import { getHistoricoConcedente } from "@/modules/estagios/services/estagio-service";
import { Avatar } from "@/shared/ui/avatar";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { Indicador } from "@/shared/ui/indicador";
import { ListaDefinicao, Painel } from "@/shared/ui/painel";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
import { NovoConvenio } from "./novo-convenio";

// RF007-RF014: uma concedente com o que decide se ela pode receber estagiários: situação,
// convênios e suas vigências, histórico de estágios (agregado, sem dado pessoal, RF014) e de
// suspensões. Suspender pede motivo e diz o efeito.

export default async function ConcedentePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParamsBrutos> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const parsed = z.object({ id: z.uuid() }).safeParse(await params);
  if (!parsed.success) notFound();
  const { id } = parsed.data;
  const consulta = lerConsulta(await searchParams);
  const voltar = consulta.voltar?.startsWith("/administracao/concedentes") ? consulta.voltar : "/administracao/concedentes";

  const concedente = await getConcedente(identity, id).catch((error: unknown) => {
    if (error instanceof DomainError && error.kind === "NOT_FOUND") notFound();
    throw error;
  });
  const [convenios, historicoSituacao, historico] = await Promise.all([listConveniosDaConcedente(identity, id), listHistoricoSituacao(identity, id), getHistoricoConcedente(identity, id)]);
  const hoje = dataLocal();
  const vigentes = convenios.filter((convenio) => convenio.vigenteEm(hoje)).length;
  // Vigentes primeiro, depois os de fim mais recente: o que vale hoje fica no topo
  const fim = (convenio: (typeof convenios)[number]) => convenio.vigencias.reduce((maior, vigencia) => (vigencia.vigenciaFim > maior ? vigencia.vigenciaFim : maior), "");
  const ordenados = [...convenios].sort((a, b) => Number(b.vigenteEm(hoje)) - Number(a.vigenteEm(hoje)) || fim(b).localeCompare(fim(a)));
  const situacao = SITUACAO_CONCEDENTE[concedente.situacao];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        voltar={{ href: voltar, rotulo: "Concedentes" }}
        identidade={<Avatar nome={concedente.nomeFantasia ?? concedente.razaoSocial} semente={concedente.id} forma="quadrado" tamanho="xl" />}
        title={concedente.razaoSocial}
        description={concedente.nomeFantasia ?? concedente.areaAtuacao}
        meta={
          <>
            <StatusBadge tone={situacao.tom}>{situacao.rotulo}</StatusBadge>
            <span>
              CNPJ <span className="font-mono text-navy-900">{formatarCnpj(concedente.cnpj)}</span>
            </span>
            <span>
              {concedente.municipio}/{concedente.uf}
            </span>
          </>
        }
        acoes={
          concedente.situacao === "ATIVA" ? (
            <BotaoAcao
              url={`/api/v1/concedentes/${id}/suspensao`}
              rotulo="Suspender"
              variante="destructive"
              pedirMotivo={{ campo: "motivo", pergunta: "Motivo da suspensão" }}
              confirmacao={{
                titulo: "Suspender a concedente?",
                descricao: "Estágios novos desta organização não poderão ser criados nem ativados. Os estágios em andamento continuam válidos.",
                confirmar: "Suspender",
              }}
            />
          ) : (
            <BotaoAcao url={`/api/v1/concedentes/${id}/reativacao`} rotulo="Reativar" confirmacao={{ titulo: "Reativar a concedente?", descricao: "Ela volta a poder receber novos estágios. A reativação fica registrada no histórico da concedente.", confirmar: "Reativar" }} variante="default" sucesso="Concedente reativada" />
          )
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Indicador rotulo="Convênios vigentes" valor={vigentes} contexto={`de ${convenios.length} convênio(s)`} icone={FileSignature} tom={vigentes === 0 ? "atencao" : "neutro"} />
        <Indicador rotulo="Estágios" valor={historico.total} contexto={Object.entries(historico.porSituacao).map(([chave, valor]) => `${valor} ${SITUACAO_ESTAGIO[chave]?.rotulo.toLowerCase() ?? chave}`).join(" · ") || "nenhum ainda"} icone={Briefcase} />
        <Indicador
          rotulo="Taxa de conclusão"
          valor={historico.taxaConclusao === null ? null : Math.round(historico.taxaConclusao * 100)}
          formatar={(valor) => `${valor}%`}
          contexto="concluídos entre os encerrados (RF014)"
          motivoSemValor="Nenhum estágio encerrado ainda"
          icone={Percent}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <Painel titulo="Convênios" descricao="Sem convênio vigente na data de início, o estágio não é ativado (RF010)." flush>
            <ul className="divide-y divide-navy-900/[0.07]" data-testid="convenios">
              {convenios.length === 0 && <li className="px-5 py-4 text-sm text-navy-900/60">Nenhum convênio registrado.</li>}
              {ordenados.map((convenio) => {
                const vigente = convenio.vigenteEm(hoje);
                return (
                  <li key={convenio.id} className="flex flex-col gap-1.5 px-5 py-3 text-sm">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-navy-900">Convênio {convenio.numero}</span>
                      <StatusBadge tone={vigente ? "ok" : "neutral"}>{vigente ? "Vigente" : convenio.situacao === "ATIVO" ? "Fora de vigência" : "Encerrado"}</StatusBadge>
                    </span>
                    <ol className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-navy-900/60">
                      {convenio.vigencias.map((vigencia) => (
                        <li key={vigencia.id ?? vigencia.vigenciaInicio}>
                          {formatarDataCurta(vigencia.vigenciaInicio)} a {formatarDataCurta(vigencia.vigenciaFim)}
                        </li>
                      ))}
                    </ol>
                  </li>
                );
              })}
            </ul>
          </Painel>
          <Painel titulo="Registrar convênio" descricao="Número, primeira vigência e o convênio assinado em PDF, enviado direto ao armazenamento (D8).">
            <NovoConvenio concedenteId={id} />
          </Painel>
        </div>
        <div className="flex flex-col gap-4">
          <Painel titulo="Dados cadastrais">
            <ListaDefinicao
              colunas={1}
              itens={[
                { rotulo: "Endereço", valor: `${concedente.logradouro}, ${concedente.numeroEndereco}${concedente.complemento ? `, ${concedente.complemento}` : ""} · ${concedente.bairro} · CEP ${concedente.cep}` },
                { rotulo: "Contato", valor: [concedente.emailContato, concedente.telefoneContato].filter(Boolean).join(" · ") },
                { rotulo: "Representante legal", valor: [concedente.representanteLegalNome, concedente.representanteLegalCargo].filter(Boolean).join(", ") },
                { rotulo: "Área de atuação", valor: concedente.areaAtuacao },
              ]}
            />
            <details className="mt-4 border-t border-navy-900/[0.07] pt-4">
              <summary className="cursor-pointer text-sm font-medium text-azul-500 hover:text-navy-700">Editar dados</summary>
              <div className="mt-4">
                <FormularioApi
                  url={`/api/v1/concedentes/${id}`}
                  metodo="PATCH"
                  rotuloEnviar="Salvar dados"
                  embutido
                  sucesso="Dados atualizados"
                  campos={[
                    { nome: "razao_social", rotulo: "Razão social", valorInicial: concedente.razaoSocial },
                    { nome: "nome_fantasia", rotulo: "Nome fantasia", valorInicial: concedente.nomeFantasia, vazioComoNulo: true },
                    { nome: "email_contato", rotulo: "E-mail de contato", tipo: "email", valorInicial: concedente.emailContato },
                    { nome: "telefone_contato", rotulo: "Telefone", valorInicial: concedente.telefoneContato, vazioComoNulo: true },
                    { nome: "representante_legal_nome", rotulo: "Representante legal", valorInicial: concedente.representanteLegalNome },
                    { nome: "area_atuacao", rotulo: "Área de atuação", valorInicial: concedente.areaAtuacao },
                  ]}
                />
              </div>
            </details>
          </Painel>
          {historicoSituacao.length > 0 && (
            <Painel titulo="Histórico de situação" flush>
              <ol className="divide-y divide-navy-900/[0.07]">
                {historicoSituacao.map((item) => (
                  <li key={item.id} className="flex flex-col gap-0.5 px-5 py-3 text-sm">
                    <span className="flex items-center gap-2">
                      <StatusBadge tone={SITUACAO_CONCEDENTE[item.situacaoNova]?.tom ?? "neutral"}>{SITUACAO_CONCEDENTE[item.situacaoNova]?.rotulo ?? item.situacaoNova}</StatusBadge>
                      <span className="text-xs text-navy-900/60">{formatarDataHora(item.criadoEm)}</span>
                    </span>
                    <span className="text-navy-900/75">
                      {item.decididoPorNome ?? "—"}
                      {item.motivo && ` · ${item.motivo}`}
                    </span>
                  </li>
                ))}
              </ol>
            </Painel>
          )}
        </div>
      </div>
    </div>
  );
}
