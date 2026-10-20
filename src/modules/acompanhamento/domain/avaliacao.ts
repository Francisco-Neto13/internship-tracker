// RF042, RN-15, RF014: grades are given on each criterion's own scale; to compare and average
// them, each is normalized to 0..10 and the evaluation is the mean of its criteria, so a
// criterion with a wider scale does not weigh more. Mirrors app.media_avaliacao (tested).

export type Criterio = { id: string; escalaMinima: number; escalaMaxima: number; ativo: boolean };
export type Resposta = { criterioId: string; nota: number };

export type ProblemaResposta =
  | { code: "CRITERIO_AUSENTE"; criterioId: string }
  | { code: "CRITERIO_INATIVO"; criterioId: string }
  | { code: "CRITERIO_REPETIDO"; criterioId: string }
  | { code: "NOTA_FORA_DA_ESCALA"; criterioId: string; nota: number };

/** RF042: every active criterion answered once, each grade within its scale. */
export function conferirRespostas(criterios: Criterio[], respostas: Resposta[]): ProblemaResposta[] {
  const problemas: ProblemaResposta[] = [];
  const porId = new Map(criterios.map((criterio) => [criterio.id, criterio]));
  const vistos = new Set<string>();
  for (const resposta of respostas) {
    const criterio = porId.get(resposta.criterioId);
    if (vistos.has(resposta.criterioId)) problemas.push({ code: "CRITERIO_REPETIDO", criterioId: resposta.criterioId });
    vistos.add(resposta.criterioId);
    if (!criterio || !criterio.ativo) {
      problemas.push({ code: "CRITERIO_INATIVO", criterioId: resposta.criterioId });
    } else if (!Number.isInteger(resposta.nota) || resposta.nota < criterio.escalaMinima || resposta.nota > criterio.escalaMaxima) {
      problemas.push({ code: "NOTA_FORA_DA_ESCALA", criterioId: resposta.criterioId, nota: resposta.nota });
    }
  }
  for (const criterio of criterios) {
    if (criterio.ativo && !vistos.has(criterio.id)) problemas.push({ code: "CRITERIO_AUSENTE", criterioId: criterio.id });
  }
  return problemas;
}

/** Mean of the grades normalized to 0..10, two decimals; null without grades. */
export function mediaNormalizada(itens: { nota: number; escalaMinima: number; escalaMaxima: number }[]): number | null {
  if (itens.length === 0) return null;
  const soma = itens.reduce((total, item) => total + ((item.nota - item.escalaMinima) * 10) / (item.escalaMaxima - item.escalaMinima), 0);
  return Math.round((soma / itens.length) * 100) / 100;
}
