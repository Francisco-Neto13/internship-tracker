import Link from "next/link";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { listEstudantes } from "@/modules/academico/services/estudante-service";
import { listConcedentes } from "@/modules/concedentes/services/concedente-service";
import { listConveniosDaConcedente } from "@/modules/concedentes/services/convenio-service";
import { dataLocal } from "@/modules/academico/domain/parametros";
import { listEstagios } from "@/modules/estagios/services/estagio-service";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge, type StatusTone } from "@/shared/ui/status-badge";

type Estagio = Awaited<ReturnType<typeof listEstagios>>["items"][number];

// Requisitos §8.6: the four states, with the labels shown in the interface
const ROTULO: Record<string, [string, StatusTone]> = {
  EM_FORMALIZACAO: ["Em formalização", "pending"],
  ATIVO: ["Ativo", "ok"],
  CONCLUIDO: ["Concluído", "neutral"],
  RESCINDIDO: ["Rescindido", "danger"],
};

const COLUNAS: DataTableColumn<Estagio>[] = [
  {
    chave: "estudante",
    cabecalho: "Estudante",
    celula: (e) => (
      <Link href={`/estagios/${e.id}`} className="text-navy-900 underline-offset-4 hover:underline">
        {e.estudanteNome ?? e.matricula ?? e.estudanteId}
      </Link>
    ),
  },
  { chave: "concedente", cabecalho: "Concedente", celula: (e) => <span className="text-navy-900/70">{e.concedenteRazaoSocial}</span> },
  { chave: "periodo", cabecalho: "Período", celula: (e) => <span className="text-navy-900/70">{`${e.dataInicio} a ${e.dataFimPrevista}`}</span> },
  { chave: "tipo", cabecalho: "Tipo", celula: (e) => <span className="text-navy-900/70">{e.tipo === "OBRIGATORIO" ? "Obrigatório" : "Não obrigatório"}</span> },
  { chave: "situacao", cabecalho: "Situação", celula: (e) => <StatusBadge tone={ROTULO[e.situacao][1]}>{ROTULO[e.situacao][0]}</StatusBadge> },
];

// RF015, RN-37: internships the caller may see, and the formalization form (coordination)
export default async function EstagiosPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const [{ items }, { items: estudantes }, { items: concedentes }] = await Promise.all([
    listEstagios(identity, { page: 1, limit: 100 }),
    listEstudantes(identity, { page: 1, limit: 100, situacao: "MATRICULADO" }),
    listConcedentes(identity, { page: 1, limit: 100, situacao: "ATIVA" }),
  ]);
  const hoje = dataLocal();
  const convenios = (await Promise.all(concedentes.map((c) => listConveniosDaConcedente(identity, c.id).catch(() => []))))
    .flat()
    .filter((convenio) => convenio.vigencias.some((v) => v.vigenciaFim >= hoje) && convenio.situacao === "ATIVO");
  const nomeConcedente = new Map(concedentes.map((c) => [c.id, c.razaoSocial]));

  return (
    <section className="flex flex-col gap-6">
      <PageHeader eyebrow="M04 Gestão de Estágios" title="Estágios" description="Formalização, ativação e acompanhamento do TCE (RF015-RF021, RF031-RF035)." />
      {items.length === 0 ? (
        <EstadoVazio variante="vazio" titulo="Nenhum estágio visível" descricao="Nenhum estágio no seu recorte de acesso." />
      ) : (
        <DataTable columns={COLUNAS} items={items} getRowKey={(e) => e.id} testId="estagios-lista" />
      )}

      {estudantes.length > 0 && convenios.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-navy-900/60">Formalizar estágio (TCE)</h2>
          <FormularioApi
            url="/api/v1/estagios"
            rotuloEnviar="Criar estágio"
            redirecionarPara="/estagios/:id"
            campos={[
              { nome: "estudante_id", rotulo: "Estudante", tipo: "select", obrigatorio: true, opcoes: estudantes.map((e) => ({ valor: e.id, rotulo: `${e.nome ?? ""} (${e.matricula})` })) },
              {
                nome: "convenio_id",
                rotulo: "Convênio",
                tipo: "select",
                obrigatorio: true,
                opcoes: convenios.map((c) => ({ valor: `${c.id}`, rotulo: `${c.numero} · ${nomeConcedente.get(c.concedenteId)}` })),
              },
              { nome: "concedente_id", rotulo: "Concedente (a mesma do convênio)", tipo: "select", obrigatorio: true, opcoes: concedentes.map((c) => ({ valor: c.id, rotulo: c.razaoSocial })) },
              { nome: "tipo", rotulo: "Tipo", tipo: "select", obrigatorio: true, opcoes: [{ valor: "OBRIGATORIO", rotulo: "Obrigatório" }, { valor: "NAO_OBRIGATORIO", rotulo: "Não obrigatório" }] },
              { nome: "data_inicio", rotulo: "Início", tipo: "date" },
              { nome: "data_fim_pactuada", rotulo: "Término pactuado", tipo: "date" },
              { nome: "carga_horas_diaria", rotulo: "Jornada diária (h)", tipo: "number", passo: "0.25" },
              { nome: "carga_horas_semanal", rotulo: "Jornada semanal (h)", tipo: "number", passo: "0.25" },
              { nome: "carga_horas_total", rotulo: "Carga total (h)", tipo: "number", passo: "0.25" },
              { nome: "bolsa_valor", rotulo: "Bolsa (R$)", tipo: "number", passo: "0.01" },
              { nome: "auxilio_transporte_valor", rotulo: "Auxílio-transporte (R$)", tipo: "number", passo: "0.01" },
              { nome: "seguro_exigido", rotulo: "Seguro exigido (Lei 11.788/2008, art. 9º, IV)", tipo: "checkbox", valorInicial: true },
              { nome: "condicoes_pactuadas", rotulo: "Condições pactuadas", tipo: "textarea" },
            ]}
          />
        </div>
      )}
    </section>
  );
}
