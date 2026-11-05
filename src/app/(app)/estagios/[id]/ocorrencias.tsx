import { BaixarDocumento } from "@/shared/ui/baixar-documento";
import { LIMITE } from "@/lib/campos";
import { formatarDataCurta } from "@/lib/datas";
import { minutosParaHoras } from "@/lib/horas";
import type { Identity } from "@/lib/identity";
import type { EstagioRow } from "@/modules/estagios/repositories/estagio-repository";
import { listAfastamentos, listPeriodosAfastamento } from "@/modules/estagios/services/afastamento-service";
import { getRescisao } from "@/modules/estagios/services/encerramento-service";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { ListaDefinicao, Painel } from "@/shared/ui/painel";
import { StatusBadge } from "@/shared/ui/status-badge";
import { NovoAfastamento } from "./novo-afastamento";

// Ocorrências de um estágio (Fase 5): afastamentos (RF059, RF060), encerramento por conclusão
// ou rescisão (RF045, RF063, RF064) e a declaração de conclusão (RF058). Cada ação vai à API,
// que decide por perfil e vínculo; as que não se desfazem pedem confirmação.

const TIPO_AFASTAMENTO: Record<string, string> = { LICENCA: "Licença", ATESTADO_MEDICO: "Atestado médico", OUTRO: "Outro" };
const SOLICITANTE: Record<string, string> = { ESTUDANTE: "Estudante", CONCEDENTE: "Concedente", INSTITUICAO: "Instituição" };

export async function OcorrenciasEstagio({ identity, estagio }: { identity: Identity; estagio: EstagioRow }) {
  const id = estagio.id;
  const api = `/api/v1/estagios/${id}`;
  const [afastamentos, periodos, rescisao] = await Promise.all([
    listAfastamentos(identity, id),
    listPeriodosAfastamento(identity, id),
    estagio.situacao === "RESCINDIDO" ? getRescisao(identity, id).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-4">
      {rescisao && (
        <Painel titulo="Rescisão" descricao="Horas consolidadas até a data da rescisão (RF064).">
          <div data-testid="rescisao-registrada">
            <ListaDefinicao
              colunas={3}
              itens={[
                { rotulo: "Data", valor: formatarDataCurta(rescisao.dataRescisao) },
                { rotulo: "Solicitante", valor: SOLICITANTE[rescisao.solicitante] },
                { rotulo: "Horas cumpridas", valor: `${minutosParaHoras(rescisao.minutosCumpridosConsolidados)} h` },
                { rotulo: "Horas homologadas", valor: `${minutosParaHoras(rescisao.minutosHomologadosConsolidados)} h` },
                { rotulo: "Motivo", valor: rescisao.motivo, largo: true },
              ]}
            />
          </div>
        </Painel>
      )}

      {estagio.situacao === "CONCLUIDO" && (
        <Painel titulo="Declaração de conclusão" descricao="PDF com código de verificação, guardado como documento do estágio (RF058).">
          <BotaoAcao
            url={`/api/v1/estudantes/${estagio.estudanteId}/declaracoes`}
            rotulo="Emitir declaração de conclusão"
            confirmacao={{ titulo: "Emitir a declaração?", descricao: "A declaração fica registrada com um código de verificação público e não pode ser alterada.", confirmar: "Emitir" }}
            corpo={{ tipo: "CONCLUSAO_ESTAGIO", estagio_id: id }}
            variante="default"
            sucesso="Declaração emitida: veja na integralização do estudante"
          />
        </Painel>
      )}

      {estagio.situacao !== "EM_FORMALIZACAO" && (
        <Painel titulo="Afastamentos" descricao="Estendem o término previsto pelos mesmos dias corridos, até o teto de 2 anos na concedente (RF060)." flush>
          <ul className="divide-y divide-navy-900/[0.07]" data-testid="afastamentos">
            {afastamentos.length > 0
              ? afastamentos.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                    <span>
                      <span className="block font-medium text-navy-900">
                        {TIPO_AFASTAMENTO[item.tipo]} · {formatarDataCurta(item.dataInicio)} a {formatarDataCurta(item.dataFim)}
                      </span>
                      <span className="block text-xs text-navy-900/65">
                        {item.diasCorridos} dia(s) corridos · estendeu {item.diasExtensao}
                        {item.diasExtensao < item.diasCorridos && " (teto de 2 anos atingido)"}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      {item.situacao === "SUBSTITUIDO" && <StatusBadge tone="neutral">Substituído por correção</StatusBadge>}
                      {/* The API decides who reads it and records the reading (RF071, RF072) */}
                      <BaixarDocumento documentoId={item.documentoId} rotulo="Baixar comprovante" />
                    </span>
                  </li>
                ))
              : periodos.map((periodo) => (
                  <li key={periodo.dataInicio} className="px-5 py-3 text-sm text-navy-900">
                    Afastamento de {formatarDataCurta(periodo.dataInicio)} a {formatarDataCurta(periodo.dataFim)}
                  </li>
                ))}
            {afastamentos.length === 0 && periodos.length === 0 && <li className="px-5 py-4 text-sm text-navy-900/65">Nenhum afastamento.</li>}
          </ul>
          {estagio.situacao === "ATIVO" && (
            <details className="border-t border-navy-900/[0.07] px-5 py-4">
              <summary className="cursor-pointer text-sm font-medium text-azul-500 hover:text-navy-700">Registrar afastamento (coordenação)</summary>
              <div className="mt-4">
                <NovoAfastamento estagioId={id} />
              </div>
            </details>
          )}
        </Painel>
      )}

      {estagio.situacao === "ATIVO" && (
        <div className="colunas-alinhadas grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Painel titulo="Concluir estágio" descricao="Exige avaliação final e, se obrigatório, carga mínima homologada e relatório final aprovado; nenhum lançamento pendente (RF045).">
            <BotaoAcao
              url={`${api}/conclusao`}
              rotulo="Concluir estágio"
              variante="default"
              confirmacao={{
                titulo: "Concluir o estágio?",
                descricao: "O estágio passa a Concluído, os responsáveis deixam de ter acesso e começa o prazo de guarda dos documentos. Se faltar algum requisito, a lista aparece aqui e nada muda.",
                confirmar: "Concluir",
              }}
              sucesso="Estágio concluído"
            />
          </Painel>
          <Painel titulo="Rescindir estágio" descricao="Encerramento antecipado a pedido de uma das partes; as horas até a data são consolidadas (RF063, RF064).">
            <FormularioApi
              validacao="rescisao"
                  url={`${api}/rescisao`}
              rotuloEnviar="Registrar rescisão"
confirmacao={{ titulo: "Rescindir o estágio?", descricao: "A rescisão é definitiva: o estágio não volta a ficar ativo, os lançamentos depois da data são cancelados, as horas são consolidadas até ela e orientador e supervisor perdem o acesso.", confirmar: "Rescindir estágio", destrutiva: true }}
              testId="rescisao"
              embutido
              sucesso="Rescisão registrada"
              campos={[
                { nome: "data_rescisao", rotulo: "Data da rescisão", tipo: "date", obrigatorio: true },
                {
                  nome: "solicitante",
                  rotulo: "Solicitante",
                  tipo: "select",
                  obrigatorio: true,
                  opcoes: Object.entries(SOLICITANTE).map(([valor, rotulo]) => ({ valor, rotulo })),
                },
                { nome: "motivo", max: LIMITE.motivoRescisao, rotulo: "Motivo", tipo: "textarea", obrigatorio: true, ajuda: "Lançamentos depois da data são cancelados; a rescisão não se desfaz." },
              ]}
            />
          </Painel>
        </div>
      )}
    </div>
  );
}
