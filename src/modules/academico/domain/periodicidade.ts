// RF036, RN-13: report periodicity by course and internship type. Without a configuration
// the default applies: every 6 months, the longest the law allows (Lei 11.788/2008, art. 7º,
// IV), 15 days to send each report and 30 days after the end for the final one. Mirrors
// app.periodicidade_de in drizzle/sql/functions/09_relatorios.sql (tested).

export type TipoEstagio = "OBRIGATORIO" | "NAO_OBRIGATORIO";

export type Periodicidade = {
  intervaloMeses: number;
  prazoEntregaDias: number;
  prazoRelatorioFinalDias: number;
};

export const PERIODICIDADE_PADRAO: Periodicidade = {
  intervaloMeses: 6,
  prazoEntregaDias: 15,
  prazoRelatorioFinalDias: 30,
};
