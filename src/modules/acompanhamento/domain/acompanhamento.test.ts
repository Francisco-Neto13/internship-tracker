import { describe, expect, it } from "vitest";
import { avaliarDivergencia, diaAnterior, diasUteis, minutosPrevistosAte, resumoCarga } from "./carga";
import { avaliarJornada, duracaoDoHorario, semanaIso } from "./jornada";

const estagio = { dataInicio: "2026-08-03", dataFimPrevista: "2027-08-02", cargaSemanalMinutos: 30 * 60, cargaTotalMinutos: 400 * 60 };
const limites = { limiteDiarioMinutos: 360, limiteSemanalMinutos: 1800, bloquearExcedente: true };

describe("duracaoDoHorario (D2)", () => {
  it("subtracts the break of a split shift", () => {
    expect(duracaoDoHorario({ horaEntrada: "08:00", horaSaida: "15:00", intervaloMinutos: 60 })).toEqual({ minutos: 360 });
  });

  it("refuses an exit before the entry and a break as long as the day", () => {
    expect(duracaoDoHorario({ horaEntrada: "13:00", horaSaida: "13:00", intervaloMinutos: 0 })).toEqual({ problema: "SAIDA_ANTES_DA_ENTRADA" });
    expect(duracaoDoHorario({ horaEntrada: "13:00", horaSaida: "14:00", intervaloMinutos: 60 })).toEqual({ problema: "INTERVALO_MAIOR_QUE_JORNADA" });
  });

  it("rejects malformed times", () => {
    expect(() => duracaoDoHorario({ horaEntrada: "24:00", horaSaida: "25:00", intervaloMinutos: 0 })).toThrow(/inválido/);
  });
});

describe("semanaIso (D4)", () => {
  it("runs from Monday to Sunday, also across months and years", () => {
    expect(semanaIso("2026-10-21")).toEqual({ inicio: "2026-10-19", fim: "2026-10-25" });
    expect(semanaIso("2026-10-19")).toEqual({ inicio: "2026-10-19", fim: "2026-10-25" });
    expect(semanaIso("2026-10-25")).toEqual({ inicio: "2026-10-19", fim: "2026-10-25" });
    expect(semanaIso("2027-01-01")).toEqual({ inicio: "2026-12-28", fim: "2027-01-03" });
  });
});

describe("avaliarJornada (RF024, RF025)", () => {
  it("accepts a day within both limits", () => {
    expect(avaliarJornada(360, 1440, limites)).toMatchObject({ bloqueia: false, situacao: "REGISTRADO", totalSemanaMinutos: 1800 });
  });

  it("blocks a day over the daily limit when the institution blocks", () => {
    expect(avaliarJornada(361, 0, limites)).toMatchObject({ excedeuDiario: true, excedeuSemanal: false, bloqueia: true });
  });

  it("blocks the week that passes 30 hours, even with a legal day", () => {
    expect(avaliarJornada(360, 1500, limites)).toMatchObject({ excedeuDiario: false, excedeuSemanal: true, bloqueia: true });
  });

  it("only flags when the institution does not block", () => {
    expect(avaliarJornada(400, 0, { ...limites, bloquearExcedente: false })).toMatchObject({ bloqueia: false, situacao: "SINALIZADO" });
  });
});

describe("diasUteis", () => {
  it("counts Monday to Friday, both ends included", () => {
    expect(diasUteis("2026-10-19", "2026-10-25")).toBe(5);
    expect(diasUteis("2026-10-24", "2026-10-25")).toBe(0);
    expect(diasUteis("2026-10-23", "2026-10-26")).toBe(2);
    expect(diasUteis("2026-08-03", "2026-10-30")).toBe(65);
    expect(diasUteis("2026-10-26", "2026-10-25")).toBe(0);
  });

  it("matches a day-by-day count over a long range", () => {
    let contagem = 0;
    for (let d = new Date("2026-01-01T00:00:00Z"); d <= new Date("2027-12-31T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) {
      if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) contagem++;
    }
    expect(diasUteis("2026-01-01", "2027-12-31")).toBe(contagem);
  });
});

describe("minutosPrevistosAte", () => {
  it("spreads the weekly workload over the business days elapsed", () => {
    expect(minutosPrevistosAte(estagio, "2026-08-07")).toBe(1800);
    expect(minutosPrevistosAte(estagio, "2026-08-04")).toBe(720);
  });

  it("stops at the planned end and at the total workload", () => {
    expect(minutosPrevistosAte(estagio, "2030-01-01")).toBe(400 * 60);
    expect(minutosPrevistosAte({ ...estagio, cargaTotalMinutos: 10_000_000 }, "2030-01-01")).toBe(minutosPrevistosAte({ ...estagio, cargaTotalMinutos: 10_000_000 }, "2027-08-02"));
  });

  it("expects nothing before the start", () => {
    expect(minutosPrevistosAte(estagio, "2026-08-01")).toBe(0);
  });
});

describe("avaliarDivergencia (RF028)", () => {
  it("uses the day before as reference", () => {
    expect(diaAnterior("2026-03-01")).toBe("2026-02-28");
    expect(avaliarDivergencia(estagio, 0, 10, "2026-08-08").dataReferencia).toBe("2026-08-07");
  });

  it("does not evaluate before a full week is expected", () => {
    expect(avaliarDivergencia(estagio, 0, 10, "2026-08-06")).toMatchObject({ avaliada: false, divergente: false });
  });

  it("flags only above the tolerance, compared exactly", () => {
    // 1800 expected after the first week; 10% is 180 minutes
    expect(avaliarDivergencia(estagio, 1620, 10, "2026-08-08")).toMatchObject({ divergente: false, percentual: 10 });
    expect(avaliarDivergencia(estagio, 1619, 10, "2026-08-08")).toMatchObject({ divergente: true });
    expect(avaliarDivergencia(estagio, 1980, 10, "2026-08-08")).toMatchObject({ divergente: false });
    expect(avaliarDivergencia(estagio, 1981, 10, "2026-08-08")).toMatchObject({ divergente: true });
  });

  it("honours a fractional tolerance", () => {
    expect(avaliarDivergencia(estagio, 1710, 5.5, "2026-08-08")).toMatchObject({ divergente: false });
    expect(avaliarDivergencia(estagio, 1700, 5.5, "2026-08-08")).toMatchObject({ divergente: true });
  });
});

describe("resumoCarga (RF026)", () => {
  it("counts only homologated minutes toward balance and percentage", () => {
    expect(
      resumoCarga(estagio, { minutosCumpridos: 9000, minutosHomologados: 6000, minutosPendentes: 3000, lancamentosSinalizados: 1 }),
    ).toMatchObject({ saldoMinutos: 18000, percentualConclusao: 25 });
  });

  it("never goes below zero nor above 100%", () => {
    expect(
      resumoCarga(estagio, { minutosCumpridos: 30000, minutosHomologados: 30000, minutosPendentes: 0, lancamentosSinalizados: 0 }),
    ).toMatchObject({ saldoMinutos: 0, percentualConclusao: 100 });
  });
});
