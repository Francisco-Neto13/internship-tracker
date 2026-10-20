import Link from "next/link";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { listConcedentes } from "@/modules/concedentes/services/concedente-service";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

type Concedente = Awaited<ReturnType<typeof listConcedentes>>["items"][number];

const COLUNAS: DataTableColumn<Concedente>[] = [
  {
    chave: "razao",
    cabecalho: "Razão social",
    celula: (c) => (
      <Link href={`/administracao/concedentes/${c.id}`} className="text-navy-900 underline-offset-4 hover:underline">
        {c.razaoSocial}
      </Link>
    ),
  },
  { chave: "cnpj", cabecalho: "CNPJ", celula: (c) => <span className="font-mono text-navy-900/70">{c.cnpj}</span> },
  { chave: "municipio", cabecalho: "Município", celula: (c) => <span className="text-navy-900/70">{`${c.municipio}/${c.uf}`}</span> },
  { chave: "situacao", cabecalho: "Situação", celula: (c) => <StatusBadge tone={c.situacao === "ATIVA" ? "ok" : "danger"}>{c.situacao}</StatusBadge> },
];

// RF007, RF013: catalog of concedentes and registration (administrator or coordination)
export default async function ConcedentesPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const { items } = await listConcedentes(identity, { page: 1, limit: 100 });

  return (
    <section className="flex flex-col gap-6">
      <PageHeader eyebrow="M03 Concedentes e Convênios" title="Concedentes" description="Cadastro, situação e convênios das concedentes (RF007-RF014)." />
      {items.length === 0 ? (
        <EstadoVazio variante="vazio" titulo="Nenhuma concedente" descricao="Cadastre a primeira no formulário abaixo." />
      ) : (
        <DataTable columns={COLUNAS} items={items} getRowKey={(c) => c.id} testId="concedentes-lista" />
      )}
      <div>
        <h2 className="mb-3 text-sm font-medium text-navy-900/60">Nova concedente</h2>
        <FormularioApi
          url="/api/v1/concedentes"
          rotuloEnviar="Cadastrar concedente"
          redirecionarPara="/administracao/concedentes/:id"
          campos={[
            { nome: "razao_social", rotulo: "Razão social" },
            { nome: "nome_fantasia", rotulo: "Nome fantasia" },
            { nome: "cnpj", rotulo: "CNPJ (numérico ou alfanumérico)" },
            { nome: "area_atuacao", rotulo: "Área de atuação" },
            { nome: "logradouro", rotulo: "Logradouro" },
            { nome: "numero_endereco", rotulo: "Número" },
            { nome: "complemento", rotulo: "Complemento" },
            { nome: "bairro", rotulo: "Bairro" },
            { nome: "municipio", rotulo: "Município" },
            { nome: "uf", rotulo: "UF" },
            { nome: "cep", rotulo: "CEP" },
            { nome: "email_contato", rotulo: "E-mail de contato", tipo: "email" },
            { nome: "telefone_contato", rotulo: "Telefone" },
            { nome: "representante_legal_nome", rotulo: "Representante legal" },
            { nome: "representante_legal_cargo", rotulo: "Cargo do representante" },
          ]}
        />
      </div>
    </section>
  );
}
