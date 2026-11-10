import { LIMITE } from "@/lib/campos";
import { lerConsulta, lerPaginacao, type SearchParamsBrutos } from "@/lib/consulta";
import { formatarDataHora } from "@/lib/datas";
import { descreverOperacao, OPERACAO_AUDITORIA, TABELA_AUDITORIA } from "@/lib/rotulos";
import { identidadeDaTela } from "@/lib/acesso-tela";
import { listAuditoriaQuerySchema, toFiltroAuditoria } from "@/modules/administracao/schemas/auditoria";
import { listRegistros } from "@/modules/administracao/services/auditoria-service";
import { Avatar } from "@/shared/ui/avatar";
import { BarraFiltros } from "@/shared/ui/barra-filtros";
import { BaixarArquivo } from "@/shared/ui/baixar-arquivo";
import { Button } from "@/shared/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { PageHeader } from "@/shared/ui/page-header";
import { Paginacao } from "@/shared/ui/paginacao";
import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";

// RF065, RF066: a trilha, somente leitura. Filtros na URL (o mesmo endereço alimenta a tabela e
// a exportação CSV), nomes do produto no lugar dos nomes de tabela, e cada linha mostra o que
// mudou, antes e depois. Colunas sensíveis já chegam mascaradas pelo banco ([omitido]).

type Registro = Awaited<ReturnType<typeof listRegistros>>["items"][number];
const TOM: Record<string, StatusTone> = { INSERT: "ok", UPDATE: "pending", DELETE: "danger", LEITURA: "neutral" };

function valor(dados: unknown, campo: string) {
  if (!dados || typeof dados !== "object") return "Não informado";
  const bruto = (dados as Record<string, unknown>)[campo];
  if (bruto === null || bruto === undefined) return "Não informado";
  return typeof bruto === "object" ? JSON.stringify(bruto) : String(bruto);
}

function Alteracao({ registro }: { registro: Registro }) {
  const campos = registro.camposAlterados ?? (registro.operacao === "INSERT" ? Object.keys((registro.dadosNovos as object) ?? {}) : []);
  if (campos.length === 0) return <span className="text-xs text-navy-900/65">Sem campos</span>;
  return (
    <details className="relative z-10 text-xs">
      <summary className="cursor-pointer text-azul-500 hover:text-navy-700">
        {registro.operacao === "INSERT" ? `${campos.length} campos` : campos.slice(0, 3).join(", ") + (campos.length > 3 ? ` +${campos.length - 3}` : "")}
      </summary>
      <table className="mt-2 w-full max-w-xl text-left">
        <thead className="text-navy-900/65">
          <tr>
            <th className="py-1 pr-3 font-medium">Campo</th>
            {registro.operacao !== "INSERT" && <th className="py-1 pr-3 font-medium">Antes</th>}
            <th className="py-1 font-medium">{registro.operacao === "INSERT" ? "Valor" : "Depois"}</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {campos.map((campo) => (
            <tr key={campo} className="border-t border-navy-900/[0.07] align-top">
              <td className="py-1 pr-3 text-navy-900/70">{campo}</td>
              {registro.operacao !== "INSERT" && <td className="max-w-48 truncate py-1 pr-3 text-navy-900/65">{valor(registro.dadosAnteriores, campo)}</td>}
              <td className="max-w-48 truncate py-1 text-navy-900">{valor(registro.dadosNovos, campo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

const COLUNAS: DataTableColumn<Registro>[] = [
  { chave: "data", cabecalho: "Quando", celula: (registro) => <span className="whitespace-nowrap text-navy-900/75">{formatarDataHora(registro.ocorridoEm)}</span> },
  {
    chave: "autor",
    cabecalho: "Autor",
    celula: (registro) =>
      registro.usuarioId ? (
        <span className="flex min-w-0 items-center gap-2">
          <Avatar nome={registro.autorNome} semente={registro.usuarioId} tamanho="sm" />
          <span className="min-w-0">
            <span className="block truncate text-navy-900">{registro.autorNome ?? "Sem autor"}</span>
            <span className="block truncate text-xs text-navy-900/65">{registro.autorEmail}</span>
          </span>
        </span>
      ) : (
        <span className="text-navy-900/65">Sistema</span>
      ),
  },
  {
    chave: "operacao",
    cabecalho: "Operação",
    celula: (registro) => (
      <span className="flex flex-col gap-1">
        <span className="text-navy-900">{descreverOperacao(registro.tabela, registro.operacao)}</span>
        <span className="flex items-center gap-2">
          <StatusBadge tone={TOM[registro.operacao] ?? "neutral"}><span className="first-letter:uppercase">{OPERACAO_AUDITORIA[registro.operacao] ?? registro.operacao}</span></StatusBadge>
          <span className="font-mono text-xs text-navy-900/65">{registro.registroId.slice(0, 8)}</span>
        </span>
      </span>
    ),
  },
  { chave: "campos", cabecalho: "O que mudou", celula: (registro) => <Alteracao registro={registro} /> },
];

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<SearchParamsBrutos> }) {
  const identity = await identidadeDaTela("/administracao/auditoria");
  const brutos = lerConsulta(await searchParams);
  const { pagina, porPagina } = lerPaginacao(brutos, 50);
  const consulta = listAuditoriaQuerySchema.safeParse({ ...brutos, page: pagina, limit: porPagina });
  const query = consulta.success ? consulta.data : listAuditoriaQuerySchema.parse({ page: pagina, limit: porPagina });

  const { items, total } = await listRegistros(identity, toFiltroAuditoria(query), { page: query.page, limit: query.limit });
  const { tabela, registro_id, usuario_id, operacao, de, ate } = query;
  const filtros = new URLSearchParams(Object.entries({ tabela, registro_id, usuario_id, operacao, de, ate }).filter((par): par is [string, string] => Boolean(par[1])));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Auditoria"
        description="Toda operação relevante, com autor, data e o que mudou. Somente leitura: a trilha não aceita alteração nem exclusão (RN-28)."
        acoes={
          <BaixarArquivo url={`/api/v1/auditoria/exportacao?${filtros}`} rotulo="Exportar CSV" />
        }
      />
      <BarraFiltros
        filtros={[
          { chave: "tabela", rotulo: "Registro", todos: "Todos os registros", opcoes: Object.entries(TABELA_AUDITORIA).map(([valor, rotulo]) => ({ valor, rotulo })) },
          { chave: "operacao", rotulo: "Operação", todos: "Todas as operações", opcoes: ["INSERT", "UPDATE", "DELETE", "LEITURA"].map((valor) => ({ valor, rotulo: OPERACAO_AUDITORIA[valor] })) },
        ]}
      />
      <details className="surface-card px-5 py-4" open={Boolean(de || ate || registro_id || usuario_id)}>
        <summary className="cursor-pointer text-sm font-medium text-navy-900">Período, registro e autor</summary>
        <form method="get" className="mt-4 grid gap-4 sm:grid-cols-4" data-testid="auditoria-filtros">
          {tabela && <input type="hidden" name="tabela" value={tabela} />}
          {operacao && <input type="hidden" name="operacao" value={operacao} />}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filtro-de">De</Label>
            <Input id="filtro-de" name="de" type="date" defaultValue={de} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filtro-ate">Até</Label>
            <Input id="filtro-ate" name="ate" type="date" defaultValue={ate} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filtro-registro">Código do registro</Label>
            <Input id="filtro-registro" name="registro_id" maxLength={LIMITE.registroAuditoria} defaultValue={registro_id} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filtro-usuario">Código do autor</Label>
            <Input id="filtro-usuario" name="usuario_id" maxLength={LIMITE.codigoConta} defaultValue={usuario_id} />
          </div>
          {!consulta.success && (
            <p role="alert" className="text-sm text-status-danger-text sm:col-span-4">
              Filtros inválidos foram ignorados: {consulta.error.issues.map((issue) => issue.message).join("; ")}
            </p>
          )}
          <div className="sm:col-span-4">
            <Button type="submit" variant="outline">
              Aplicar
            </Button>
          </div>
        </form>
      </details>
      {items.length === 0 ? (
        <EstadoVazio variante="sem-resultados" titulo="Nenhum registro" descricao="Nenhuma operação corresponde aos filtros." />
      ) : (
        <DataTable
          columns={COLUNAS}
          items={items}
          getRowKey={(registro) => String(registro.id)}
          testId="auditoria-lista"
          rodape={<Paginacao pagina={query.page} porPagina={query.limit} total={total} rotuloItens="operações" />}
        />
      )}
    </div>
  );
}
