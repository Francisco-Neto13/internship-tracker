import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

// PDF generation on the server (RF022, RF058, RF068) with pdf-lib: pure JavaScript, no native
// dependency nor font file to bundle, so it runs the same locally and in a serverless function.
// The standard Helvetica font uses WinAnsi encoding, which covers Portuguese (á, ã, ç, õ...);
// any character outside it is replaced by "?" instead of failing the whole document.

const A4: [number, number] = [595.28, 841.89];
const MARGEM = 48;
const COR_TEXTO = rgb(0.06, 0.09, 0.16);
const COR_SUAVE = rgb(0.38, 0.42, 0.5);
const COR_LINHA = rgb(0.85, 0.87, 0.9);

type Fontes = { normal: PDFFont; negrito: PDFFont };

function seguro(fonte: PDFFont, texto: string): string {
  let saida = "";
  for (const caractere of texto.replace(/\r?\n/g, " ")) {
    try {
      fonte.encodeText(caractere);
      saida += caractere;
    } catch {
      saida += "?";
    }
  }
  return saida;
}

/** Breaks `texto` in lines that fit `largura`; a word longer than the line is cut. */
export function quebrarTexto(fonte: PDFFont, texto: string, tamanho: number, largura: number): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of seguro(fonte, texto).split(/\s+/).filter(Boolean)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (fonte.widthOfTextAtSize(tentativa, tamanho) <= largura) {
      atual = tentativa;
      continue;
    }
    if (atual) linhas.push(atual);
    let resto = palavra;
    while (fonte.widthOfTextAtSize(resto, tamanho) > largura) {
      let corte = resto.length - 1;
      while (corte > 1 && fonte.widthOfTextAtSize(resto.slice(0, corte), tamanho) > largura) corte--;
      linhas.push(resto.slice(0, corte));
      resto = resto.slice(corte);
    }
    atual = resto;
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [""];
}

class Escritor {
  pagina!: PDFPage;
  y = 0;
  constructor(
    readonly pdf: PDFDocument,
    readonly fontes: Fontes,
    readonly tamanhoPagina: [number, number],
  ) {
    this.novaPagina();
  }

  get largura() {
    return this.tamanhoPagina[0] - 2 * MARGEM;
  }

  novaPagina() {
    this.pagina = this.pdf.addPage(this.tamanhoPagina);
    this.y = this.tamanhoPagina[1] - MARGEM;
  }

  garantir(altura: number) {
    if (this.y - altura < MARGEM + 20) this.novaPagina();
  }

  texto(conteudo: string, opcoes: { tamanho?: number; negrito?: boolean; cor?: ReturnType<typeof rgb>; x?: number; largura?: number } = {}) {
    const tamanho = opcoes.tamanho ?? 10;
    const fonte = opcoes.negrito ? this.fontes.negrito : this.fontes.normal;
    for (const linha of quebrarTexto(fonte, conteudo, tamanho, opcoes.largura ?? this.largura)) {
      this.garantir(tamanho * 1.4);
      this.pagina.drawText(linha, { x: opcoes.x ?? MARGEM, y: this.y - tamanho, size: tamanho, font: fonte, color: opcoes.cor ?? COR_TEXTO });
      this.y -= tamanho * 1.4;
    }
  }

  espaco(altura: number) {
    this.y -= altura;
  }

  regua() {
    this.garantir(8);
    this.pagina.drawLine({ start: { x: MARGEM, y: this.y }, end: { x: this.tamanhoPagina[0] - MARGEM, y: this.y }, thickness: 0.6, color: COR_LINHA });
    this.y -= 8;
  }
}

function numerarPaginas(pdf: PDFDocument, fonte: PDFFont, rodape: string) {
  const paginas = pdf.getPages();
  paginas.forEach((pagina, indice) => {
    const texto = seguro(fonte, `${rodape} · página ${indice + 1} de ${paginas.length}`);
    pagina.drawText(texto, { x: MARGEM, y: MARGEM / 2, size: 8, font: fonte, color: COR_SUAVE });
  });
}

async function criar(titulo: string): Promise<{ pdf: PDFDocument; fontes: Fontes }> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(titulo);
  pdf.setProducer("Internship Tracker");
  pdf.setCreator("Internship Tracker");
  // Fixed dates keep the bytes of the same content identical (hash of issued documents)
  pdf.setCreationDate(new Date(0));
  pdf.setModificationDate(new Date(0));
  return { pdf, fontes: { normal: await pdf.embedFont(StandardFonts.Helvetica), negrito: await pdf.embedFont(StandardFonts.HelveticaBold) } };
}

export type TabelaPdf = {
  titulo: string;
  subtitulo?: string;
  filtros: [string, string][];
  cabecalho: string[];
  /** Relative width of each column (defaults to equal). */
  pesos?: number[];
  linhas: string[][];
  rodape: string;
};

/** A report table (RF068): title, filters, header repeated on every page, numbered pages. */
export async function gerarPdfTabela(tabela: TabelaPdf): Promise<Uint8Array> {
  const { pdf, fontes } = await criar(tabela.titulo);
  const escritor = new Escritor(pdf, fontes, [A4[1], A4[0]]);
  escritor.texto(tabela.titulo, { tamanho: 16, negrito: true });
  if (tabela.subtitulo) escritor.texto(tabela.subtitulo, { tamanho: 10, cor: COR_SUAVE });
  escritor.espaco(4);
  for (const [rotulo, valor] of tabela.filtros) escritor.texto(`${rotulo}: ${valor}`, { tamanho: 9, cor: COR_SUAVE });
  escritor.espaco(8);

  const pesos = tabela.pesos ?? tabela.cabecalho.map(() => 1);
  const total = pesos.reduce((soma, peso) => soma + peso, 0);
  const larguras = pesos.map((peso) => (escritor.largura * peso) / total);
  const tamanho = 9;

  const desenharLinha = (celulas: string[], negrito: boolean) => {
    const fonte = negrito ? fontes.negrito : fontes.normal;
    const quebradas = celulas.map((celula, indice) => quebrarTexto(fonte, celula, tamanho, larguras[indice] - 6));
    const altura = Math.max(...quebradas.map((linhas) => linhas.length)) * tamanho * 1.3 + 6;
    let x = MARGEM;
    quebradas.forEach((linhas, indice) => {
      linhas.forEach((linha, n) => {
        escritor.pagina.drawText(linha, { x: x + 3, y: escritor.y - 3 - tamanho - n * tamanho * 1.3, size: tamanho, font: fonte, color: COR_TEXTO });
      });
      x += larguras[indice];
    });
    escritor.y -= altura;
    escritor.regua();
    return altura;
  };

  const alturaCabecalho = tamanho * 1.3 * 2 + 14;
  escritor.garantir(alturaCabecalho);
  desenharLinha(tabela.cabecalho, true);
  for (const linha of tabela.linhas) {
    const maiorCelula = Math.max(...linha.map((celula, indice) => quebrarTexto(fontes.normal, celula, tamanho, larguras[indice] - 6).length));
    if (escritor.y - (maiorCelula * tamanho * 1.3 + 14) < MARGEM + 20) {
      escritor.novaPagina();
      desenharLinha(tabela.cabecalho, true);
    }
    desenharLinha(linha, false);
  }
  if (tabela.linhas.length === 0) escritor.texto("Nenhum registro para os filtros informados.", { tamanho: 10, cor: COR_SUAVE });

  numerarPaginas(pdf, fontes.normal, tabela.rodape);
  return pdf.save();
}

export type SecaoPdf = { titulo?: string; campos?: [string, string][]; paragrafos?: string[] };

export type DocumentoPdf = {
  titulo: string;
  subtitulo?: string;
  secoes: SecaoPdf[];
  rodape: string;
};

/** A text document (TCE, amendment, plan, declaration): sections of fields and paragraphs. */
export async function gerarPdfDocumento(documento: DocumentoPdf): Promise<Uint8Array> {
  const { pdf, fontes } = await criar(documento.titulo);
  const escritor = new Escritor(pdf, fontes, A4);
  escritor.texto(documento.titulo, { tamanho: 16, negrito: true });
  if (documento.subtitulo) escritor.texto(documento.subtitulo, { tamanho: 10, cor: COR_SUAVE });
  escritor.espaco(6);
  escritor.regua();
  for (const secao of documento.secoes) {
    escritor.espaco(4);
    if (secao.titulo) {
      escritor.garantir(40);
      escritor.texto(secao.titulo, { tamanho: 11, negrito: true });
      escritor.espaco(2);
    }
    for (const [rotulo, valor] of secao.campos ?? []) {
      escritor.texto(rotulo, { tamanho: 8, cor: COR_SUAVE });
      escritor.texto(valor || "Não informado", { tamanho: 10 });
      escritor.espaco(3);
    }
    for (const paragrafo of secao.paragrafos ?? []) {
      escritor.texto(paragrafo, { tamanho: 10 });
      escritor.espaco(6);
    }
  }
  numerarPaginas(pdf, fontes.normal, documento.rodape);
  return pdf.save();
}
