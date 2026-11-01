import Link from "next/link";
import { redirect } from "next/navigation";
import { lerConsulta, type SearchParamsBrutos } from "@/lib/consulta";
import { formatarData, hojeSaoPaulo, prazoEmPalavras } from "@/lib/datas";
import { getIdentity } from "@/lib/session";
import { listDocumentosEmGuarda } from "@/modules/administracao/services/guarda-service";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { cn } from "@/shared/ui/cn";
import { DataTable } from "@/shared/ui/data-table";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

// RF069, RN-30: documentos com prazo de guarda vencido (para eliminar) e os que vencem nos
// próximos 90 dias (para planejar). Só metadados, nunca nome nem conteúdo (RN-38). Eliminar
// remove o arquivo de forma definitiva; a linha e o hash ficam e a operação é auditada.

const TIPO_DOCUMENTO: Record<string, string> = {
  TCE: "Termo de compromisso",
  ADITIVO: "Aditivo",
  PLANO_ATIVIDADES: "Plano de atividades",
  APOLICE: "Apólice de seguro",
  ASSINATURA: "Comprovante de assinatura",
  CONVENIO: "Convênio",
  RELATORIO: "Anexo de relatório",
  ATESTADO_AFASTAMENTO: "Atestado de afastamento",
  COMPROVANTE_ATIVIDADE: "Comprovante de atividade",
  RESCISAO: "Termo de rescisão",
  DECLARACAO: "Declaração",
  DISPENSA_DURACAO: "Documento de dispensa",
};
const ESCOPO: Record<string, string> = { ESTAGIO: "Estágio", CONCEDENTE: "Concedente", ESTUDANTE: "Estudante" };

export default async function GuardaDocumentalPage({ searchParams }: { searchParams: Promise<SearchParamsBrutos> }) {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const consulta = lerConsulta(await searchParams);
  const hoje = hojeSaoPaulo();
  const proximos = consulta.visao === "proximos";
  const limite = new Date(Date.parse(`${hoje}T12:00:00Z`) + 90 * 86_400_000).toISOString().slice(0, 10);
  const itens = (await listDocumentosEmGuarda(identity, proximos ? limite : null)).filter((item) => (proximos ? item.dataLiberacaoGuarda > hoje : true));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Guarda documental"
        description="O prazo conta do encerramento do estágio, do convênio ou do curso do estudante. Depois dele, o arquivo pode ser eliminado; o registro e o hash permanecem."
      />
      <nav aria-label="Visões" className="flex gap-2">
        {[
          { href: "/administracao/guarda-documental", rotulo: "Prazo vencido", ativa: !proximos },
          { href: "/administracao/guarda-documental?visao=proximos", rotulo: "Vencem em 90 dias", ativa: proximos },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.ativa ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center rounded-full border px-3.5 text-sm focus-visible:ring-2 focus-visible:ring-azul-500 focus-visible:outline-none",
              item.ativa ? "border-navy-700 bg-navy-700 text-white" : "border-navy-900/15 bg-white text-navy-900/75 hover:bg-nevoa-100",
            )}
          >
            {item.rotulo}
          </Link>
        ))}
      </nav>
      {itens.length === 0 ? (
        <EstadoVazio
          titulo={proximos ? "Nada vence nos próximos 90 dias" : "Nenhum documento a eliminar"}
          descricao="Nenhum documento nesta situação, ou o seu perfil não administra a guarda (somente o administrador)."
        />
      ) : (
        <DataTable
          items={itens}
          getRowKey={(item) => item.id}
          testId="guarda-documental"
          columns={[
            {
              chave: "tipo",
              cabecalho: "Documento",
              celula: (item) => (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-navy-900">{TIPO_DOCUMENTO[item.tipo] ?? item.tipo}</span>
                  {item.sensivel && <StatusBadge tone="pending">Dado sensível</StatusBadge>}
                </span>
              ),
            },
            { chave: "escopo", cabecalho: "Vinculado a", ocultarNoCelular: true, celula: (item) => ESCOPO[item.escopo] ?? item.escopo },
            {
              chave: "prazo",
              cabecalho: "Guarda até",
              celula: (item) => (
                <span className="flex flex-col">
                  <span className="text-navy-900">{formatarData(item.dataLiberacaoGuarda)}</span>
                  <span className="text-xs text-navy-900/60">{prazoEmPalavras(item.dataLiberacaoGuarda, hoje)}</span>
                </span>
              ),
            },
            {
              chave: "acao",
              cabecalho: "",
              alinhar: "direita",
              celula: (item) =>
                item.dataLiberacaoGuarda <= hoje ? (
                  <BotaoAcao
                    url={`/api/v1/guarda-documental/${item.id}/eliminacao`}
                    rotulo="Eliminar arquivo"
                    variante="destructive"
                    tamanho="sm"
                    confirmacao={{
                      titulo: "Eliminar o arquivo?",
                      descricao: "O arquivo é removido do armazenamento e não pode ser recuperado. O registro, o hash e a trilha de auditoria permanecem.",
                      confirmar: "Eliminar",
                    }}
                    sucesso="Arquivo eliminado"
                  />
                ) : (
                  <span className="text-xs text-navy-900/60">Ainda em guarda</span>
                ),
            },
          ]}
        />
      )}
    </div>
  );
}
