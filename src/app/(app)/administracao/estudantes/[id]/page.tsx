import { ExternalLink, KeyRound } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { formatarDataCurta } from "@/lib/datas";
import { DomainError } from "@/lib/errors";
import { minutosParaHoras } from "@/lib/horas";
import { lerConsulta, type SearchParamsBrutos } from "@/lib/consulta";
import { SITUACAO_ACADEMICA, SITUACAO_ATIVIDADE, SITUACAO_ESTAGIO, TIPO_ESTAGIO } from "@/lib/rotulos";
import { getIdentity } from "@/lib/session";
import { getCargaHoraria } from "@/modules/acompanhamento/services/frequencia-service";
import { TRANSICOES_SITUACAO_ACADEMICA } from "@/modules/academico/domain/situacao-academica";
import { listCursos } from "@/modules/academico/services/curso-service";
import { getEstudante } from "@/modules/academico/services/estudante-service";
import { listPerfisVigentes } from "@/modules/acesso/services/perfil-service";
import { listAtividades } from "@/modules/atividades/services/atividade-service";
import { listEstagios } from "@/modules/estagios/services/estagio-service";
import { getIntegralizacao } from "@/modules/integralizacao/services/integralizacao-service";
import { Abas } from "@/shared/ui/abas";
import { Avatar } from "@/shared/ui/avatar";
import { DataTable } from "@/shared/ui/data-table";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { Progresso } from "@/shared/ui/indicador";
import { ListaDefinicao, Painel } from "@/shared/ui/painel";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
import { DeclaracoesEstudante } from "../../../integralizacao/declaracoes";
import { ProgressoIntegralizacao } from "../../../integralizacao/progresso";

// RF005, RF057: o perfil acadêmico de um estudante, separado da conta de acesso (RF001, que
// fica em Usuários). Uma página própria com abas, porque reúne cinco assuntos: visão geral,
// estágios, atividades, integralização e os dados acadêmicos editáveis. O administrador não lê
// atividades nem integralização (M06/M07 fora do seu alcance): as abas dizem isso em vez de
// parecer vazias.

const h = (minutos: number) => `${minutosParaHoras(minutos).toLocaleString("pt-BR")} h`;
const ABAS = ["visao", "estagios", "atividades", "integralizacao", "dados"] as const;

/** Volta só para a listagem de estudantes (o parâmetro vem da URL e não pode levar a outro site). */
function destinoDeVolta(valor: string | undefined) {
  return valor && valor.startsWith("/administracao/estudantes") ? valor : "/administracao/estudantes";
}

async function semAlcance<T>(consulta: Promise<T>): Promise<T | null> {
  return consulta.catch((erro: unknown) => {
    if (erro instanceof DomainError && (erro.kind === "NOT_FOUND" || erro.kind === "FORBIDDEN")) return null;
    throw erro;
  });
}

export default async function EstudantePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParamsBrutos> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const parsed = z.object({ id: z.uuid() }).safeParse(await params);
  if (!parsed.success) notFound();
  const { id } = parsed.data;
  const consulta = lerConsulta(await searchParams);
  const aba = (ABAS as readonly string[]).includes(consulta.aba ?? "") ? consulta.aba! : "visao";
  const voltar = destinoDeVolta(consulta.voltar);

  const estudante = await getEstudante(identity, id).catch((error: unknown) => {
    if (error instanceof DomainError && error.kind === "NOT_FOUND") notFound();
    throw error;
  });
  const [perfis, estagios, atividades, integralizacao] = await Promise.all([
    listPerfisVigentes(identity),
    listEstagios(identity, { page: 1, limit: 50, estudanteId: id }),
    semAlcance(listAtividades(identity, { estudanteId: id })),
    semAlcance(getIntegralizacao(identity, id)),
  ]);
  const administrador = perfis.some((vinculo) => vinculo.perfil === "ADMINISTRADOR");
  const atual = estagios.items.find((estagio) => estagio.situacao === "ATIVO") ?? estagios.items.find((estagio) => estagio.situacao === "EM_FORMALIZACAO");
  const carga = atual?.situacao === "ATIVO" ? await semAlcance(getCargaHoraria(identity, atual.id)) : null;
  const situacao = SITUACAO_ACADEMICA[estudante.situacaoAcademica];
  const contar = (codigo: string) => atividades?.filter((atividade) => atividade.situacao === codigo).length ?? 0;
  const manterVolta = { voltar: consulta.voltar };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        voltar={{ href: voltar, rotulo: "Estudantes" }}
        title={estudante.nome ?? estudante.matricula}
        description={estudante.email ?? undefined}
        meta={
          <>
            <StatusBadge tone={situacao?.tom ?? "neutral"}>{situacao?.rotulo}</StatusBadge>
            <span>
              Matrícula <span className="font-mono text-navy-900">{estudante.matricula}</span>
            </span>
            <span>{estudante.cursoNome ?? "Curso não disponível"}</span>
            <span>{estudante.periodo}º período</span>
          </>
        }
        acoes={
          administrador && (
            <Link
              href={`/administracao/usuarios/${estudante.usuarioId}`}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-navy-900/20 bg-white px-4 text-sm font-medium text-navy-900 hover:bg-nevoa-100 focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none"
            >
              <KeyRound className="size-4" aria-hidden />
              Conta de acesso
            </Link>
          )
        }
        identidade={<Avatar nome={estudante.nome} semente={estudante.id} tamanho="xl" />}
      />

      <Abas
        caminho={`/administracao/estudantes/${id}`}
        consulta={manterVolta}
        atual={aba}
        abas={[
          { chave: "visao", rotulo: "Visão geral" },
          { chave: "estagios", rotulo: "Estágios", contagem: estagios.total },
          { chave: "atividades", rotulo: "Atividades", contagem: atividades?.length ?? null },
          { chave: "integralizacao", rotulo: "Integralização" },
          { chave: "dados", rotulo: "Dados acadêmicos" },
        ]}
      />

      {aba === "visao" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="flex flex-col gap-4 xl:col-span-2">
            <Painel titulo="Estágio atual" verTodos={atual ? { href: `/estagios/${atual.id}`, rotulo: "Abrir estágio" } : undefined}>
              {atual ? (
                <div className="flex flex-col gap-5">
                  <div className="flex items-start gap-3">
                    <Avatar nome={atual.concedenteRazaoSocial} semente={atual.concedenteId} forma="quadrado" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-navy-900">{atual.concedenteRazaoSocial ?? "Concedente"}</p>
                      <p className="text-sm text-navy-900/60">
                        {TIPO_ESTAGIO[atual.tipo]} · {formatarDataCurta(atual.dataInicio)} a {formatarDataCurta(atual.dataFimPrevista)}
                      </p>
                    </div>
                    <StatusBadge tone={SITUACAO_ESTAGIO[atual.situacao].tom}>{SITUACAO_ESTAGIO[atual.situacao].rotulo}</StatusBadge>
                  </div>
                  {carga ? (
                    <Progresso
                      rotulo="Carga horária homologada"
                      atual={minutosParaHoras(carga.resumo.minutosHomologados)}
                      total={minutosParaHoras(carga.resumo.cargaTotalMinutos)}
                      formatar={(valor) => `${valor.toLocaleString("pt-BR")} h`}
                      detalhe={carga.resumo.minutosPendentes > 0 ? `${h(carga.resumo.minutosPendentes)} aguardando homologação` : undefined}
                    />
                  ) : (
                    atual.situacao === "EM_FORMALIZACAO" && <p className="text-sm text-navy-900/60">Em formalização: a carga horária começa a contar depois da ativação.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-navy-900/60">Nenhum estágio ativo ou em formalização.</p>
              )}
            </Painel>
            <Painel titulo="Integralização" verTodos={integralizacao ? { href: `?aba=integralizacao`, rotulo: "Detalhes" } : undefined}>
              {integralizacao ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Progresso
                    rotulo="Estágio obrigatório"
                    atual={minutosParaHoras(integralizacao.apuracao.estagioConcluidoMinutos)}
                    total={minutosParaHoras(integralizacao.apuracao.estagioExigidoMinutos)}
                    formatar={(valor) => `${valor.toLocaleString("pt-BR")} h`}
                  />
                  <Progresso
                    rotulo="Atividades complementares"
                    atual={minutosParaHoras(integralizacao.apuracao.atividadesAproveitadoMinutos)}
                    total={minutosParaHoras(integralizacao.apuracao.atividadesExigidoMinutos)}
                    formatar={(valor) => `${valor.toLocaleString("pt-BR")} h`}
                  />
                </div>
              ) : (
                <p className="text-sm text-navy-900/60">A integralização fica com a coordenação do curso e o próprio estudante.</p>
              )}
            </Painel>
          </div>
          <div className="flex flex-col gap-4">
            <Painel titulo="Dados acadêmicos" verTodos={{ href: `?aba=dados`, rotulo: "Editar" }}>
              <ListaDefinicao
                colunas={1}
                itens={[
                  { rotulo: "Curso", valor: estudante.cursoNome },
                  { rotulo: "Matrícula", valor: <span className="font-mono">{estudante.matricula}</span> },
                  { rotulo: "Período", valor: `${estudante.periodo}º` },
                  { rotulo: "Situação acadêmica", valor: situacao?.rotulo },
                  { rotulo: "E-mail", valor: estudante.email },
                ]}
              />
            </Painel>
            <Painel titulo="Atividades complementares">
              {atividades ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { rotulo: "Em análise", valor: contar("EM_ANALISE") },
                    { rotulo: "Aprovadas", valor: contar("APROVADA") },
                    { rotulo: "Devolvidas", valor: contar("DEVOLVIDA") },
                  ].map((item) => (
                    <div key={item.rotulo} className="rounded-lg bg-nevoa-50 px-2 py-3">
                      <p className="text-lg font-semibold text-navy-900 tabular-nums">{item.valor}</p>
                      <p className="text-xs text-navy-900/60">{item.rotulo}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-navy-900/60">Fora do alcance do seu perfil.</p>
              )}
            </Painel>
          </div>
        </div>
      )}

      {aba === "estagios" &&
        (estagios.items.length === 0 ? (
          <EstadoVazio titulo="Nenhum estágio" descricao="O estudante ainda não tem estágio cadastrado." />
        ) : (
          <DataTable
            items={estagios.items}
            getRowKey={(estagio) => estagio.id}
            getRowHref={(estagio) => `/estagios/${estagio.id}`}
            columns={[
              {
                chave: "concedente",
                cabecalho: "Concedente",
                celula: (estagio) => (
                  <span className="flex items-center gap-3">
                    <Avatar nome={estagio.concedenteRazaoSocial} semente={estagio.concedenteId} forma="quadrado" tamanho="sm" />
                    <span className="font-medium text-navy-900">{estagio.concedenteRazaoSocial ?? "—"}</span>
                  </span>
                ),
              },
              { chave: "tipo", cabecalho: "Tipo", ocultarNoCelular: true, celula: (estagio) => TIPO_ESTAGIO[estagio.tipo] },
              { chave: "periodo", cabecalho: "Período", ocultarNoCelular: true, celula: (estagio) => `${formatarDataCurta(estagio.dataInicio)} a ${formatarDataCurta(estagio.dataFimPrevista)}` },
              { chave: "situacao", cabecalho: "Situação", celula: (estagio) => <StatusBadge tone={SITUACAO_ESTAGIO[estagio.situacao].tom}>{SITUACAO_ESTAGIO[estagio.situacao].rotulo}</StatusBadge> },
            ]}
          />
        ))}

      {aba === "atividades" &&
        (atividades === null ? (
          <EstadoVazio variante="sem-permissao" titulo="Fora do alcance do seu perfil" descricao="As atividades complementares são lidas pela coordenação do curso e pelo próprio estudante." />
        ) : atividades.length === 0 ? (
          <EstadoVazio titulo="Nenhuma atividade cadastrada" descricao="O estudante ainda não registrou atividades complementares." />
        ) : (
          <DataTable
            items={atividades}
            getRowKey={(atividade) => atividade.id}
            columns={[
              {
                chave: "descricao",
                cabecalho: "Atividade",
                celula: (atividade) => (
                  <span className="block min-w-0">
                    <span className="block truncate font-medium text-navy-900">{atividade.descricao}</span>
                    <span className="block truncate text-xs text-navy-900/60">{atividade.instituicaoPromotora}</span>
                  </span>
                ),
              },
              { chave: "categoria", cabecalho: "Categoria", ocultarNoCelular: true, celula: (atividade) => atividade.categoriaNome ?? "—" },
              { chave: "horas", cabecalho: "Declaradas", alinhar: "direita", ocultarNoCelular: true, celula: (atividade) => h(atividade.horasDeclaradasMinutos) },
              {
                chave: "aproveitadas",
                cabecalho: "Aproveitadas",
                alinhar: "direita",
                celula: (atividade) => (atividade.horasAproveitadasMinutos === null ? "—" : h(atividade.horasAproveitadasMinutos)),
              },
              { chave: "situacao", cabecalho: "Situação", celula: (atividade) => <StatusBadge tone={SITUACAO_ATIVIDADE[atividade.situacao].tom}>{SITUACAO_ATIVIDADE[atividade.situacao].rotulo}</StatusBadge> },
            ]}
          />
        ))}

      {aba === "integralizacao" &&
        (integralizacao ? (
          <div className="flex flex-col gap-4">
            <ProgressoIntegralizacao integralizacao={integralizacao} />
            <DeclaracoesEstudante
              identity={identity}
              estudanteId={id}
              atividadesCumpridas={integralizacao.apuracao.atividadesAproveitadoMinutos >= integralizacao.apuracao.atividadesExigidoMinutos}
            />
          </div>
        ) : (
          <EstadoVazio variante="sem-permissao" titulo="Fora do alcance do seu perfil" descricao="A integralização é acompanhada pela coordenação do curso e pelo próprio estudante (M07)." />
        ))}

      {aba === "dados" && <DadosAcademicos id={id} estudante={estudante} identity={identity} />}

      <p className="text-xs text-navy-900/60">
        <ExternalLink className="mr-1 inline size-3" aria-hidden />
        Perfil acadêmico (RF005). Conta, perfis e senha ficam em Usuários e acesso.
      </p>
    </div>
  );
}

async function DadosAcademicos({ id, estudante, identity }: { id: string; estudante: Awaited<ReturnType<typeof getEstudante>>; identity: NonNullable<Awaited<ReturnType<typeof getIdentity>>> }) {
  const { items: cursos } = await listCursos(identity, { page: 1, limit: 100 });
  const situacoes = [estudante.situacaoAcademica, ...TRANSICOES_SITUACAO_ACADEMICA[estudante.situacaoAcademica]];
  return (
    <Painel
      titulo="Dados acadêmicos"
      descricao="A situação oferece só as transições permitidas: trancado volta a matriculado; formado e desligado são finais. Toda alteração fica na auditoria."
    >
      <FormularioApi
        url={`/api/v1/estudantes/${id}`}
        metodo="PATCH"
        rotuloEnviar="Salvar alterações"
        sucesso="Dados acadêmicos atualizados"
        testId="estudante-edicao"
        embutido
        campos={[
          { nome: "curso_id", rotulo: "Curso", tipo: "select", obrigatorio: true, valorInicial: estudante.cursoId, opcoes: cursos.map((curso) => ({ valor: curso.id, rotulo: curso.nome })) },
          { nome: "matricula", rotulo: "Matrícula", valorInicial: estudante.matricula },
          { nome: "periodo", rotulo: "Período", tipo: "number", valorInicial: estudante.periodo },
          {
            nome: "situacao_academica",
            rotulo: "Situação acadêmica",
            tipo: "select",
            obrigatorio: true,
            valorInicial: estudante.situacaoAcademica,
            opcoes: situacoes.map((codigo) => ({ valor: codigo, rotulo: SITUACAO_ACADEMICA[codigo]?.rotulo ?? codigo })),
          },
        ]}
      />
    </Painel>
  );
}
