import { KeyRound, UserPlus } from "lucide-react";
import { redirect } from "next/navigation";
import { comConsulta, lerConsulta, lerPaginacao, opcao, type SearchParamsBrutos } from "@/lib/consulta";
import { formatarDataCurta } from "@/lib/datas";
import { SITUACAO_USUARIO } from "@/lib/rotulos";
import { getIdentity } from "@/lib/session";
import { listCursos } from "@/modules/academico/services/curso-service";
import { catalogoPerfis } from "@/modules/acesso/domain/catalogo-perfis";
import { ROTULO_PERFIL, type Perfil } from "@/modules/acesso/schemas/perfil";
import { listUsuarios, type UsuarioComPerfis } from "@/modules/acesso/services/usuario-service";
import { listConcedentes } from "@/modules/concedentes/services/concedente-service";
import { Avatar } from "@/shared/ui/avatar";
import { BarraFiltros } from "@/shared/ui/barra-filtros";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { Dialogo } from "@/shared/ui/dialogo";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";
import { Paginacao } from "@/shared/ui/paginacao";
import { StatusBadge } from "@/shared/ui/status-badge";
import { UsuarioForm } from "./usuario-form";

// RF001-RF003: contas de acesso. A conta (quem entra e com qual perfil) é distinta do perfil
// acadêmico (Estudantes); esta tela é só do administrador. Busca, filtros, ordenação e página
// vão para o servidor pela URL.

const PERFIS = Object.keys(ROTULO_PERFIL) as Perfil[];
const SITUACOES = ["ATIVO", "INATIVO"] as const;

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<SearchParamsBrutos> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const consulta = lerConsulta(await searchParams);
  const { pagina, porPagina } = lerPaginacao(consulta);

  const [{ items, total }, { items: cursos }, { items: concedentes }] = await Promise.all([
    listUsuarios(identity, {
      page: pagina,
      limit: porPagina,
      busca: consulta.busca,
      perfil: opcao(consulta.perfil, PERFIS),
      situacao: opcao(consulta.situacao, SITUACOES),
      ordem: consulta.ordem,
    }),
    listCursos(identity, { page: 1, limit: 100 }),
    listConcedentes(identity, { page: 1, limit: 100, situacao: "ATIVA" }),
  ]);
  const filtrando = Boolean(consulta.busca || consulta.perfil || consulta.situacao);
  const voltar = encodeURIComponent(comConsulta("/administracao/usuarios", consulta));

  const colunas: DataTableColumn<UsuarioComPerfis>[] = [
    {
      chave: "nome",
      cabecalho: "Pessoa",
      ordenavel: "nome",
      celula: (usuario) => (
        <span className="flex min-w-0 items-center gap-3">
          <Avatar nome={usuario.nome} semente={usuario.id} tamanho="sm" />
          <span className="min-w-0">
            <span className="block truncate font-medium text-navy-900">{usuario.nome}</span>
            <span className="block truncate text-xs text-navy-900/65">{usuario.email}</span>
          </span>
        </span>
      ),
    },
    {
      chave: "perfis",
      cabecalho: "Perfis vigentes",
      ocultarNoCelular: true,
      celula: (usuario) =>
        usuario.perfis.length === 0 ? (
          <span className="text-navy-900/65">Sem perfil</span>
        ) : (
          <span className="flex flex-wrap gap-1">
            {usuario.perfis.map((vinculo) => (
              <span key={vinculo.id} className="rounded-full bg-nevoa-100 px-2 py-0.5 text-xs text-navy-700">
                {ROTULO_PERFIL[vinculo.perfil]}
              </span>
            ))}
          </span>
        ),
    },
    {
      chave: "acesso",
      cabecalho: "Acesso",
      ocultarNoCelular: true,
      celula: (usuario) =>
        usuario.trocaSenhaObrigatoria ? (
          <span className="inline-flex items-center gap-1 text-xs text-status-pending-text">
            <KeyRound className="size-3.5" aria-hidden />
            Senha provisória
          </span>
        ) : (
          <span className="text-xs text-navy-900/65">Senha própria</span>
        ),
    },
    { chave: "criado", cabecalho: "Criado em", ordenavel: "criado", ocultarNoCelular: true, celula: (usuario) => <span className="text-navy-900/70">{formatarDataCurta(usuario.criadoEm.toISOString())}</span> },
    {
      chave: "situacao",
      cabecalho: "Situação",
      ordenavel: "situacao",
      celula: (usuario) => <StatusBadge tone={SITUACAO_USUARIO[usuario.situacao].tom}>{SITUACAO_USUARIO[usuario.situacao].rotulo}</StatusBadge>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usuários e acesso"
        description="Contas, perfis e vínculos. Inativar ou trocar perfis vale na requisição seguinte do usuário; contas não são apagadas."
        acoes={
          <Dialogo
            gatilho={{ rotulo: "Novo usuário", icone: <UserPlus className="size-4" aria-hidden /> }}
            titulo="Novo usuário"
            descricao="A conta nasce com senha provisória de 72 horas, exibida uma única vez (RF001, RF002)."
            largura="lg"
          >
            <UsuarioForm
              catalogo={catalogoPerfis()}
              cursos={cursos.map((curso) => ({ id: curso.id, nome: curso.nome }))}
              concedentes={concedentes.map((concedente) => ({ id: concedente.id, nome: concedente.razaoSocial }))}
            />
          </Dialogo>
        }
      />

      <BarraFiltros
        busca="Buscar por nome ou e-mail"
        filtros={[
          { chave: "perfil", rotulo: "Perfil", todos: "Todos os perfis", opcoes: PERFIS.map((perfil) => ({ valor: perfil, rotulo: ROTULO_PERFIL[perfil] })) },
          { chave: "situacao", rotulo: "Situação", todos: "Ativos e inativos", opcoes: SITUACOES.map((situacao) => ({ valor: situacao, rotulo: SITUACAO_USUARIO[situacao].rotulo })) },
        ]}
      />

      {items.length === 0 ? (
        filtrando ? (
          <EstadoVazio variante="sem-resultados" titulo="Nenhuma conta encontrada" descricao="Nenhuma conta corresponde à busca e aos filtros. Ajuste ou limpe os filtros." />
        ) : (
          <EstadoVazio variante="sem-permissao" titulo="Nenhuma conta visível" descricao="Somente o administrador gerencia contas de acesso." />
        )
      ) : (
        <DataTable
          columns={colunas}
          items={items}
          getRowKey={(usuario) => usuario.id}
          getRowHref={(usuario) => `/administracao/usuarios/${usuario.id}?voltar=${voltar}`}
          consulta={consulta}
          caminho="/administracao/usuarios"
          testId="usuarios-lista"
          rodape={<Paginacao pagina={pagina} porPagina={porPagina} total={total} rotuloItens="contas" />}
        />
      )}
    </div>
  );
}
