import type { Identity } from "@/lib/identity";
import { listAfastamentos, listPeriodosAfastamento } from "@/modules/estagios/services/afastamento-service";
import { getRescisao } from "@/modules/estagios/services/encerramento-service";
import type { EstagioRow } from "@/modules/estagios/repositories/estagio-repository";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { NovoAfastamento } from "./novo-afastamento";

// Fase 5 on the internship page: documents (RF022), leaves (RF059, RF060), end by conclusion
// or rescission (RF045, RF063, RF064) and the conclusion declaration (RF058). Each action
// goes to the API, which decides by profile and link; refused actions show its message.

const data = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const TIPO_AFASTAMENTO: Record<string, string> = { LICENCA: "Licença", ATESTADO_MEDICO: "Atestado médico", OUTRO: "Outro" };
const SOLICITANTE: Record<string, string> = { ESTUDANTE: "Estudante", CONCEDENTE: "Concedente", INSTITUICAO: "Instituição" };

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-navy-900/60">{titulo}</h2>
      {children}
    </div>
  );
}

const linkClass = "text-sm text-azul-600 underline-offset-4 hover:underline";

export async function OcorrenciasEstagio({ identity, estagio, aditivos }: { identity: Identity; estagio: EstagioRow; aditivos: { id: string; numero: number }[] }) {
  const id = estagio.id;
  const api = `/api/v1/estagios/${id}`;
  const [afastamentos, periodos, rescisao] = await Promise.all([
    listAfastamentos(identity, id),
    listPeriodosAfastamento(identity, id),
    estagio.situacao === "RESCINDIDO" ? getRescisao(identity, id).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <>
      <Bloco titulo="Documentos (RF022)">
        <div className="flex flex-wrap gap-4" data-testid="documentos-estagio">
          <a className={linkClass} href={`${api}/tce/pdf`}>
            TCE (PDF)
          </a>
          <a className={linkClass} href={`${api}/plano-atividades/pdf`}>
            Plano de atividades (PDF)
          </a>
          {aditivos.map((aditivo) => (
            <a key={aditivo.id} className={linkClass} href={`/api/v1/aditivos/${aditivo.id}/pdf`}>
              Aditivo nº {aditivo.numero} (PDF)
            </a>
          ))}
        </div>
      </Bloco>

      {estagio.situacao !== "EM_FORMALIZACAO" && (
        <Bloco titulo="Afastamentos (RF059, RF060)">
          <ul className="surface-card flex flex-col divide-y divide-navy-900/10 text-sm" data-testid="afastamentos">
            {afastamentos.length > 0
              ? afastamentos.map((item) => (
                  <li key={item.id} className="px-5 py-3 text-navy-900">
                    {TIPO_AFASTAMENTO[item.tipo]} · {data(item.dataInicio)} a {data(item.dataFim)} · {item.diasCorridos} dia(s), estendeu {item.diasExtensao}
                    {item.diasExtensao < item.diasCorridos && " (teto de 2 anos atingido)"}
                    {item.situacao === "SUBSTITUIDO" && " · substituído por correção"}
                  </li>
                ))
              : periodos.map((periodo) => (
                  <li key={periodo.dataInicio} className="px-5 py-3 text-navy-900">
                    Afastamento de {data(periodo.dataInicio)} a {data(periodo.dataFim)}
                  </li>
                ))}
            {afastamentos.length === 0 && periodos.length === 0 && <li className="px-5 py-3 text-navy-900/60">Nenhum afastamento.</li>}
          </ul>
          {estagio.situacao === "ATIVO" && <NovoAfastamento estagioId={id} />}
        </Bloco>
      )}

      {estagio.situacao === "ATIVO" && (
        <Bloco titulo="Encerramento">
          <div className="flex flex-wrap gap-3">
            <BotaoAcao url={`${api}/conclusao`} rotulo="Concluir estágio (coordenação)" variante="default" />
          </div>
          <FormularioApi
            url={`${api}/rescisao`}
            rotuloEnviar="Registrar rescisão"
            testId="rescisao"
            campos={[
              { nome: "data_rescisao", rotulo: "Data da rescisão", tipo: "date", obrigatorio: true },
              {
                nome: "solicitante",
                rotulo: "Solicitante",
                tipo: "select",
                obrigatorio: true,
                opcoes: Object.entries(SOLICITANTE).map(([valor, rotulo]) => ({ valor, rotulo })),
              },
              { nome: "motivo", rotulo: "Motivo", tipo: "textarea", obrigatorio: true },
            ]}
          />
        </Bloco>
      )}

      {rescisao && (
        <Bloco titulo="Rescisão (RF063, RF064)">
          <p className="surface-card p-5 text-sm text-navy-900" data-testid="rescisao-registrada">
            Em {data(rescisao.dataRescisao)}, a pedido de {SOLICITANTE[rescisao.solicitante].toLowerCase()}: {rescisao.motivo}. Horas consolidadas:{" "}
            {rescisao.minutosCumpridosConsolidados / 60} h cumpridas, {rescisao.minutosHomologadosConsolidados / 60} h homologadas.
          </p>
        </Bloco>
      )}

      {estagio.situacao === "CONCLUIDO" && (
        <Bloco titulo="Declaração (RF058)">
          <div className="flex flex-wrap gap-3">
            <BotaoAcao
              url={`/api/v1/estudantes/${estagio.estudanteId}/declaracoes`}
              rotulo="Emitir declaração de conclusão"
              corpo={{ tipo: "CONCLUSAO_ESTAGIO", estagio_id: id }}
              variante="default"
            />
          </div>
        </Bloco>
      )}
    </>
  );
}
