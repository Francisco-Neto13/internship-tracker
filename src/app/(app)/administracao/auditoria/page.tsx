import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listPerfisVigentes } from "@/modules/acesso/services/perfil-service";
import { listUltimosRegistros } from "@/modules/administracao/services/auditoria-service";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";

const OPERACAO_TONE: Record<string, StatusTone> = {
  INSERT: "ok",
  UPDATE: "pending",
  DELETE: "danger",
};

type Registro = Awaited<ReturnType<typeof listUltimosRegistros>>[number];

const COLUNAS: DataTableColumn<Registro>[] = [
  {
    chave: "data",
    cabecalho: "Data e hora",
    celula: (registro) => <span className="text-navy-900/60">{registro.ocorridoEm.toLocaleString("pt-BR")}</span>,
  },
  { chave: "tabela", cabecalho: "Tabela", celula: (registro) => <span className="font-mono text-navy-900">{registro.tabela}</span> },
  {
    chave: "operacao",
    cabecalho: "Operacao",
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

export default async function AuditoriaPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [registros, perfis] = await Promise.all([
    listUltimosRegistros(session.identity),
    listPerfisVigentes(session.identity),
  ]);
  const ehAdministrador = perfis.some((vinculo) => vinculo.perfil === "ADMINISTRADOR");

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        eyebrow="M08 Administração e Controle"
        title="Auditoria"
        description="Trilha de operações relevantes, somente leitura (RF065, RF066)."
      />

      {registros.length === 0 ? (
        ehAdministrador ? (
          <EstadoVazio
            variante="vazio"
            titulo="Nenhum registro ainda"
            descricao="A trilha de auditoria aparece aqui assim que houver a primeira operação relevante no sistema."
          />
        ) : (
          <EstadoVazio
            variante="sem-permissao"
            titulo="Restrito ao perfil Administrador"
            descricao="A trilha de auditoria (RF065, RF066) só fica visível para quem tem o perfil Administrador. Isto é a política de acesso funcionando, não um erro."
          />
        )
      ) : (
        <DataTable columns={COLUNAS} items={registros} getRowKey={(registro) => String(registro.id)} testId="auditoria-lista" />
      )}
    </section>
  );
}
