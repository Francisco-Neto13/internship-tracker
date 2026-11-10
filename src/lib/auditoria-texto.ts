import { formatarData, formatarDataHora } from "./datas";
import { minutosParaHoras } from "./horas";
import { OPERACAO_AUDITORIA, SITUACAO_ACADEMICA, SITUACAO_ATIVIDADE, SITUACAO_CONCEDENTE, SITUACAO_ESTAGIO, SITUACAO_RELATORIO, SITUACAO_USUARIO, TIPO_ESTAGIO } from "./rotulos";

// RF065, RF066: the trail in words anyone reads. Columns and codes become names, dates and hours
// are formatted, and the masked value says it is protected. The exact stored values stay in the
// database and in the API.

/** Words the database writes without accents; the endings -cao, -coes and -sao are regular. */
const PALAVRAS: Record<string, string> = {
  academica: "acadêmica", analise: "análise", apolice: "apólice", area: "área", atuacao: "atuação", auxilio: "auxílio", codigo: "código", conteudo: "conteúdo", criterio: "critério",
  diaria: "diária", diario: "diário", endereco: "endereço", escala: "escala", estagio: "estágio", frequencia: "frequência", historico: "histórico", inicio: "início", logradouro: "logradouro",
  matricula: "matrícula", maxima: "máxima", maximo: "máximo", media: "média", minima: "mínima", minimo: "mínimo", numero: "número", obrigatorio: "obrigatório", orgao: "órgão", parametro: "parâmetro",
  periodo: "período", razao: "razão", relatorio: "relatório", responsavel: "responsável", tolerancia: "tolerância", ultima: "última", ultimo: "último", usuario: "usuário", vigencia: "vigência",
  cnpj: "CNPJ", cep: "CEP", tce: "TCE", uf: "UF", email: "e-mail", hash: "código de integridade", sha256: "código de integridade",
};

function acentuar(palavra: string): string {
  return PALAVRAS[palavra] ?? palavra.replace(/cao$/, "ção").replace(/coes$/, "ções").replace(/sao$/, "são");
}

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
const emPalavras = (texto: string) => texto.toLowerCase().split("_").filter(Boolean).map(acentuar).join(" ");

/** "data_fim_prevista" -> "Data fim prevista"; "usuario_id" -> "Usuário"; "carga_total_minutos" -> "Carga total". */
export function rotuloCampo(campo: string): string {
  return capitalizar(emPalavras(campo.replace(/_id$/, "").replace(/_minutos$/, "")));
}

const CODIGOS: Record<string, string> = {
  ...Object.fromEntries([SITUACAO_ESTAGIO, SITUACAO_ACADEMICA, SITUACAO_ATIVIDADE, SITUACAO_RELATORIO, SITUACAO_CONCEDENTE, SITUACAO_USUARIO].flatMap((mapa) => Object.entries(mapa).map(([codigo, { rotulo }]) => [codigo, rotulo]))),
  ...TIPO_ESTAGIO,
};

const COLUNA_DE_CODIGO = /situacao|tipo|perfil|papel|parte|momento|decisao|contratante|solicitante|origem|gatilho/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One value of the trail as a person reads it. */
export function valorAuditoria(campo: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "Não informado";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  if (typeof valor === "number") return campo.endsWith("_minutos") ? `${minutosParaHoras(valor).toLocaleString("pt-BR")} h` : valor.toLocaleString("pt-BR");
  if (Array.isArray(valor)) return valor.map((item) => valorAuditoria(campo, item)).join(", ");
  if (typeof valor === "object") return textoAuditoria(valor);
  const texto = String(valor);
  if (texto === "[omitido]") return "Protegido";
  if (UUID.test(texto)) return `Referência ${texto.slice(0, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return formatarData(texto);
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(texto)) return formatarDataHora(texto);
  // Only enum columns: "SP" in uf or "AB123" in matricula are data, not codes
  if (COLUNA_DE_CODIGO.test(campo) && /^[A-Z][A-Z0-9_]+$/.test(texto)) return CODIGOS[texto] ?? capitalizar(emPalavras(texto));
  return texto;
}

/** A whole row of the trail in one line: "Campo: valor; Campo: valor". */
export function textoAuditoria(dados: unknown): string {
  if (!dados || typeof dados !== "object") return "";
  return Object.entries(dados as Record<string, unknown>)
    .map(([campo, valor]) => `${rotuloCampo(campo)}: ${valorAuditoria(campo, valor)}`)
    .join("; ");
}

export function rotuloOperacao(operacao: string): string {
  return capitalizar(OPERACAO_AUDITORIA[operacao] ?? operacao.toLowerCase());
}
