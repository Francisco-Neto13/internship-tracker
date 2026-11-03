import { AlertTriangle, Award, Building2, CalendarClock, ClipboardCheck, FileClock, FileSignature, FileText, GraduationCap, Hourglass, Scale, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { dataPorExtenso, formatarData, formatarDataCurta, haQuantoTempo, prazoEmPalavras, saudacao } from "@/lib/datas";
import { minutosParaHoras } from "@/lib/horas";
import { descreverOperacao, humanizarCodigos, identificarEstagio } from "@/lib/rotulos";
import { getIdentity, getSession } from "@/lib/session";
import { ROTULO_PERFIL, type Perfil } from "@/modules/acesso/schemas/perfil";
import { listPerfisVigentes } from "@/modules/acesso/services/perfil-service";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { Indicador, Progresso } from "@/shared/ui/indicador";
import { Painel } from "@/shared/ui/painel";
import { StatusBadge } from "@/shared/ui/status-badge";
import { DistribuicaoEstagios, LinhaCompacta, ListaCompacta } from "./componentes";
import {
  dadosAdministrador,
  dadosConcedente,
  dadosCoordenacao,
  dadosEstudante,
  dadosOrientador,
  dadosSupervisor,
  notificacoesRecentes,
} from "./dados";

// Painel por perfil (REQUISITOSEREGRAS §8.3 e ENDPOINTS §10): primeiro o que pede ação, depois
// a situação da operação, depois o que aconteceu. Quem tem mais de um perfil vê um bloco por
// perfil, na ordem em que as tarefas costumam ser mais urgentes. Nenhum número é estimado: o que
// o sistema não mede (tendências, médias de outro período) simplesmente não aparece.

const horas = (minutos: number) => `${minutosParaHoras(minutos).toLocaleString("pt-BR")} h`;
const rotuloRelatorio = (relatorio: { tipo: string; sequencia: number }) => (relatorio.tipo === "FINAL" ? "Relatório final" : `Relatório parcial nº ${relatorio.sequencia}`);
const ORDEM: Perfil[] = ["ESTUDANTE", "COORDENACAO", "PROFESSOR_ORIENTADOR", "SUPERVISOR", "CONCEDENTE", "ADMINISTRADOR"];

async function BlocoCoordenacao({ identity }: { identity: Parameters<typeof dadosCoordenacao>[0] }) {
  const dados = await dadosCoordenacao(identity);
  const encerrados = dados.encerrados;
  const taxa = encerrados && encerrados.concluidos + encerrados.rescindidos > 0 ? (encerrados.concluidos / (encerrados.concluidos + encerrados.rescindidos)) * 100 : null;
  return (
    <section aria-labelledby="titulo-coordenacao" className="flex flex-col gap-4">
      <h2 id="titulo-coordenacao" className="text-sm font-semibold text-navy-900/70">
        Coordenação · o que pede atenção
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Indicador
          rotulo="Atividades a analisar"
          valor={dados.fila?.length ?? null}
          contexto="aguardando a sua decisão"
          motivoSemValor="A fila não pôde ser carregada"
          href="/atividades-complementares"
          icone={Award}
          tom="atencao"
        />
        <Indicador
          rotulo="Relatórios pendentes"
          valor={dados.relatorios?.length ?? null}
          contexto={dados.relatorios ? `${dados.relatorios.filter((relatorio) => relatorio.emAtraso).length} em atraso` : undefined}
          motivoSemValor="Os relatórios não puderam ser carregados"
          href="/relatorios"
          icone={FileClock}
          tom="atencao"
        />
        <Indicador
          rotulo="Divergências de carga"
          valor={dados.divergentes?.length ?? null}
          contexto="além da tolerância, até ontem"
          href="/frequencia"
          icone={Scale}
          tom="atencao"
        />
        <Indicador
          rotulo="Em formalização"
          valor={dados.situacoes.EM_FORMALIZACAO}
          contexto="TCE, plano ou assinaturas pendentes"
          href="/estagios?situacao=EM_FORMALIZACAO"
          icone={FileSignature}
          tom="atencao"
        />
        <Indicador
          rotulo="Convênios a vencer"
          valor={dados.convenios?.length ?? null}
          contexto="nos próximos 30 dias"
          href="/administracao/convenios"
          icone={CalendarClock}
          tom="atencao"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Painel titulo="Estágios" descricao="Por situação, em todos os cursos que você coordena" className="xl:col-span-2" verTodos={{ href: "/estagios" }}>
          <DistribuicaoEstagios contagens={dados.situacoes} />
        </Painel>
        <Painel titulo="Formação" descricao="Estudantes matriculados nos seus cursos">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Link href="/administracao/estudantes?situacao=MATRICULADO" className="rounded-lg bg-nevoa-50 p-3 transition-colors hover:bg-nevoa-100">
                <p className="text-xs text-navy-900/60">Matriculados</p>
                <p className="text-xl font-semibold text-navy-900 tabular-nums">{dados.estudantesMatriculados?.toLocaleString("pt-BR") ?? "—"}</p>
              </Link>
              <Link href="/administracao/relatorios-gerenciais?tipo=pendencias-integralizacao" className="rounded-lg bg-nevoa-50 p-3 transition-colors hover:bg-nevoa-100">
                <p className="text-xs text-navy-900/60">Com integralização pendente</p>
                <p className="text-xl font-semibold text-navy-900 tabular-nums">{dados.pendenciasIntegralizacao?.toLocaleString("pt-BR") ?? "—"}</p>
              </Link>
            </div>
            <div className="border-t border-navy-900/[0.07] pt-4">
              <p className="text-xs text-navy-900/60">Taxa de conclusão nos últimos 12 meses</p>
              {taxa === null ? (
                <p className="mt-1 text-sm text-navy-900/60">Nenhum estágio encerrado no período.</p>
              ) : (
                <>
                  <p className="mt-1 text-xl font-semibold text-navy-900 tabular-nums">{taxa.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</p>
                  <p className="text-xs text-navy-900/60">
                    {encerrados!.concluidos} concluídos, {encerrados!.rescindidos} rescindidos
                  </p>
                </>
              )}
            </div>
          </div>
        </Painel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Painel titulo="Fila de análise" descricao="Atividades complementares, as mais antigas primeiro" flush verTodos={{ href: "/atividades-complementares" }}>
          <ListaCompacta vazio="Nenhuma atividade aguardando análise.">
            {(dados.fila ?? []).slice(0, 5).map(({ atividade }) => (
              <LinhaCompacta
                key={atividade.id}
                href="/atividades-complementares"
                avatar={{ nome: atividade.estudanteNome ?? null, semente: atividade.estudanteId }}
                titulo={atividade.descricao}
                subtitulo={`${atividade.estudanteNome ?? "Estudante"} · ${atividade.categoriaNome ?? ""}`}
                lateral={
                  <>
                    <span className="block font-medium text-navy-900 tabular-nums">{horas(atividade.horasDeclaradasMinutos)}</span>
                    {atividade.enviadaEm ? haQuantoTempo(atividade.enviadaEm) : null}
                  </>
                }
              />
            ))}
          </ListaCompacta>
        </Painel>
        <Painel titulo="Relatórios pendentes" descricao="Em análise ou com o período já encerrado, por prazo" flush verTodos={{ href: "/relatorios" }}>
          <ListaCompacta vazio="Nenhum relatório pendente ou em análise.">
            {(dados.relatorios ?? []).slice(0, 5).map((relatorio) => (
              <LinhaCompacta
                key={relatorio.id}
                href={`/estagios/${relatorio.estagioId}`}
                avatar={{ nome: relatorio.estudanteNome, semente: relatorio.estagioId }}
                titulo={relatorio.estudanteNome ?? "Estudante"}
                subtitulo={rotuloRelatorio(relatorio)}
                lateral={
                  relatorio.emAtraso ? (
                    <StatusBadge tone="danger">Em atraso</StatusBadge>
                  ) : relatorio.situacao === "EM_ANALISE" ? (
                    <StatusBadge tone="pending">Com o orientador</StatusBadge>
                  ) : (
                    <>prazo {prazoEmPalavras(relatorio.prazoEntrega, dados.hoje)}</>
                  )
                }
              />
            ))}
          </ListaCompacta>
        </Painel>
      </div>

      {(dados.convenios?.length ?? 0) > 0 && (
        <Painel titulo="Convênios a vencer" descricao="Sem renovação, os estágios novos dessas concedentes não podem ser ativados (RF010)" flush verTodos={{ href: "/administracao/convenios" }}>
          <ListaCompacta vazio="">
            {dados.convenios!.map((convenio) => (
              <LinhaCompacta
                key={convenio.id}
                href={`/administracao/concedentes/${convenio.concedenteId}`}
                avatar={{ nome: convenio.concedenteRazaoSocial, semente: convenio.concedenteId, forma: "quadrado" }}
                titulo={convenio.concedenteRazaoSocial}
                subtitulo={`Convênio ${convenio.numero}`}
                lateral={<>vence {prazoEmPalavras(convenio.vigenciaFim, dados.hoje)}</>}
              />
            ))}
          </ListaCompacta>
        </Painel>
      )}
    </section>
  );
}

async function BlocoOrientador({ identity }: { identity: Parameters<typeof dadosOrientador>[0] }) {
  const dados = await dadosOrientador(identity);
  return (
    <section aria-labelledby="titulo-orientador" className="flex flex-col gap-4">
      <h2 id="titulo-orientador" className="text-sm font-semibold text-navy-900/70">
        Orientação
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Indicador rotulo="Relatórios para analisar" valor={dados.paraAnalisar?.length ?? null} contexto="enviados pelos estagiários" href="/relatorios" icone={FileText} tom="atencao" />
        <Indicador rotulo="Divergências de carga" valor={dados.divergentes?.length ?? null} contexto="casos para o seu parecer" href="/frequencia" icone={Scale} tom="atencao" />
        <Indicador rotulo="Estágios orientados" valor={dados.ativos?.total ?? null} contexto="ativos hoje" href="/estagios?situacao=ATIVO" icone={GraduationCap} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Painel titulo="Relatórios para analisar" flush verTodos={{ href: "/relatorios" }}>
          <ListaCompacta vazio="Nenhum relatório aguardando a sua análise.">
            {(dados.paraAnalisar ?? []).slice(0, 6).map((relatorio) => (
              <LinhaCompacta
                key={relatorio.id}
                href={`/estagios/${relatorio.estagioId}`}
                avatar={{ nome: relatorio.estudanteNome, semente: relatorio.estagioId }}
                titulo={relatorio.estudanteNome ?? "Estudante"}
                subtitulo={rotuloRelatorio(relatorio)}
                lateral={relatorio.emAtraso ? <StatusBadge tone="danger">Enviado com atraso</StatusBadge> : <>prazo {formatarData(relatorio.prazoEntrega)}</>}
              />
            ))}
          </ListaCompacta>
        </Painel>
        <Painel titulo="Estagiários" descricao={(dados.ativos?.items ?? []).some((estagio) => !estagio.estudanteNome) ? "O nome do estudante não é visível para o seu perfil." : "Estágios ativos que você orienta"} flush verTodos={{ href: "/estagios?situacao=ATIVO" }}>
          <ListaCompacta vazio="Nenhum estágio ativo sob a sua orientação.">
            {(dados.ativos?.items ?? []).map((estagio) => (
              <LinhaCompacta
                key={estagio.id}
                href={`/estagios/${estagio.id}`}
                avatar={{ nome: estagio.estudanteNome, semente: estagio.estudanteId }}
                titulo={identificarEstagio(estagio)}
                subtitulo={estagio.concedenteRazaoSocial ?? undefined}
                lateral={<>até {formatarDataCurta(estagio.dataFimPrevista)}</>}
              />
            ))}
          </ListaCompacta>
        </Painel>
      </div>
    </section>
  );
}

async function BlocoSupervisor({ identity }: { identity: Parameters<typeof dadosSupervisor>[0] }) {
  const dados = await dadosSupervisor(identity);
  const comPendencia = (dados.cargas ?? []).filter(({ carga }) => (carga?.resumo.minutosPendentes ?? 0) > 0);
  return (
    <section aria-labelledby="titulo-supervisor" className="flex flex-col gap-4">
      <h2 id="titulo-supervisor" className="text-sm font-semibold text-navy-900/70">
        Supervisão
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Indicador rotulo="Estagiários ativos" valor={dados.ativos?.total ?? null} contexto="sob a sua supervisão" href="/estagios?situacao=ATIVO" icone={Users} />
        <Indicador
          rotulo="Com horas a homologar"
          valor={dados.cargas ? comPendencia.length : null}
          contexto="lançamentos aguardando a sua homologação"
          href="/frequencia"
          icone={ClipboardCheck}
          tom="atencao"
        />
      </div>
      <Painel titulo="Horas a homologar" descricao="Por estagiário (RF027)" flush verTodos={{ href: "/frequencia" }}>
        <ListaCompacta vazio="Nenhum lançamento aguardando homologação.">
          {comPendencia.map(({ estagio, carga }) => (
            <LinhaCompacta
              key={estagio.id}
              href={`/estagios/${estagio.id}`}
              avatar={{ nome: estagio.estudanteNome, semente: estagio.estudanteId }}
              titulo={identificarEstagio(estagio)}
              subtitulo={`${horas(carga!.resumo.minutosHomologados)} homologadas de ${horas(carga!.resumo.cargaTotalMinutos)}`}
              lateral={<span className="font-medium text-status-pending-text tabular-nums">{horas(carga!.resumo.minutosPendentes)} a homologar</span>}
            />
          ))}
        </ListaCompacta>
      </Painel>
    </section>
  );
}

async function BlocoConcedente({ identity }: { identity: Parameters<typeof dadosConcedente>[0] }) {
  const dados = await dadosConcedente(identity);
  return (
    <section aria-labelledby="titulo-concedente" className="flex flex-col gap-4">
      <h2 id="titulo-concedente" className="text-sm font-semibold text-navy-900/70">
        Concedente
      </h2>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Painel titulo="Estágios na sua organização" className="xl:col-span-2" verTodos={{ href: "/estagios" }}>
          <DistribuicaoEstagios contagens={dados.situacoes} />
        </Painel>
        <Painel titulo="Estagiários ativos" flush>
          <ListaCompacta vazio="Nenhum estagiário ativo.">
            {(dados.ativos?.items ?? []).map((estagio) => (
              <LinhaCompacta
                key={estagio.id}
                href={`/estagios/${estagio.id}`}
                avatar={{ nome: estagio.estudanteNome, semente: estagio.estudanteId }}
                titulo={identificarEstagio(estagio)}
                subtitulo={`até ${formatarDataCurta(estagio.dataFimPrevista)}`}
              />
            ))}
          </ListaCompacta>
        </Painel>
      </div>
    </section>
  );
}

async function BlocoEstudante({ identity }: { identity: Parameters<typeof dadosEstudante>[0] }) {
  const dados = await dadosEstudante(identity);
  const { atual, carga, integralizacao } = dados;
  const proximos = (dados.relatorios ?? []).filter((relatorio) => relatorio.situacao === "PENDENTE" || relatorio.situacao === "DEVOLVIDO").slice(0, 3);
  const atividades = dados.atividades ?? [];
  const contar = (situacao: string) => atividades.filter((atividade) => atividade.situacao === situacao).length;

  return (
    <section aria-labelledby="titulo-estudante" className="flex flex-col gap-4">
      <h2 id="titulo-estudante" className="sr-only">
        Meu estágio e minha formação
      </h2>
      {atual ? (
        <Painel
          titulo={atual.situacao === "ATIVO" ? "Meu estágio" : "Estágio em formalização"}
          descricao={`${atual.concedenteRazaoSocial ?? "Concedente"} · ${formatarDataCurta(atual.dataInicio)} a ${formatarDataCurta(atual.dataFimPrevista)}`}
          verTodos={{ href: `/estagios/${atual.id}`, rotulo: "Abrir estágio" }}
        >
          {carga ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="flex flex-col gap-4">
                <Progresso
                  rotulo="Carga horária homologada"
                  atual={minutosParaHoras(carga.resumo.minutosHomologados)}
                  total={minutosParaHoras(carga.resumo.cargaTotalMinutos)}
                  formatar={(valor) => `${valor.toLocaleString("pt-BR")} h`}
                  detalhe={
                    carga.resumo.minutosPendentes > 0
                      ? `${horas(carga.resumo.minutosPendentes)} lançadas aguardam a homologação do supervisor`
                      : "Nenhum lançamento aguardando homologação"
                  }
                />
                {carga.divergencia.divergente && (
                  <p className="flex items-start gap-2 rounded-lg bg-status-pending-bg px-3 py-2 text-sm text-status-pending-text">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                    Suas horas estão {carga.divergencia.minutosCumpridos < carga.divergencia.minutosPrevistos ? "abaixo" : "acima"} do previsto para o período (
                    {horas(carga.divergencia.minutosCumpridos)} de {horas(carga.divergencia.minutosPrevistos)}).
                  </p>
                )}
                <Link href="/frequencia" className="w-fit text-sm font-medium text-azul-500 hover:text-navy-700">
                  Registrar frequência →
                </Link>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-navy-900/60">Próximos relatórios</p>
                {proximos.length === 0 ? (
                  <p className="text-sm text-navy-900/60">Nenhum relatório pendente agora.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {proximos.map((relatorio) => (
                      <li key={relatorio.id} className="flex items-center justify-between gap-3 rounded-lg bg-nevoa-50 px-3 py-2 text-sm">
                        <span className="text-navy-900">{rotuloRelatorio(relatorio)}</span>
                        {relatorio.emAtraso ? (
                          <StatusBadge tone="danger">Em atraso</StatusBadge>
                        ) : relatorio.situacao === "DEVOLVIDO" ? (
                          <StatusBadge tone="pending">Devolvido</StatusBadge>
                        ) : (
                          <span className="text-xs text-navy-900/60">prazo {prazoEmPalavras(relatorio.prazoEntrega, dados.hoje)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-navy-900/65">
              O estágio ainda está em formalização: TCE, plano de atividades e assinaturas acontecem na página do estágio. A frequência começa depois da ativação.
            </p>
          )}
        </Painel>
      ) : (
        <EstadoVazio
          titulo="Você ainda não tem estágio em andamento"
          descricao="Quando a coordenação cadastrar o seu Termo de Compromisso, ele aparece aqui e na página de Estágios para você acompanhar a formalização."
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Painel titulo="Integralização curricular" verTodos={{ href: "/integralizacao", rotulo: "Ver detalhes" }}>
          {integralizacao ? (
            <div className="flex flex-col gap-5">
              <Progresso
                rotulo="Estágio obrigatório"
                atual={minutosParaHoras(integralizacao.apuracao.estagioConcluidoMinutos)}
                total={minutosParaHoras(integralizacao.apuracao.estagioExigidoMinutos)}
                formatar={(valor) => `${valor.toLocaleString("pt-BR")} h`}
                detalhe="Conta quando o estágio obrigatório é concluído"
              />
              <Progresso
                rotulo="Atividades complementares"
                atual={minutosParaHoras(integralizacao.apuracao.atividadesAproveitadoMinutos)}
                total={minutosParaHoras(integralizacao.apuracao.atividadesExigidoMinutos)}
                formatar={(valor) => `${valor.toLocaleString("pt-BR")} h`}
              />
            </div>
          ) : (
            <p className="text-sm text-navy-900/60">A integralização não pôde ser carregada agora.</p>
          )}
        </Painel>
        <Painel titulo="Atividades complementares" verTodos={{ href: "/atividades-complementares" }}>
          <div className="grid grid-cols-3 gap-3">
            {[
              { rotulo: "Em análise", valor: contar("EM_ANALISE") },
              { rotulo: "Devolvidas", valor: contar("DEVOLVIDA"), atencao: true },
              { rotulo: "Aprovadas", valor: contar("APROVADA") },
            ].map((item) => (
              <div key={item.rotulo} className="rounded-lg bg-nevoa-50 p-3">
                <p className="text-xs text-navy-900/60">{item.rotulo}</p>
                <p className={`text-xl font-semibold tabular-nums ${item.atencao && item.valor > 0 ? "text-status-pending-text" : "text-navy-900"}`}>{item.valor}</p>
              </div>
            ))}
          </div>
          {contar("DEVOLVIDA") > 0 && <p className="mt-3 text-sm text-navy-900/65">Atividades devolvidas esperam a sua complementação para voltar à análise.</p>}
        </Painel>
      </div>
    </section>
  );
}

async function BlocoAdministrador({ identity }: { identity: Parameters<typeof dadosAdministrador>[0] }) {
  const dados = await dadosAdministrador(identity);
  return (
    <section aria-labelledby="titulo-administrador" className="flex flex-col gap-4">
      <h2 id="titulo-administrador" className="text-sm font-semibold text-navy-900/70">
        Administração
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador rotulo="Usuários ativos" valor={dados.usuariosAtivos} contexto={dados.usuariosInativos !== null ? `${dados.usuariosInativos} inativos` : undefined} href="/administracao/usuarios" icone={Users} />
        <Indicador
          rotulo="Troca de senha pendente"
          valor={dados.trocaSenhaPendente}
          contexto={dados.trocaSenhaAmostra ? "entre os 100 primeiros ativos" : "senha provisória ainda não trocada"}
          href="/administracao/usuarios"
          icone={Hourglass}
          tom="atencao"
        />
        <Indicador rotulo="Documentos com guarda vencida" valor={dados.guarda?.length ?? null} contexto="aguardando eliminação do arquivo" href="/administracao/guarda-documental" icone={ShieldCheck} tom="atencao" />
        <Indicador rotulo="Estagiários ativos hoje" valor={dados.estagiariosHoje} contexto="em todos os cursos" href="/administracao/relatorios-gerenciais" icone={Building2} />
      </div>
      <Painel titulo="Atividade recente" descricao="Últimas operações gravadas na trilha de auditoria" flush verTodos={{ href: "/administracao/auditoria", rotulo: "Abrir auditoria" }}>
        <ListaCompacta vazio="Nenhuma operação registrada.">
          {(dados.auditoria ?? []).map((registro) => (
            <LinhaCompacta
              key={registro.id}
              titulo={descreverOperacao(registro.tabela, registro.operacao)}
              subtitulo={registro.usuarioId ? "por um usuário" : "pelo sistema"}
              lateral={haQuantoTempo(registro.ocorridoEm)}
            />
          ))}
        </ListaCompacta>
      </Painel>
    </section>
  );
}

export default async function DashboardPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const sessao = await getSession();
  const vinculos = await listPerfisVigentes(identity);
  const perfis = ORDEM.filter((perfil) => vinculos.some((vinculo) => vinculo.perfil === perfil));
  const notificacoes = await notificacoesRecentes(identity);
  const primeiroNome = sessao?.user.nome.split(" ")[0] ?? "";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-navy-900/60 first-letter:uppercase">{dataPorExtenso()}</p>
        <h1 className="text-[1.65rem] leading-tight font-semibold text-navy-900">
          {saudacao()}
          {primeiroNome ? `, ${primeiroNome}` : ""}
        </h1>
        <p className="text-sm text-navy-900/65" data-testid="perfis-vigentes">{perfis.map((perfil) => ROTULO_PERFIL[perfil]).join(" · ") || "Sem perfil vigente"}</p>
      </header>

      {perfis.length === 0 && (
        <EstadoVazio
          variante="sem-permissao"
          titulo="Nenhum perfil vigente"
          descricao="A sua conta existe, mas não tem perfil ativo. Peça ao administrador para vincular o perfil adequado."
        />
      )}
      {perfis.includes("ESTUDANTE") && <BlocoEstudante identity={identity} />}
      {perfis.includes("COORDENACAO") && <BlocoCoordenacao identity={identity} />}
      {perfis.includes("PROFESSOR_ORIENTADOR") && <BlocoOrientador identity={identity} />}
      {perfis.includes("SUPERVISOR") && <BlocoSupervisor identity={identity} />}
      {perfis.includes("CONCEDENTE") && <BlocoConcedente identity={identity} />}
      {perfis.includes("ADMINISTRADOR") && <BlocoAdministrador identity={identity} />}

      <Painel titulo="Notificações recentes" flush verTodos={{ href: "/notificacoes" }}>
        <ListaCompacta vazio="Nenhuma notificação por enquanto.">
          {(notificacoes?.itens ?? []).map((notificacao) => (
            <LinhaCompacta
              key={notificacao.id}
              href={notificacao.entidade === "estagio" && notificacao.entidadeId ? `/estagios/${notificacao.entidadeId}` : "/notificacoes"}
              titulo={
                <>
                  {!notificacao.lidaEm && <span className="mr-2 inline-block size-2 rounded-full bg-azul-500 align-middle" aria-label="não lida" />}
                  {notificacao.titulo}
                </>
              }
              subtitulo={humanizarCodigos(notificacao.mensagem)}
              lateral={haQuantoTempo(notificacao.criadoEm)}
            />
          ))}
        </ListaCompacta>
      </Painel>
    </div>
  );
}
