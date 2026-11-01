import Link from "next/link";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { TIPOS_RELATORIO, type TipoRelatorio } from "@/modules/administracao/domain/relatorios-gerenciais";
import { relatorioQuerySchema } from "@/modules/administracao/schemas/relatorios-gerenciais";
import { gerarRelatorio, tituloRelatorio } from "@/modules/administracao/services/relatorio-gerencial-service";
import { Button } from "@/shared/ui/button";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { PageHeader } from "@/shared/ui/page-header";

// RF067, RF068: the four management reports with the filters in the query string, so the
// same URL drives the table and the CSV and PDF exports. Functional screen.

const ROTULOS: Record<string, string> = {
  curso: "Curso",
  concedente: "Concedente",
  tipo: "Tipo",
  estagiarios: "Estagiários",
  situacao: "Situação",
  convenios_vigentes: "Convênios vigentes",
  estagios: "Estágios no período",
  concluidos: "Concluídos",
  rescindidos: "Rescindidos",
  taxa_conclusao_percentual: "Taxa de conclusão (%)",
  matricula: "Matrícula",
  nome: "Estudante",
  estagio_faltante_horas: "Estágio faltante (h)",
  atividades_faltante_horas: "Atividades faltantes (h)",
};

export default async function RelatoriosGerenciaisPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const bruto: Record<string, string> = Object.fromEntries(Object.entries(await searchParams).map(([chave, valor]) => [chave, Array.isArray(valor) ? valor[0] : valor]).filter(([, valor]) => valor));
  const tipo: TipoRelatorio = (TIPOS_RELATORIO as readonly string[]).includes(bruto.tipo ?? "") ? (bruto.tipo as TipoRelatorio) : "estagiarios-ativos";
  const parsed = relatorioQuerySchema.safeParse(bruto);
  const filtro = parsed.success ? parsed.data : { cursoId: null, concedenteId: null, de: null, ate: null };
  const linhas = await gerarRelatorio(identity, tipo, filtro);
  const colunas = Object.keys(ROTULOS).filter((chave) => linhas.some((linha) => chave in linha));
  const consulta = new URLSearchParams(Object.entries(bruto).filter(([chave]) => chave !== "tipo"));

  return (
    <section className="flex flex-col gap-6">
      <PageHeader eyebrow="M08 Administração e Controle" title="Relatórios gerenciais" description="Estagiários ativos, concedentes parceiras, taxa de conclusão e pendências de integralização (RF067, RF068)." />
      <nav className="flex flex-wrap gap-3 text-sm" aria-label="Relatórios">
        {TIPOS_RELATORIO.map((item) => (
          <Link
            key={item}
            href={`?${new URLSearchParams({ ...Object.fromEntries(consulta), tipo: item })}`}
            className={item === tipo ? "font-medium text-navy-900 underline underline-offset-4" : "text-navy-900/70 hover:underline"}
          >
            {tituloRelatorio(item)}
          </Link>
        ))}
      </nav>
      <form className="surface-card grid gap-4 p-5 sm:grid-cols-5" method="get">
        <input type="hidden" name="tipo" value={tipo} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filtro-curso">Curso (id)</Label>
          <Input id="filtro-curso" name="curso_id" defaultValue={bruto.curso_id} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filtro-concedente">Concedente (id)</Label>
          <Input id="filtro-concedente" name="concedente_id" defaultValue={bruto.concedente_id} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filtro-de">De</Label>
          <Input id="filtro-de" name="de" type="date" defaultValue={bruto.de} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filtro-ate">Até</Label>
          <Input id="filtro-ate" name="ate" type="date" defaultValue={bruto.ate} />
        </div>
        <Button type="submit" className="self-end">
          Filtrar
        </Button>
      </form>
      {!parsed.success && (
        <p role="alert" className="text-sm text-status-danger-text">
          Filtros inválidos: informe ids válidos e um período com a data final igual ou posterior à inicial.
        </p>
      )}
      <div className="flex flex-wrap gap-4 text-sm">
        <a className="text-azul-600 underline-offset-4 hover:underline" href={`/api/v1/relatorios-gerenciais/${tipo}/exportacao?${new URLSearchParams({ ...Object.fromEntries(consulta), formato: "csv" })}`}>
          Exportar CSV
        </a>
        <a className="text-azul-600 underline-offset-4 hover:underline" href={`/api/v1/relatorios-gerenciais/${tipo}/exportacao?${new URLSearchParams({ ...Object.fromEntries(consulta), formato: "pdf" })}`}>
          Exportar PDF
        </a>
      </div>
      {linhas.length === 0 ? (
        <EstadoVazio variante="vazio" titulo="Nenhum registro" descricao="Nada para os filtros informados nos cursos sob seu alcance." />
      ) : (
        <div className="surface-card overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="relatorio-gerencial">
            <thead>
              <tr className="border-b border-navy-900/10 text-navy-900/60">
                {colunas.map((coluna) => (
                  <th key={coluna} scope="col" className="px-4 py-3 font-medium">
                    {ROTULOS[coluna]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, indice) => (
                <tr key={indice} className="border-b border-navy-900/5 text-navy-900">
                  {colunas.map((coluna) => (
                    <td key={coluna} className="px-4 py-3">
                      {linha[coluna] === null ? "—" : String(linha[coluna])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
