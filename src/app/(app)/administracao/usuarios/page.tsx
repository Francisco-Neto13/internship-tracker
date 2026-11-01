import Link from "next/link";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { listCursos } from "@/modules/academico/services/curso-service";
import { catalogoPerfis } from "@/modules/acesso/domain/catalogo-perfis";
import { listConcedentes } from "@/modules/concedentes/services/concedente-service";
import { ROTULO_PERFIL } from "@/modules/acesso/schemas/perfil";
import { listUsuarios, type UsuarioComPerfis } from "@/modules/acesso/services/usuario-service";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
import { UsuarioForm } from "./usuario-form";

const COLUNAS: DataTableColumn<UsuarioComPerfis>[] = [
  {
    chave: "nome",
    cabecalho: "Nome",
    celula: (usuario) => (
      <Link href={`/administracao/usuarios/${usuario.id}`} className="text-navy-900 underline-offset-4 hover:underline">
        {usuario.nome}
      </Link>
    ),
  },
  { chave: "email", cabecalho: "E-mail", celula: (usuario) => <span className="text-navy-900/70">{usuario.email}</span> },
  {
    chave: "perfis",
    cabecalho: "Perfis",
    celula: (usuario) => (
      <span className="text-navy-900/70">
        {usuario.perfis.map((vinculo) => ROTULO_PERFIL[vinculo.perfil]).join(", ") || "-"}
      </span>
    ),
  },
  {
    chave: "situacao",
    cabecalho: "Situação",
    celula: (usuario) => (
      <StatusBadge tone={usuario.situacao === "ATIVO" ? "ok" : "neutral"}>{usuario.situacao}</StatusBadge>
    ),
  },
];

export default async function UsuariosPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");

  const [{ items }, { items: cursos }, { items: concedentes }] = await Promise.all([
    listUsuarios(identity, { page: 1, limit: 100 }),
    listCursos(identity, { page: 1, limit: 100 }),
    listConcedentes(identity, { page: 1, limit: 100, situacao: "ATIVA" }),
  ]);

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        eyebrow="M01 Acesso e Usuários"
        title="Usuários"
        description="Cadastro, edição e inativação de usuários e vínculos de perfil (RF001-RF003)."
      />

      {items.length === 0 ? (
        <EstadoVazio variante="vazio" titulo="Nenhum usuário visível" descricao="Nenhum usuário no seu recorte de acesso." />
      ) : (
        <DataTable columns={COLUNAS} items={items} getRowKey={(usuario) => usuario.id} testId="usuarios-lista" />
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium text-navy-900/60">Novo usuário</h2>
        <UsuarioForm
          catalogo={catalogoPerfis()}
          cursos={cursos.map((curso) => ({ id: curso.id, nome: curso.nome }))}
          concedentes={concedentes.map((concedente) => ({ id: concedente.id, nome: concedente.razaoSocial }))}
        />
      </div>
    </section>
  );
}
