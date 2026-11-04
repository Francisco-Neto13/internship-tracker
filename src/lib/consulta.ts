import { LIMITE } from "@/lib/campos";

// Consulta de uma listagem lida da URL (searchParams do Next): primeiro valor de cada chave,
// página e tamanho de página saneados. O que não é válido volta ao padrão em vez de quebrar a
// página: um link antigo ou editado à mão ainda abre a listagem.

export type SearchParamsBrutos = Record<string, string | string[] | undefined>;

// Issue #97: a search from an edited link reaches the database. Nothing in a list URL is longer
const TAMANHO_MAXIMO = LIMITE.busca;
const TAMANHOS = [10, 20, 50, 100];

export function lerConsulta(bruto: SearchParamsBrutos): Record<string, string> {
  return Object.fromEntries(
    Object.entries(bruto)
      .map(([chave, valor]) => [chave, (Array.isArray(valor) ? valor[0] : valor)?.slice(0, TAMANHO_MAXIMO)])
      .filter((par): par is [string, string] => typeof par[1] === "string" && par[1].trim() !== ""),
  );
}

/** `chavePagina` separa duas listas paginadas na mesma tela. */
export function lerPaginacao(consulta: Record<string, string>, padrao = 20, chavePagina = "pagina") {
  const pagina = Math.max(1, Math.trunc(Number(consulta[chavePagina])) || 1);
  const pedido = Math.trunc(Number(consulta.por_pagina));
  const porPagina = TAMANHOS.includes(pedido) ? pedido : padrao;
  return { pagina, porPagina };
}

/** Valor da consulta só se estiver entre os aceitos (filtro de enum). */
export function opcao<T extends string>(valor: string | undefined, aceitos: readonly T[]): T | undefined {
  return aceitos.includes(valor as T) ? (valor as T) : undefined;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function uuidOu(valor: string | undefined): string | undefined {
  return valor && UUID.test(valor) ? valor : undefined;
}

/** "/caminho?a=1&b=2" para o link de volta de um registro, preservando a consulta. */
export function comConsulta(caminho: string, consulta: Record<string, string | undefined>): string {
  const texto = new URLSearchParams(Object.entries(consulta).filter(([, valor]) => valor) as [string, string][]).toString();
  return texto ? `${caminho}?${texto}` : caminho;
}
