import { redirect } from "next/navigation";
import { formatarData } from "@/lib/datas";
import { getIdentity } from "@/lib/session";
import { dataLocal } from "@/modules/academico/domain/parametros";
import { getParametrosVigentes, listHistoricoParametros } from "@/modules/academico/services/parametro-service";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { Painel } from "@/shared/ui/painel";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

// RF006: regras gerais que todos os cursos seguem, agrupadas pelo que controlam e com o efeito
// de cada uma. Uma versão nova nunca começa no passado: o que já foi validado mantém o parâmetro
// da sua data (DER §5.5), e a página diz isso antes de salvar.

const horas = (minutos: number) => `${(minutos / 60).toLocaleString("pt-BR")} h`;

export default async function ParametrosPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const [vigente, historico] = await Promise.all([getParametrosVigentes(identity), listHistoricoParametros(identity)]);

  const grupos: { titulo: string; efeito: string; itens: [string, string][] }[] = [
    {
      titulo: "Jornada",
      efeito: "Limita cada lançamento de frequência (Lei 11.788/2008, art. 10).",
      itens: [
        ["Diária, estágio obrigatório", horas(vigente.limiteDiarioObrigatorioMinutos)],
        ["Diária, não obrigatório", horas(vigente.limiteDiarioNaoObrigatorioMinutos)],
        ["Semanal (semana ISO)", horas(vigente.limiteSemanalMinutos)],
        ["Acima do limite", vigente.bloquearExcedente ? "Bloqueia o lançamento" : "Aceita e sinaliza"],
      ],
    },
    {
      titulo: "Duração",
      efeito: "Teto do TCE, das prorrogações e dos afastamentos no par estudante–concedente (art. 11).",
      itens: [["Duração máxima", `${vigente.duracaoMaximaMeses} meses`]],
    },
    {
      titulo: "Acompanhamento",
      efeito: "Quando a diferença entre horas cumpridas e previstas abre um caso para o orientador (RF028).",
      itens: [["Tolerância de divergência", `${vigente.toleranciaDivergenciaPercentual.toLocaleString("pt-BR")}%`]],
    },
    {
      titulo: "Conformidade",
      efeito: "Prazo de guarda dos documentos e antecedência do aviso de convênio a vencer (RF012, RF069).",
      itens: [
        ["Prazo de guarda", `${vigente.prazoGuardaAnos} anos`],
        ["Aviso de convênio a vencer", `${vigente.antecedenciaAlertaConvenioDias} dias antes`],
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Parâmetros institucionais"
        description="Regras gerais que valem para todos os cursos. Uma nova versão vale a partir da data escolhida; o passado mantém o parâmetro da sua época."
        meta={
          <StatusBadge tone={vigente.origem === "PADRAO_LEGAL" ? "neutral" : "ok"}>
            {vigente.origem === "PADRAO_LEGAL" ? "Padrão legal: nenhuma versão registrada" : `Versão vigente desde ${formatarData(vigente.vigenciaInicio)}`}
          </StatusBadge>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="parametros-vigentes">
        {grupos.map((grupo) => (
          <Painel key={grupo.titulo} titulo={grupo.titulo} descricao={grupo.efeito}>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {grupo.itens.map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <dt className="text-xs text-navy-900/60">{rotulo}</dt>
                  <dd className="text-lg font-semibold text-navy-900 tabular-nums">{valor}</dd>
                </div>
              ))}
            </dl>
          </Painel>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Painel titulo="Nova versão" descricao="Começa hoje ou depois. Lançamentos, relatórios e prazos já calculados não mudam.">
          <FormularioApi
            url="/api/v1/parametros"
            metodo="PUT"
            rotuloEnviar="Registrar versão"
confirmacao={{ titulo: "Registrar esta versão dos parâmetros?", descricao: "Parâmetros não se editam: esta versão vale a partir da data de início para todos os cursos, e a anterior fica no histórico. Para corrigir, é preciso registrar outra versão.", confirmar: "Registrar versão" }}
            embutido
            sucesso="Versão registrada"
            campos={[
              { nome: "vigencia_inicio", rotulo: "Vale a partir de", tipo: "date", valorInicial: dataLocal() },
              { nome: "limite_horas_diarias_obrigatorio", rotulo: "Jornada diária, obrigatório (h)", tipo: "number", passo: "0.25", valorInicial: vigente.limiteDiarioObrigatorioMinutos / 60 },
              { nome: "limite_horas_diarias_nao_obrigatorio", rotulo: "Jornada diária, não obrigatório (h)", tipo: "number", passo: "0.25", valorInicial: vigente.limiteDiarioNaoObrigatorioMinutos / 60 },
              { nome: "limite_horas_semanais", rotulo: "Jornada semanal (h)", tipo: "number", passo: "0.25", valorInicial: vigente.limiteSemanalMinutos / 60, ajuda: "A lei permite até 30 h." },
              { nome: "duracao_maxima_meses", rotulo: "Duração máxima (meses)", tipo: "number", valorInicial: vigente.duracaoMaximaMeses, ajuda: "A lei permite até 24 meses." },
              { nome: "tolerancia_divergencia_percentual", rotulo: "Tolerância de divergência (%)", tipo: "number", passo: "0.01", valorInicial: vigente.toleranciaDivergenciaPercentual },
              { nome: "prazo_guarda_anos", rotulo: "Prazo de guarda (anos)", tipo: "number", valorInicial: vigente.prazoGuardaAnos },
              { nome: "antecedencia_alerta_convenio_dias", rotulo: "Aviso de convênio (dias)", tipo: "number", valorInicial: vigente.antecedenciaAlertaConvenioDias },
              { nome: "bloquear_excedente", rotulo: "Bloquear lançamento acima do limite de jornada", tipo: "checkbox", valorInicial: vigente.bloquearExcedente },
            ]}
          />
        </Painel>
        <Painel titulo="Histórico de versões" descricao="Cada versão vale até o início da seguinte." flush>
          {historico.length === 0 ? (
            <p className="px-5 py-4 text-sm text-navy-900/60">Nenhuma versão registrada: vale o padrão legal.</p>
          ) : (
            <ol className="divide-y divide-navy-900/[0.07]" data-testid="parametros-historico">
              {historico.map((versao) => (
                <li key={versao.id} className="px-5 py-3 text-sm">
                  <span className="block font-medium text-navy-900">Desde {formatarData(versao.vigenciaInicio)}</span>
                  <span className="block text-xs text-navy-900/60">
                    {horas(versao.limiteSemanalMinutos)}/semana · {versao.duracaoMaximaMeses} meses · tolerância {versao.toleranciaDivergenciaPercentual}% · guarda {versao.prazoGuardaAnos} anos
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Painel>
      </div>
    </div>
  );
}
