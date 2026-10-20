import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { listPerfisVigentes } from "@/modules/acesso/services/perfil-service";
import { listAuditoriaQuerySchema, toFiltroAuditoria } from "@/modules/administracao/schemas/auditoria";
import { listRegistros } from "@/modules/administracao/services/auditoria-service";
import { Button } from "@/shared/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";

const OPERACAO_TONE: Record<string, StatusTone> = {
  INSERT: "ok",
  UPDATE: "pending",
  DELETE: "danger",
};

const selectClass =
  "h-11 w-full rounded-md border border-navy-900/20 bg-white px-3 text-sm text-navy-900 outline-none transition-colors focus:border-azul-500 focus:ring-2 focus:ring-azul-500/25";

const dataHora = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Sao_Paulo" });

type Registro = Awaited<ReturnType<typeof listRegistros>>["items"][number];

const COLUNAS: DataTableColumn<Registro>[] = [
  {
    chave: "data",
    cabecalho: "Data e hora",
    celula: (registro) => <span className="text-navy-900/60">{dataHora.format(registro.ocorridoEm)}</span>,
  },
  {
    chave: "autor",
    cabecalho: "Autor",
    celula: (registro) => <span className="text-navy-900">{registro.autorNome ?? (registro.usuarioId ? "-" : "sistema")}</span>,
  },
  { chave: "tabela", cabecalho: "Tabela", celula: (registro) => <span className="font-mono text-navy-900">{registro.tabela}</span> },
  {
    chave: "operacao",
    cabecalho: "Operação",
    celula: (registro) => (
      <StatusBadge tone={OPERACAO_TONE[registro.operacao] ?? "neutral"}>{registro.operacao}</StatusBadge>
    ),
  },
  {
    chave: "campos",
    cabecalho: "Campos alterados",
    celula: (registro) => (
      <span className="font-mono text-xs text-navy-900/60">{registro.camposAlterados?.join(", ") ?? "-"}</span>
    ),
  },
];

// RF066: filters travel in the query string (a plain GET form), so the same URL drives
// the table and the CSV export
export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");

  const brutos = Object.fromEntries(
    Object.entries(await searchParams)
      .map(([chave, valor]) => [chave, Array.isArray(valor) ? valor[0] : valor])
      .filter(([, valor]) => valor !== ""),
  );
  const consulta = listAuditoriaQuerySchema.safeParse(brutos);
  const query = consulta.success ? consulta.data : listAuditoriaQuerySchema.parse({});

  const [{ items, total }, perfis] = await Promise.all([
    listRegistros(identity, toFiltroAuditoria(query), { page: query.page, limit: query.limit }),
    listPerfisVigentes(identity),
  ]);
  const ehAdministrador = perfis.some((vinculo) => vinculo.perfil === "ADMINISTRADOR");

  const { tabela, registro_id, usuario_id, operacao, de, ate } = query;
  const filtrosAtivos = new URLSearchParams(
    Object.entries({ tabela, registro_id, usuario_id, operacao, de, ate }).filter(
      (entrada): entrada is [string, string] => Boolean(entrada[1]),
    ),
  );
  const paginas = Math.max(1, Math.ceil(total / query.limit));
  const linkPagina = (page: number) => `?${new URLSearchParams({ ...Object.fromEntries(filtrosAtivos), page: String(page) })}`;

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        eyebrow="M08 Administração e Controle"
        title="Auditoria"
        description="Trilha de operações relevantes, somente leitura (RF065, RF066)."
      />

      {!ehAdministrador ? (
        <EstadoVazio
          variante="sem-permissao"
          titulo="Restrito ao perfil Administrador"
          descricao="A trilha de auditoria (RF065, RF066) só fica visível para quem tem o perfil Administrador. Isto é a política de acesso funcionando, não um erro."
        />
      ) : (
        <>
          <form method="get" className="surface-card grid gap-4 p-5 sm:grid-cols-3" data-testid="auditoria-filtros">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filtro-tabela">Tabela</Label>
              <Input id="filtro-tabela" name="tabela" defaultValue={query.tabela} placeholder="ex.: estudante" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filtro-registro">Id do registro</Label>
              <Input id="filtro-registro" name="registro_id" defaultValue={query.registro_id} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filtro-usuario">Id do autor</Label>
              <Input id="filtro-usuario" name="usuario_id" defaultValue={query.usuario_id} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filtro-operacao">Operação</Label>
              <select id="filtro-operacao" name="operacao" defaultValue={query.operacao ?? ""} className={selectClass}>
                <option value="">Todas</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filtro-de">De</Label>
              <Input id="filtro-de" name="de" type="date" defaultValue={query.de} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filtro-ate">Até</Label>
              <Input id="filtro-ate" name="ate" type="date" defaultValue={query.ate} />
            </div>
            {!consulta.success && (
              <p role="alert" className="text-sm text-status-danger-text sm:col-span-3">
                Filtros inválidos foram ignorados: {consulta.error.issues.map((issue) => issue.message).join("; ")}
              </p>
            )}
            <div className="flex flex-wrap gap-3 sm:col-span-3">
              <Button type="submit">Filtrar</Button>
              <Button asChild variant="outline">
                <a href={`/api/v1/auditoria/exportacao?${filtrosAtivos}`}>Exportar CSV</a>
              </Button>
            </div>
          </form>

          <p className="text-sm text-navy-900/60">
            {total} registro(s) · página {query.page} de {paginas}
          </p>

          {items.length === 0 ? (
            <EstadoVazio variante="vazio" titulo="Nenhum registro" descricao="Nenhuma operação corresponde aos filtros." />
          ) : (
            <DataTable columns={COLUNAS} items={items} getRowKey={(registro) => String(registro.id)} testId="auditoria-lista" />
          )}

          {paginas > 1 && (
            <nav className="flex gap-3 text-sm" aria-label="Paginação">
              {query.page > 1 && <a href={linkPagina(query.page - 1)}>Anterior</a>}
              {query.page < paginas && <a href={linkPagina(query.page + 1)}>Próxima</a>}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
