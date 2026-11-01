import { describe, expect, it } from "vitest";
import { exigirAtivavel, impedimentosAtivacao, periodoCoberto, type FatosAtivacao } from "./ativacao";
import { hashTce, limiteDuracaoMaxima, validarTce, type DadosTce } from "./tce";

const TCE: DadosTce = {
  estudanteId: "e",
  cursoId: "c",
  concedenteId: "k",
  convenioId: "v",
  tipo: "OBRIGATORIO",
  dataInicio: "2026-11-01",
  dataFimPactuada: "2027-10-31",
  cargaDiariaMinutos: 360,
  cargaSemanalMinutos: 1800,
  cargaTotalMinutos: 400 * 60,
  condicoesPactuadas: "Atividades de desenvolvimento",
  bolsaValor: null,
  auxilioTransporteValor: null,
  seguroExigido: true,
  dispensaDuracaoMaxima: false,
};

const LIMITES = { limiteDiarioMinutos: 360, limiteSemanalMinutos: 1800, duracaoMaximaMeses: 24, diasUsadosNoPar: 0 };

function codigos(fn: () => void): string[] {
  try {
    fn();
  } catch (error) {
    return ((error as { details?: { code?: string }[] }).details ?? []).map((d) => d.code ?? "");
  }
  return [];
}

describe("TCE hash (RF019, RNF-08)", () => {
  it("is stable for the same content regardless of key order and number format", () => {
    const reordenado = Object.fromEntries(Object.entries(TCE).reverse()) as DadosTce;
    expect(hashTce(reordenado)).toBe(hashTce(TCE));
    expect(hashTce({ ...TCE, bolsaValor: "800" })).toBe(hashTce({ ...TCE, bolsaValor: "800.00" }));
  });

  it("changes with any field", () => {
    expect(hashTce({ ...TCE, cargaTotalMinutos: TCE.cargaTotalMinutos + 1 })).not.toBe(hashTce(TCE));
  });
});

describe("TCE rules (RF015, RF044, RF062, Lei 11.788/2008)", () => {
  it("accepts a valid mandatory internship", () => {
    expect(() => validarTce(TCE, LIMITES)).not.toThrow();
  });

  it("requires grant and transport aid in the non-mandatory internship (art. 12)", () => {
    expect(codigos(() => validarTce({ ...TCE, tipo: "NAO_OBRIGATORIO" }, LIMITES))).toEqual([
      "BOLSA_OBRIGATORIA",
      "AUXILIO_TRANSPORTE_OBRIGATORIO",
    ]);
    expect(() => validarTce({ ...TCE, tipo: "NAO_OBRIGATORIO", bolsaValor: "1000", auxilioTransporteValor: "150" }, LIMITES)).not.toThrow();
  });

  it("keeps the agreed workload within the daily and weekly limits (art. 10)", () => {
    expect(codigos(() => validarTce({ ...TCE, cargaDiariaMinutos: 420, cargaSemanalMinutos: 2100 }, LIMITES))).toEqual([
      "LIMITE_JORNADA_EXCEDIDO",
      "LIMITE_JORNADA_EXCEDIDO",
    ]);
  });

  it("limits the duration to 24 months at the same concedente, counting earlier internships (art. 11)", () => {
    expect(limiteDuracaoMaxima("2026-11-01", 24, 0)).toBe("2028-10-31");
    // 2028 is a leap year: 365 days before 2028-10-31 is 2027-11-01
    expect(limiteDuracaoMaxima("2026-11-01", 24, 365)).toBe("2027-11-01");
    expect(codigos(() => validarTce({ ...TCE, dataFimPactuada: "2028-11-01" }, LIMITES))).toEqual(["DURACAO_MAXIMA_EXCEDIDA"]);
    expect(codigos(() => validarTce(TCE, { ...LIMITES, diasUsadosNoPar: 400 }))).toEqual(["DURACAO_MAXIMA_EXCEDIDA"]);
  });

  it("does not limit the duration of an exempt internship (art. 11, D5)", () => {
    expect(() => validarTce({ ...TCE, dataFimPactuada: "2030-01-01", dispensaDuracaoMaxima: true }, LIMITES)).not.toThrow();
  });
});

const PRONTO: FatosAtivacao = {
  situacao: "EM_FORMALIZACAO",
  hashTce: "a".repeat(64),
  dataInicio: "2026-11-01",
  dataFimPrevista: "2027-10-31",
  seguroExigido: true,
  concedenteAtiva: true,
  convenioVigenteNoInicio: true,
  planoAprovado: true,
  orientadorNoInicio: true,
  supervisorNoInicio: true,
  apolices: [{ inicio: "2026-11-01", fim: "2027-10-31" }],
  partesQueAssinaramOHashAtual: ["ESTUDANTE", "INSTITUICAO", "CONCEDENTE"],
  estudanteMatriculado: true,
  outroEstagioAtivo: false,
};

describe("activation guards (RF008, RF010, RF017, RF018, RF019, RF032, D10)", () => {
  it("activates when every guard holds", () => {
    expect(() => exigirAtivavel(PRONTO)).not.toThrow();
  });

  it.each([
    ["CONCEDENTE_SUSPENSA", { concedenteAtiva: false }],
    ["CONVENIO_VENCIDO", { convenioVigenteNoInicio: false }],
    ["PLANO_NAO_APROVADO", { planoAprovado: false }],
    ["RESPONSAVEIS_INCOMPLETOS", { supervisorNoInicio: false }],
    ["APOLICE_AUSENTE", { apolices: [{ inicio: "2026-11-01", fim: "2027-06-30" }] }],
    ["ASSINATURAS_PENDENTES", { partesQueAssinaramOHashAtual: ["ESTUDANTE", "INSTITUICAO"] }],
    ["TCE_NAO_FECHADO", { hashTce: null }],
    ["ESTUDANTE_NAO_MATRICULADO", { estudanteMatriculado: false }],
    ["ESTAGIO_SIMULTANEO", { outroEstagioAtivo: true }],
  ] as const)("reports %s alone when only that guard fails", (codigo, violacao) => {
    expect(impedimentosAtivacao({ ...PRONTO, ...(violacao as Partial<FatosAtivacao>) }).map((item) => item.code)).toEqual([codigo]);
  });

  it("reports every impediment at once", () => {
    expect(impedimentosAtivacao({ ...PRONTO, concedenteAtiva: false, planoAprovado: false, outroEstagioAtivo: true })).toHaveLength(3);
  });

  it("does not require insurance when the TCE says it is not required", () => {
    expect(impedimentosAtivacao({ ...PRONTO, seguroExigido: false, apolices: [] })).toEqual([]);
  });
});

describe("insurance coverage (RF018)", () => {
  it("accepts consecutive policies and rejects a gap of one day", () => {
    const alvo = { inicio: "2026-01-01", fim: "2026-12-31" };
    expect(periodoCoberto([{ inicio: "2026-07-01", fim: "2026-12-31" }, { inicio: "2025-12-01", fim: "2026-06-30" }], alvo)).toBe(true);
    expect(periodoCoberto([{ inicio: "2026-01-01", fim: "2026-06-29" }, { inicio: "2026-07-01", fim: "2026-12-31" }], alvo)).toBe(false);
  });
});
