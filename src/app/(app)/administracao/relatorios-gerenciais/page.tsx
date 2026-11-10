import { TIPO_ESTAGIO } from "@/lib/rotulos";
import Link from "next/link";
import { lerConsulta, type SearchParamsBrutos } from "@/lib/consulta";
import { identidadeDaTela } from "@/lib/acesso-tela";
import { listCursos } from "@/modules/academico/services/curso-service";
import { TIPOS_RELATORIO, type TipoRelatorio } from "@/modules/administracao/domain/relatorios-gerenciais";
import { relatorioQuerySchema } from "@/modules/administracao/schemas/relatorios-gerenciais";
import { gerarRelatorio, tituloRelatorio } from "@/modules/administracao/services/relatorio-gerencial-service";
import { listConcedentes } from "@/modules/concedentes/services/concedente-service";
import { Abas } from "@/shared/ui/abas";
import { BaixarArquivo } from "@/shared/ui/baixar-arquivo";
import { Button, buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { selectClass } from "@/shared/ui/formulario-api";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { PageHeader } from "@/shared/ui/page-header";

// RF067, RF068: os quatro relatórios, com curso, concedente e período na URL; a mesma consulta
// alimenta a tabela e as exportações CSV e PDF, então os três nunca divergem. O alcance é o do
// perfil (administrador: todos os cursos; coordenação: os seus).

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
const SOMAVEIS = ["estagiarios", "convenios_vigentes", "estagios", "concluidos", "rescindidos", "estagio_faltante_horas", "atividades_faltante_horas"];
const DESCRICAO: Record<TipoRelatorio, string> = {
  "estagiarios-ativos": "Estudantes com estágio ativo no período, por curso, concedente e tipo.",
  "concedentes-parceiras": "Concedentes com convênio vigente no período e os estágios delas.",
  "taxa-conclusao": "Estágios encerrados no período: concluídos sobre o total de encerrados.",
  "pendencias-integralizacao": "Estudantes matriculados que ainda não cumpriram as exigências do curso, com o que falta.",
};

export default async function RelatoriosGerenciaisPage({ searchParams }: { searchParams: Promise<SearchParamsBrutos> }) {
  const identity = await identidadeDaTela("/administracao/relatorios-gerenciais");
  const bruto = lerConsulta(await searchParams);
  const tipo: TipoRelatorio = (TIPOS_RELATORIO as readonly string[]).includes(bruto.tipo ?? "") ? (bruto.tipo as TipoRelatorio) : "estagiarios-ativos";
  const parsed = relatorioQuerySchema.safeParse(bruto);
  const filtro = parsed.success ? parsed.data : { cursoId: null, concedenteId: null, de: null, ate: null };
  const [linhas, { items: cursos }, { items: concedentes }] = await Promise.all([
    gerarRelatorio(identity, tipo, filtro),
    listCursos(identity, { page: 1, limit: 100 }),
    listConcedentes(identity, { page: 1, limit: 100 }),
  ]);
  const colunas = Object.keys(ROTULOS).filter((chave) => linhas.some((linha) => chave in linha));
  const filtros = Object.fromEntries(Object.entries(bruto).filter(([chave]) => chave !== "tipo"));
  // Filtro inválido é ignorado na tabela: a exportação faz o mesmo, em vez de responder erro
  const exportar = (formato: "csv" | "pdf") => `/api/v1/relatorios-gerenciais/${tipo}/exportacao?${new URLSearchParams({ ...(parsed.success ? filtros : {}), formato })}`;
  const total = (coluna: string) => linhas.reduce((soma, linha) => soma + Number(linha[coluna] ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Relatórios gerenciais"
        description="Visão da operação para decisão, com filtros por curso, concedente e período. Somente leitura."
        acoes={
          <>
            <BaixarArquivo url={exportar("csv")} rotulo="Exportar CSV" />
            <BaixarArquivo url={exportar("pdf")} rotulo="Exportar PDF" />
          </>
        }
      />
      <Abas
        caminho="/administracao/relatorios-gerenciais"
        consulta={filtros}
        atual={tipo === "estagiarios-ativos" ? "estagiarios-ativos" : tipo}
        abas={TIPOS_RELATORIO.map((item) => ({ chave: item, rotulo: tituloRelatorio(item) }))}
      />
      <p className="-mt-2 text-sm text-navy-900/65">{DESCRICAO[tipo]}</p>

      <form className="surface-card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end" method="get">
        {tipo !== "estagiarios-ativos" && <input type="hidden" name="tipo" value={tipo} />}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filtro-curso">Curso</Label>
          <select id="filtro-curso" name="curso_id" defaultValue={bruto.curso_id ?? ""} className={selectClass}>
            <option value="">Todos no seu alcance</option>
            {cursos.map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filtro-concedente">Concedente</Label>
          <select id="filtro-concedente" name="concedente_id" defaultValue={bruto.concedente_id ?? ""} className={selectClass} disabled={tipo === "pendencias-integralizacao"}>
            <option value="">Todas</option>
            {concedentes.map((concedente) => (
              <option key={concedente.id} value={concedente.id}>
                {concedente.razaoSocial}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filtro-de">De</Label>
          <Input id="filtro-de" name="de" type="date" defaultValue={bruto.de} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filtro-ate">Até</Label>
          <Input id="filtro-ate" name="ate" type="date" defaultValue={bruto.ate} />
        </div>
        <div className="flex gap-2">
          <Button type="submit">Aplicar</Button>
          <Link href={tipo === "estagiarios-ativos" ? "?" : `?tipo=${tipo}`} className={buttonVariants({ variant: "ghost" })}>
            Limpar
          </Link>
        </div>
        {!parsed.success && (
          <p role="alert" className="text-sm text-status-danger-text sm:col-span-full">
            Filtros inválidos foram ignorados: o período precisa ter a data final igual ou posterior à inicial.
          </p>
        )}
        <p className="text-xs text-navy-900/65 sm:col-span-full">Sem período, o relatório é de hoje. {tipo === "pendencias-integralizacao" && "A concedente não se aplica a este relatório."}</p>
      </form>

      {linhas.length === 0 ? (
        <EstadoVazio variante="sem-resultados" titulo="Nenhum registro" descricao="Nada para os filtros informados nos cursos sob seu alcance." />
      ) : (
        <div className="surface-card overflow-hidden">
          <div tabIndex={0} className="relative overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="relatorio-gerencial">
              <thead className="border-b border-navy-900/10 bg-nevoa-50">
                <tr>
                  {colunas.map((coluna) => (
                    <th key={coluna} scope="col" className={cn("px-4 py-2.5 text-xs font-medium whitespace-nowrap text-navy-900/65", SOMAVEIS.includes(coluna) || coluna === "taxa_conclusao_percentual" ? "text-right" : "")}>
                      {ROTULOS[coluna]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha, indice) => (
                  <tr key={indice} className="border-b border-navy-900/[0.07] last:border-0">
                    {colunas.map((coluna) => {
                      const numero = typeof linha[coluna] === "number";
                      return (
                        <td key={coluna} className={cn("px-4 py-2.5 text-navy-900", numero && "text-right tabular-nums")}>
                          {linha[coluna] === null ? "Sem dado" : numero ? Number(linha[coluna]).toLocaleString("pt-BR") : coluna === "tipo" ? (TIPO_ESTAGIO[String(linha[coluna])] ?? String(linha[coluna])) : String(linha[coluna])}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              {colunas.some((coluna) => SOMAVEIS.includes(coluna)) && (
                <tfoot className="border-t border-navy-900/15 bg-nevoa-50 font-semibold">
                  <tr>
                    {colunas.map((coluna, indice) => (
                      <td key={coluna} className={cn("px-4 py-2.5 text-navy-900", SOMAVEIS.includes(coluna) && "text-right tabular-nums")}>
                        {indice === 0 ? `Total (${linhas.length} ${linhas.length === 1 ? "linha" : "linhas"})` : SOMAVEIS.includes(coluna) ? total(coluna).toLocaleString("pt-BR") : ""}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
