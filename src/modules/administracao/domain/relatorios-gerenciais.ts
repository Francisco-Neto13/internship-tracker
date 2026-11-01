// RF067: the management reports offered (requisitos RN-29)
export const TIPOS_RELATORIO = ["estagiarios-ativos", "concedentes-parceiras", "taxa-conclusao", "pendencias-integralizacao"] as const;
export type TipoRelatorio = (typeof TIPOS_RELATORIO)[number];
