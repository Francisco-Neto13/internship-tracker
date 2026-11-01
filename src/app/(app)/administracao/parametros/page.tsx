import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { dataLocal } from "@/modules/academico/domain/parametros";
import { getParametrosVigentes, listHistoricoParametros } from "@/modules/academico/services/parametro-service";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { PageHeader } from "@/shared/ui/page-header";

// RF006: parameters in force and a new version (administrator). Versions never start in the
// past, so validations already done keep the parameters of their date (DER §5.5).
export default async function ParametrosPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  const [vigente, historico] = await Promise.all([getParametrosVigentes(identity), listHistoricoParametros(identity)]);

  const linhas: [string, string][] = [
    ["Origem", vigente.origem === "PADRAO_LEGAL" ? "Padrão legal (nenhuma versão registrada)" : `Versão desde ${vigente.vigenciaInicio}`],
    ["Jornada diária (obrigatório / não obrigatório)", `${vigente.limiteDiarioObrigatorioMinutos / 60} h / ${vigente.limiteDiarioNaoObrigatorioMinutos / 60} h`],
    ["Jornada semanal", `${vigente.limiteSemanalMinutos / 60} h`],
    ["Excedente de jornada", vigente.bloquearExcedente ? "Bloqueia" : "Sinaliza"],
    ["Duração máxima", `${vigente.duracaoMaximaMeses} meses`],
    ["Tolerância de divergência", `${vigente.toleranciaDivergenciaPercentual}%`],
    ["Prazo de guarda", `${vigente.prazoGuardaAnos} anos`],
    ["Alerta de convênio a vencer", `${vigente.antecedenciaAlertaConvenioDias} dias`],
  ];

  return (
    <section className="flex flex-col gap-6">
      <PageHeader eyebrow="M02 Gestão Acadêmica" title="Parâmetros institucionais" description="Limites de jornada, duração máxima, tolerância e prazos (RF006)." />
      <dl className="surface-card grid gap-2 p-5 text-sm sm:grid-cols-2" data-testid="parametros-vigentes">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo} className="flex flex-col">
            <dt className="text-navy-900/60">{rotulo}</dt>
            <dd className="text-navy-900">{valor}</dd>
          </div>
        ))}
      </dl>

      <div>
        <h2 className="mb-3 text-sm font-medium text-navy-900/60">Nova versão (a partir de hoje ou depois)</h2>
        <FormularioApi
          url="/api/v1/parametros"
          metodo="PUT"
          rotuloEnviar="Registrar versão"
          campos={[
            { nome: "vigencia_inicio", rotulo: "Vigência a partir de", tipo: "date", valorInicial: dataLocal() },
            { nome: "limite_horas_diarias_obrigatorio", rotulo: "Jornada diária, obrigatório (h)", tipo: "number", passo: "0.25", valorInicial: vigente.limiteDiarioObrigatorioMinutos / 60 },
            { nome: "limite_horas_diarias_nao_obrigatorio", rotulo: "Jornada diária, não obrigatório (h)", tipo: "number", passo: "0.25", valorInicial: vigente.limiteDiarioNaoObrigatorioMinutos / 60 },
            { nome: "limite_horas_semanais", rotulo: "Jornada semanal (h)", tipo: "number", passo: "0.25", valorInicial: vigente.limiteSemanalMinutos / 60 },
            { nome: "bloquear_excedente", rotulo: "Bloquear lançamento acima do limite", tipo: "checkbox", valorInicial: vigente.bloquearExcedente },
            { nome: "duracao_maxima_meses", rotulo: "Duração máxima (meses)", tipo: "number", valorInicial: vigente.duracaoMaximaMeses },
            { nome: "tolerancia_divergencia_percentual", rotulo: "Tolerância de divergência (%)", tipo: "number", passo: "0.01", valorInicial: vigente.toleranciaDivergenciaPercentual },
            { nome: "prazo_guarda_anos", rotulo: "Prazo de guarda (anos)", tipo: "number", valorInicial: vigente.prazoGuardaAnos },
            { nome: "antecedencia_alerta_convenio_dias", rotulo: "Alerta de convênio (dias)", tipo: "number", valorInicial: vigente.antecedenciaAlertaConvenioDias },
          ]}
        />
      </div>

      {historico.length > 0 && (
        <ul className="surface-card flex flex-col divide-y divide-navy-900/10 text-sm" data-testid="parametros-historico">
          {historico.map((versao) => (
            <li key={versao.id} className="px-5 py-3 text-navy-900">
              Desde {versao.vigenciaInicio}: {versao.limiteSemanalMinutos / 60} h/semana, {versao.duracaoMaximaMeses} meses, tolerância{" "}
              {versao.toleranciaDivergenciaPercentual}%
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
