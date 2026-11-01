import { randomBytes } from "node:crypto";
import { minutosParaHoras } from "@/lib/horas";
import type { DocumentoPdf } from "@/lib/pdf";

// RF058, RN-17, RN-35: what a declaration says, from the facts the database returned
// (app.dados_declaracao). Pure: the same data always yields the same document.

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** 16 base32 characters (80 random bits) in four groups: guessing one is not feasible. */
export function gerarCodigoVerificacao(bytes: Uint8Array = randomBytes(10)): string {
  let bits = 0;
  let valor = 0;
  let saida = "";
  for (const byte of bytes) {
    valor = (valor << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      saida += ALFABETO[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return saida.slice(0, 16).match(/.{4}/g)!.join("-");
}

export type DadosDeclaracao = {
  tipo: "CONCLUSAO_ESTAGIO" | "INTEGRALIZACAO_ATIVIDADES";
  nome: string;
  matricula: string;
  curso: string;
  // CONCLUSAO_ESTAGIO
  estagio_id?: string;
  tipo_estagio?: "OBRIGATORIO" | "NAO_OBRIGATORIO";
  concedente?: string;
  cnpj?: string;
  data_inicio?: string;
  data_fim?: string;
  minutos_homologados?: number;
  orientador?: string | null;
  // INTEGRALIZACAO_ATIVIDADES
  apuracao_id?: string;
  apurado_em?: string;
  minutos_exigidos?: number;
  minutos_aproveitados?: number;
  categorias?: { categoria: string; minutos: number }[];
};

const data = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const horas = (minutos: number) => `${String(minutosParaHoras(minutos)).replace(".", ",")} h`;
const cnpj = (valor: string) => valor.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, "$1.$2.$3/$4-$5");

export function documentoDeclaracao(dados: DadosDeclaracao, codigo: string, emitidaEm: string): DocumentoPdf {
  const identificacao: [string, string][] = [
    ["Estudante", dados.nome],
    ["Matrícula", dados.matricula],
    ["Curso", dados.curso],
  ];
  const verificacao = {
    titulo: "Autenticidade",
    paragrafos: [
      `Código de verificação: ${codigo}. Confira em /api/v1/declaracoes/verificacao/${codigo}, que informa o tipo, o estudante, o curso, a data de emissão e o SHA-256 deste arquivo.`,
    ],
  };
  if (dados.tipo === "CONCLUSAO_ESTAGIO") {
    const tipo = dados.tipo_estagio === "OBRIGATORIO" ? "obrigatório" : "não obrigatório";
    return {
      titulo: "Declaração de conclusão de estágio",
      subtitulo: `Emitida em ${data(emitidaEm)}`,
      secoes: [
        { campos: identificacao },
        {
          paragrafos: [
            `Declaramos que ${dados.nome}, matrícula ${dados.matricula}, concluiu estágio ${tipo} na concedente ${dados.concedente} (CNPJ ${cnpj(dados.cnpj!)}), de ${data(dados.data_inicio!)} a ${data(dados.data_fim!)}, com carga horária homologada de ${horas(dados.minutos_homologados!)}${dados.orientador ? `, sob orientação de ${dados.orientador}` : ""}.`,
          ],
        },
        verificacao,
      ],
      rodape: `Internship Tracker · declaração ${codigo}`,
    };
  }
  return {
    titulo: "Declaração de integralização de atividades complementares",
    subtitulo: `Emitida em ${data(emitidaEm)}`,
    secoes: [
      { campos: identificacao },
      {
        paragrafos: [
          `Declaramos que ${dados.nome}, matrícula ${dados.matricula}, integralizou ${horas(dados.minutos_aproveitados!)} de atividades complementares, a carga exigida pelo curso (${horas(dados.minutos_exigidos!)}), conforme apuração de ${data(dados.apurado_em!)}.`,
        ],
      },
      { titulo: "Horas aproveitadas por categoria", campos: (dados.categorias ?? []).map((item) => [item.categoria, horas(item.minutos)] as [string, string]) },
      verificacao,
    ],
    rodape: `Internship Tracker · declaração ${codigo}`,
  };
}
