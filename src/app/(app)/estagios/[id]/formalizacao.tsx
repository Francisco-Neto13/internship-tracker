import { LIMITE } from "@/lib/campos";
import { Check } from "lucide-react";
import { formatarData, formatarDataHora } from "@/lib/datas";
import type { ParteAssinatura } from "@/modules/estagios/domain/papeis";
import type { getEstagioDetalhado } from "@/modules/estagios/services/estagio-service";
import { BotaoAcao } from "@/shared/ui/botao-acao";
import { cn } from "@/shared/ui/cn";
import { FormularioApi } from "@/shared/ui/formulario-api";
import { Painel } from "@/shared/ui/painel";
import { StatusBadge } from "@/shared/ui/status-badge";
import { VincularResponsavel } from "./vincular-responsavel";

// RF015-RF021, RF031-RF035, D9: a formalização como uma trilha de etapas derivadas dos dados
// (não há estado próprio para cada etapa) e, abaixo, cada etapa com o que já existe e a ação que
// a conclui, só para quem a faz (`acoes`, de papeis.ts). Os botões chamam a API, que decide por
// perfil e vínculo; a ativação confere todas as guardas de uma vez e devolve a lista do que falta.

type Detalhe = Awaited<ReturnType<typeof getEstagioDetalhado>>;

const PARTE: Record<string, string> = {
  ESTUDANTE: "Estudante",
  INSTITUICAO: "Instituição",
  CONCEDENTE: "Concedente",
};
const PLANO: Record<
  string,
  { rotulo: string; tom: "ok" | "pending" | "neutral" | "danger" }
> = {
  RASCUNHO: { rotulo: "Rascunho", tom: "neutral" },
  AGUARDANDO_APROVACAO: { rotulo: "Aguardando o orientador", tom: "pending" },
  APROVADO: { rotulo: "Aprovado", tom: "ok" },
  DEVOLVIDO: { rotulo: "Devolvido", tom: "danger" },
  SUBSTITUIDO: { rotulo: "Substituído", tom: "neutral" },
};

function vigente(responsavel: Detalhe["responsaveis"][number]) {
  return (
    !responsavel.vigenciaFim ||
    responsavel.vigenciaFim > responsavel.vigenciaInicio
  );
}

export function TrilhaFormalizacao({ detalhe }: { detalhe: Detalhe }) {
  const { estagio, etapas, planos, responsaveis, apolices, acoes } = detalhe;
  const papeis = new Set(
    responsaveis.filter(vigente).map((responsavel) => responsavel.papel),
  );
  const passos = [
    {
      rotulo: "TCE fechado",
      feito: etapas.tce === "FECHADO",
      detalhe: etapas.tce === "FECHADO" ? "conteúdo congelado" : "em edição",
    },
    {
      rotulo: "Plano aprovado",
      feito: planos.some((plano) => plano.situacao === "APROVADO"),
      detalhe: planos[0]
        ? PLANO[planos[0].situacao].rotulo.toLowerCase()
        : "não registrado",
    },
    {
      rotulo: "Responsáveis",
      feito: papeis.has("ORIENTADOR") && papeis.has("SUPERVISOR"),
      detalhe: `${papeis.has("ORIENTADOR") ? "orientador ✓" : "orientador pendente"} · ${papeis.has("SUPERVISOR") ? "supervisor ✓" : "supervisor pendente"}`,
    },
    {
      rotulo: "Apólice",
      feito: !estagio.seguroExigido || apolices.length > 0,
      detalhe: !estagio.seguroExigido
        ? "não exigida"
        : apolices.length > 0
          ? "registrada"
          : "pendente",
    },
    {
      rotulo: "Assinaturas",
      feito: etapas.tce === "FECHADO" && etapas.partesPendentes.length === 0,
      detalhe:
        etapas.tce === "FECHADO"
          ? `${3 - etapas.partesPendentes.length} de 3`
          : "após fechar o TCE",
    },
  ];
  const prontos = passos.filter((passo) => passo.feito).length;
  return (
    <div className="surface-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-navy-900">Formalização</p>
          <p
            className="text-sm text-navy-900/65"
            data-testid="etapas-formalizacao"
          >
            {prontos} de {passos.length} etapas concluídas · TCE{" "}
            {etapas.tce === "FECHADO" ? "fechado para assinatura" : "em edição"}{" "}
            · assinaturas pendentes:{" "}
            {etapas.partesPendentes.length === 0
              ? "nenhuma"
              : etapas.partesPendentes
                  .map((parte) => PARTE[parte] ?? parte)
                  .join(", ")}
          </p>
        </div>
        {acoes.ativar && (
        <BotaoAcao
          url={`/api/v1/estagios/${estagio.id}/ativacao`}
          rotulo="Ativar estágio"
          variante="default"
          confirmacao={{
            titulo: "Ativar o estágio?",
            descricao:
              "O sistema confere todas as guardas de uma vez (concedente, convênio, plano, responsáveis, apólice, assinaturas, matrícula). Se faltar algo, a lista aparece aqui e nada muda.",
            confirmar: "Ativar",
          }}
          sucesso="Estágio ativado"
        />
        )}
      </div>
      <ol className="mt-5 grid gap-3 sm:grid-cols-5">
        {passos.map((passo, indice) => (
          <li key={passo.rotulo} className="flex items-start gap-2.5">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                passo.feito
                  ? "bg-status-ok-text text-white"
                  : "bg-nevoa-100 text-navy-900/65 ring-1 ring-navy-900/10",
              )}
              aria-hidden
            >
              {passo.feito ? <Check className="size-4" /> : indice + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-navy-900">
                {passo.rotulo}
              </span>
              <span className="block text-xs text-navy-900/65">
                {passo.detalhe}
              </span>
              <span className="sr-only">
                {passo.feito ? "concluída" : "pendente"}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function FormalizacaoEstagio({ detalhe }: { detalhe: Detalhe }) {
  const { estagio, etapas, planos, responsaveis, apolices, assinaturas, acoes } =
    detalhe;
  const emFormalizacao = estagio.situacao === "EM_FORMALIZACAO";
  const planoAtual = planos[0];
  const api = `/api/v1/estagios/${estagio.id}`;

  return (
    <div className="flex flex-col gap-4">
      {emFormalizacao && (
        <Painel
          titulo="Termo de Compromisso"
          descricao={
            etapas.tce === "EM_EDICAO"
              ? "Em edição. Ao fechar, o conteúdo congela e recebe o hash SHA-256 que as três partes assinam."
              : "Fechado para assinatura. Reabrir anula as assinaturas já colhidas (sem apagá-las) e volta à edição."
          }
        >
          <div className="flex flex-wrap gap-2">
            {etapas.tce === "EM_EDICAO" ? (
              acoes.fecharTce && (
              <BotaoAcao
                url={`${api}/tce/fechamento`}
                rotulo="Fechar TCE para assinatura"
                variante="default"
                confirmacao={{
                  titulo: "Fechar o TCE?",
                  descricao:
                    "O conteúdo congela e passa a ser assinado pelas partes. Para mudar algo depois, será preciso reabrir.",
                  confirmar: "Fechar TCE",
                }}
              />
              )
            ) : (
              <>
                {etapas.partesPendentes.filter((parte) => acoes.partesQueAssina.includes(parte as ParteAssinatura)).map((parte) => (
                  <BotaoAcao
                    key={parte}
                    url={`${api}/assinaturas`}
                    rotulo={`Assinar como ${PARTE[parte] ?? parte}`}
                    corpo={{ parte }}
                    confirmacao={{ titulo: "Assinar o TCE?", descricao: "Sua identificação, a data, a hora e o hash deste TCE ficam registrados. Se o TCE for reaberto depois, as assinaturas perdem a validade e precisam ser feitas de novo.", confirmar: "Assinar" }}
                    sucesso="Assinatura registrada"
                  />
                ))}
                {acoes.reabrirTce && (
                <BotaoAcao
                  url={`${api}/tce/reabertura`}
                  rotulo="Reabrir TCE"
                  variante="ghost"
                  pedirMotivo={{
                    max: LIMITE.justificativaEstagio,
                    campo: "justificativa",
                    pergunta: "Justificativa da reabertura",
                  }}
                />
                )}
              </>
            )}
          </div>
        </Painel>
      )}

      <div className="colunas-alinhadas grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Painel
          titulo="Responsáveis"
          descricao="Professor orientador e supervisor da concedente."
          flush
        >
          <ul className="divide-y divide-navy-900/[0.07]">
            {responsaveis.length === 0 && (
              <li className="px-5 py-4 text-sm text-navy-900/65">
                Nenhum responsável vinculado.
              </li>
            )}
            {responsaveis.map((responsavel) => (
              <li
                key={responsavel.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
              >
                <span>
                  <span className="block font-medium text-navy-900">
                    {responsavel.usuarioNome ?? (
                      <span className="font-normal text-navy-900/65">
                        Nome não visível para o seu perfil
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-navy-900/65">
                    {responsavel.papel === "ORIENTADOR"
                      ? "Professor orientador"
                      : "Supervisor"}
                  </span>
                </span>
                <span className="text-xs text-navy-900/65">
                  {responsavel.vigenciaFim
                    ? responsavel.vigenciaFim === responsavel.vigenciaInicio
                      ? "designação anulada"
                      : `${formatarData(responsavel.vigenciaInicio)} a ${formatarData(responsavel.vigenciaFim)}`
                    : `desde ${formatarData(responsavel.vigenciaInicio)}`}
                </span>
              </li>
            ))}
          </ul>
          {emFormalizacao && acoes.vincularResponsavel && (
            <details
              className="border-t border-navy-900/[0.07] px-5 py-4"
              open={responsaveis.filter(vigente).length < 2}
            >
              <summary className="cursor-pointer text-sm font-medium text-azul-500 hover:text-navy-700">
                Vincular responsável
              </summary>
              <div className="mt-4">
                <VincularResponsavel key={responsaveis.length} estagioId={estagio.id} />
              </div>
            </details>
          )}
        </Painel>

        <Painel
          titulo="Apólice de seguro"
          descricao={
            estagio.seguroExigido
              ? "Exigida: precisa estar vigente na ativação."
              : "Não exigida neste TCE."
          }
          flush
        >
          <ul className="divide-y divide-navy-900/[0.07]">
            {apolices.length === 0 && (
              <li className="px-5 py-4 text-sm text-navy-900/65">
                Nenhuma apólice registrada.
              </li>
            )}
            {apolices.map((apolice) => (
              <li key={apolice.id} className="px-5 py-3 text-sm">
                <span className="block font-medium text-navy-900">
                  {apolice.seguradora} · nº {apolice.numeroApolice}
                </span>
                <span className="block text-xs text-navy-900/65">
                  {formatarData(apolice.vigenciaInicio)} a{" "}
                  {formatarData(apolice.vigenciaFim)} · contratada pela{" "}
                  {apolice.contratante === "CONCEDENTE"
                    ? "concedente"
                    : "instituição"}
                </span>
              </li>
            ))}
          </ul>
          {estagio.seguroExigido && acoes.registrarApolice && (
            <details
              className="border-t border-navy-900/[0.07] px-5 py-4"
              open={apolices.length === 0}
            >
              <summary className="cursor-pointer text-sm font-medium text-azul-500 hover:text-navy-700">
                {apolices.length === 0
                  ? "Registrar apólice"
                  : "Registrar nova apólice"}
              </summary>
              <div className="mt-4">
                <FormularioApi
                  validacao="apolice"
                  url={`${api}/apolices`}
                  rotuloEnviar="Registrar apólice"
                  embutido
                  campos={[
                    { nome: "seguradora", max: LIMITE.seguradora, rotulo: "Seguradora" },
                    { nome: "numero_apolice", max: LIMITE.numeroApolice, rotulo: "Número" },
                    {
                      nome: "contratante",
                      rotulo: "Contratante",
                      tipo: "select",
                      obrigatorio: true,
                      opcoes: [
                        { valor: "CONCEDENTE", rotulo: "Concedente" },
                        { valor: "INSTITUICAO", rotulo: "Instituição" },
                      ],
                    },
                    { nome: "vigencia_inicio", rotulo: "Início", tipo: "date" },
                    { nome: "vigencia_fim", rotulo: "Fim", tipo: "date" },
                  ]}
                />
              </div>
            </details>
          )}
        </Painel>
      </div>

      <Painel
        titulo="Plano de atividades"
        descricao="Elaborado com o estudante e aprovado pelo orientador."
        acoes={
          planoAtual && (
            <StatusBadge tone={PLANO[planoAtual.situacao].tom}>
              {PLANO[planoAtual.situacao].rotulo}
            </StatusBadge>
          )
        }
      >
        {planoAtual ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-navy-900/65">
                  Atividades previstas · versão {planoAtual.versao}
                </p>
                <p className="mt-1 text-sm whitespace-pre-line text-navy-900">
                  {planoAtual.atividadesPrevistas}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-navy-900/65">
                  Compatibilidade com o curso
                </p>
                <p className="mt-1 text-sm whitespace-pre-line text-navy-900">
                  {planoAtual.justificativaCompatibilidade}
                </p>
              </div>
            </div>
            {planoAtual.parecer && (
              <p className="rounded-lg bg-nevoa-50 px-3 py-2 text-sm text-navy-900/80">
                Parecer do orientador: {planoAtual.parecer}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {acoes.elaborarPlano && planoAtual.situacao === "RASCUNHO" && (
                <BotaoAcao
                  url={`${api}/plano-atividades/envio`}
                  rotulo="Enviar ao orientador"
                  confirmacao={{ titulo: "Enviar o plano ao orientador?", descricao: "O plano vai para a aprovação do orientador. Mudanças depois disso só por devolução ou por uma nova versão.", confirmar: "Enviar" }}
                />
              )}
              {acoes.decidirPlano && planoAtual.situacao === "AGUARDANDO_APROVACAO" && (
                <>
                  <BotaoAcao
                    url={`${api}/plano-atividades/aprovacao`}
                    rotulo="Aprovar plano"
                    confirmacao={{ titulo: "Aprovar o plano de atividades?", descricao: "O plano aprovado passa a valer para a ativação do estágio. Mudanças depois disso só por uma nova versão.", confirmar: "Aprovar" }}
                    variante="default"
                    sucesso="Plano aprovado"
                  />
                  <BotaoAcao
                    url={`${api}/plano-atividades/devolucao`}
                    rotulo="Devolver"
                    pedirMotivo={{
                      max: LIMITE.parecerPlano,
                      campo: "parecer",
                      pergunta: "Parecer da devolução",
                    }}
                  />
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-navy-900/65">Nenhum plano registrado.</p>
        )}
        {acoes.elaborarPlano && (!planoAtual ||
          planoAtual.situacao === "RASCUNHO" ||
          planoAtual.situacao === "DEVOLVIDO" ||
          planoAtual.situacao === "APROVADO") && (
          <details
            className="group mt-4 border-t border-navy-900/[0.07] pt-4"
            open={!planoAtual}
          >
            <summary className="cursor-pointer text-sm font-medium text-azul-500 hover:text-navy-700">
              {planoAtual?.situacao === "RASCUNHO"
                ? "Editar rascunho"
                : planoAtual
                  ? "Nova versão do plano"
                  : "Registrar plano"}
            </summary>
            <div className="mt-4">
              <FormularioApi
                validacao="plano"
                  url={`${api}/plano-atividades`}
                metodo="PUT"
                rotuloEnviar="Salvar plano"
                embutido
                campos={[
                  {
                    nome: "atividades_previstas",
                    max: LIMITE.atividadesPrevistas,
                    rotulo: "Atividades previstas",
                    tipo: "textarea",
                    valorInicial:
                      planoAtual?.situacao === "RASCUNHO"
                        ? planoAtual.atividadesPrevistas
                        : "",
                  },
                  {
                    nome: "justificativa_compatibilidade",
                    max: LIMITE.compatibilidade,
                    rotulo: "Compatibilidade com o curso",
                    tipo: "textarea",
                    valorInicial:
                      planoAtual?.situacao === "RASCUNHO"
                        ? planoAtual.justificativaCompatibilidade
                        : "",
                  },
                ]}
              />
            </div>
          </details>
        )}
      </Painel>

      {assinaturas.length > 0 && (
        <Painel
          titulo="Assinaturas"
          descricao="Identificação, data, hora e hash do documento assinado."
          flush
        >
          <ul
            className="divide-y divide-navy-900/[0.07]"
            data-testid="assinaturas"
          >
            {assinaturas.map((assinatura) => {
              const anterior =
                !assinatura.aditivoId &&
                assinatura.hashDocumento !== estagio.hashTce;
              return (
                <li
                  key={assinatura.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
                >
                  <span>
                    <span className="block font-medium text-navy-900">
                      {assinatura.signatarioNome} ·{" "}
                      {PARTE[assinatura.parte] ?? assinatura.parte}
                    </span>
                    <span className="block font-mono text-xs text-navy-900/65">
                      {assinatura.hashDocumento.slice(0, 16)}…
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-xs text-navy-900/65">
                    {assinatura.aditivoId ? "Aditivo" : "TCE"} ·{" "}
                    {formatarDataHora(assinatura.criadoEm)}
                    {anterior && (
                      <StatusBadge tone="neutral">Versão anterior</StatusBadge>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </Painel>
      )}
    </div>
  );
}
