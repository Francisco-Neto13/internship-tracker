import { minutosParaHoras } from "@/lib/horas";
import type { DocumentoPdf, SecaoPdf } from "@/lib/pdf";
import { SITUACAO_ESTAGIO } from "@/lib/rotulos";

// RF022, RN-04, RN-06: TCE, amendment and activity plan rendered from the data in force, in
// the institutional model (sections of fields). The PDF is a rendering, not the signed object:
// what the parties sign is the SHA-256 of the canonical content (RNF-08), printed here so the
// reader can match the signatures. Pure: the same data always yields the same document.

export type IdentificacaoEstagio = {
  estudanteNome: string | null;
  matricula: string | null;
  curso: string | null;
  concedente: string | null;
  cnpj: string | null;
  convenio: string | null;
};

type Estagio = {
  id: string;
  tipo: "OBRIGATORIO" | "NAO_OBRIGATORIO";
  situacao: string;
  dataInicio: string;
  dataFimPactuada: string;
  dataFimPrevista: string;
  cargaDiariaMinutos: number;
  cargaSemanalMinutos: number;
  cargaTotalMinutos: number;
  condicoesPactuadas: string;
  bolsaValor: string | null;
  auxilioTransporteValor: string | null;
  seguroExigido: boolean;
  hashTce: string | null;
};

type Assinatura = { parte: string; signatarioNome: string; hashDocumento: string; criadoEm: Date; aditivoId: string | null };
type Responsavel = { papel: string; nome: string | null; vigenciaInicio: string; vigenciaFim: string | null };
type Apolice = { seguradora: string; numeroApolice: string; contratante: string; vigenciaInicio: string; vigenciaFim: string };

const data = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "Não informado");
const instante = (valor: Date) => valor.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
const horas = (minutos: number | null) => (minutos === null ? "Não informado" : `${String(minutosParaHoras(minutos)).replace(".", ",")} h`);
const reais = (valor: string | null) => (valor === null ? "Não se aplica" : `R$ ${Number(valor).toFixed(2).replace(".", ",")}`);
const cnpj = (valor: string | null) => (valor ? valor.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, "$1.$2.$3/$4-$5") : "Não informado");
const TIPO = { OBRIGATORIO: "Obrigatório", NAO_OBRIGATORIO: "Não obrigatório" } as const;
const PARTE: Record<string, string> = { ESTUDANTE: "Estudante", INSTITUICAO: "Instituição de ensino", CONCEDENTE: "Concedente" };
const SITUACAO_PLANO: Record<string, string> = { RASCUNHO: "Rascunho", AGUARDANDO_APROVACAO: "Aguardando o orientador", APROVADO: "Aprovado", DEVOLVIDO: "Devolvido", SUBSTITUIDO: "Substituído" };
const SITUACAO_ADITIVO: Record<string, string> = { AGUARDANDO_ASSINATURAS: "Aguardando assinaturas", VIGENTE: "Vigente", CANCELADO: "Cancelado" };
const matriculaDe = (id: IdentificacaoEstagio) => `matrícula ${id.matricula ?? "não informada"}`;

export function partes(id: IdentificacaoEstagio): SecaoPdf {
  return {
    titulo: "Partes",
    campos: [
      ["Estudante", `${id.estudanteNome ?? "Não informado"} (matrícula ${id.matricula ?? "Não informado"})`],
      ["Instituição de ensino", `Curso ${id.curso ?? "Não informado"}`],
      ["Concedente", `${id.concedente ?? "Não informado"} (CNPJ ${cnpj(id.cnpj)})`],
      ["Convênio", id.convenio ?? "Não informado"],
    ],
  };
}

function assinaturas(lista: Assinatura[], hash: string | null): SecaoPdf {
  const validas = hash ? lista.filter((item) => item.hashDocumento === hash) : [];
  return {
    titulo: "Assinaturas (RF019)",
    campos: validas.length
      ? validas.map((item) => [PARTE[item.parte] ?? item.parte, `${item.signatarioNome}, em ${instante(item.criadoEm)}`] as [string, string])
      : [["Situação", hash ? "Nenhuma assinatura sobre o hash vigente" : "Documento em edição: ainda não assinável"]],
  };
}

export function documentoTce(estagio: Estagio, id: IdentificacaoEstagio, extras: { responsaveis: Responsavel[]; apolice: Apolice | null; assinaturas: Assinatura[] }): DocumentoPdf {
  return {
    titulo: "Termo de Compromisso de Estágio",
    subtitulo: `Lei 11.788/2008 · situação: ${SITUACAO_ESTAGIO[estagio.situacao]?.rotulo.toLowerCase() ?? estagio.situacao} · ${estagio.hashTce ? `SHA-256 ${estagio.hashTce}` : "TCE em edição"}`,
    secoes: [
      partes(id),
      {
        titulo: "Condições pactuadas",
        campos: [
          ["Tipo", TIPO[estagio.tipo]],
          ["Período", `${data(estagio.dataInicio)} a ${data(estagio.dataFimPactuada)}`],
          ["Término previsto (com afastamentos e aditivos)", data(estagio.dataFimPrevista)],
          ["Jornada", `${horas(estagio.cargaDiariaMinutos)} por dia, ${horas(estagio.cargaSemanalMinutos)} por semana`],
          ["Carga horária total", horas(estagio.cargaTotalMinutos)],
          ["Bolsa", reais(estagio.bolsaValor)],
          ["Auxílio-transporte", reais(estagio.auxilioTransporteValor)],
          ["Seguro contra acidentes pessoais", estagio.seguroExigido ? "Exigido" : "Não exigido"],
        ],
        paragrafos: [estagio.condicoesPactuadas],
      },
      {
        titulo: "Responsáveis",
        campos: extras.responsaveis.length
          ? extras.responsaveis.map((item) => [item.papel === "ORIENTADOR" ? "Professor orientador" : "Supervisor", `${item.nome ?? "Não informado"}, desde ${data(item.vigenciaInicio)}${item.vigenciaFim ? ` até ${data(item.vigenciaFim)}` : ""}`] as [string, string])
          : [["Situação", "Ainda não vinculados"]],
      },
      {
        titulo: "Apólice de seguro",
        campos: extras.apolice
          ? [
              ["Seguradora", extras.apolice.seguradora],
              ["Apólice", extras.apolice.numeroApolice],
              ["Contratante", PARTE[extras.apolice.contratante] ?? extras.apolice.contratante],
              ["Vigência", `${data(extras.apolice.vigenciaInicio)} a ${data(extras.apolice.vigenciaFim)}`],
            ]
          : [["Situação", estagio.seguroExigido ? "Pendente" : "Não exigida"]],
      },
      assinaturas(extras.assinaturas.filter((item) => item.aditivoId === null), estagio.hashTce),
    ],
    rodape: `Internship Tracker · TCE · ${matriculaDe(id)}`,
  };
}

type Plano = {
  versao: number;
  situacao: string;
  atividadesPrevistas: string;
  justificativaCompatibilidade: string;
  parecer: string | null;
  decididoEm: Date | null;
};

export function documentoPlano(plano: Plano, id: IdentificacaoEstagio, orientador: string | null): DocumentoPdf {
  return {
    titulo: "Plano de Atividades do Estagiário",
    subtitulo: `Lei 11.788/2008, art. 7º, parágrafo único · versão ${plano.versao} · ${SITUACAO_PLANO[plano.situacao] ?? plano.situacao}`,
    secoes: [
      partes(id),
      { titulo: "Atividades previstas", paragrafos: [plano.atividadesPrevistas] },
      { titulo: "Compatibilidade com o curso", paragrafos: [plano.justificativaCompatibilidade] },
      {
        titulo: "Decisão do professor orientador (RF017)",
        campos: [
          ["Orientador", orientador ?? "Não informado"],
          ["Decidido em", plano.decididoEm ? instante(plano.decididoEm) : "Aguardando"],
          ["Parecer", plano.parecer ?? "Não informado"],
        ],
      },
    ],
    rodape: `Internship Tracker · plano de atividades · ${matriculaDe(id)}`,
  };
}

type Aditivo = {
  id: string;
  numero: number;
  tipo: string;
  situacao: string;
  justificativa: string;
  novaDataFimPactuada: string | null;
  novaCargaDiariaMinutos: number | null;
  novaCargaSemanalMinutos: number | null;
  novaCargaTotalMinutos: number | null;
  hashConteudo: string;
  efetivadoEm: Date | null;
};

const TIPO_ADITIVO: Record<string, string> = {
  PRORROGACAO: "Prorrogação",
  ALTERACAO_CARGA_HORARIA: "Alteração de carga horária",
  SUBSTITUICAO_SUPERVISOR: "Substituição de supervisor",
};

export function documentoAditivo(aditivo: Aditivo, id: IdentificacaoEstagio, novoSupervisor: string | null, lista: Assinatura[]): DocumentoPdf {
  const alteracoes: [string, string][] = [];
  if (aditivo.novaDataFimPactuada) alteracoes.push(["Novo término pactuado", data(aditivo.novaDataFimPactuada)]);
  if (aditivo.novaCargaDiariaMinutos !== null) alteracoes.push(["Nova carga diária", horas(aditivo.novaCargaDiariaMinutos)]);
  if (aditivo.novaCargaSemanalMinutos !== null) alteracoes.push(["Nova carga semanal", horas(aditivo.novaCargaSemanalMinutos)]);
  if (aditivo.novaCargaTotalMinutos !== null) alteracoes.push(["Nova carga total", horas(aditivo.novaCargaTotalMinutos)]);
  if (novoSupervisor) alteracoes.push(["Novo supervisor", novoSupervisor]);
  return {
    titulo: `Termo Aditivo nº ${aditivo.numero}`,
    subtitulo: `${TIPO_ADITIVO[aditivo.tipo] ?? aditivo.tipo} · ${SITUACAO_ADITIVO[aditivo.situacao] ?? aditivo.situacao} · SHA-256 ${aditivo.hashConteudo}`,
    secoes: [
      partes(id),
      { titulo: "Alterações (RN-06)", campos: alteracoes, paragrafos: [aditivo.justificativa] },
      { campos: [["Efetivado em", aditivo.efetivadoEm ? instante(aditivo.efetivadoEm) : "Aguardando as três assinaturas"]] },
      assinaturas(lista.filter((item) => item.aditivoId === aditivo.id), aditivo.hashConteudo),
    ],
    rodape: `Internship Tracker · termo aditivo nº ${aditivo.numero} · ${matriculaDe(id)}`,
  };
}
