import { describe, expect, it } from "vitest";
import { janelaDePaginas } from "@/shared/ui/paginacao";
import { comConsulta, lerConsulta, lerPaginacao, opcao, uuidOu } from "./consulta";
import { diasEntre, formatarData, haQuantoTempo, prazoEmPalavras } from "./datas";
import { descreverOperacao, formatarCnpj, humanizarCodigos, identificarEstagio } from "./rotulos";

describe("janelaDePaginas", () => {
  it("keeps first and last, two neighbours, and ellipsis only for two or more hidden pages", () => {
    expect(janelaDePaginas(1, 1)).toEqual([1]);
    expect(janelaDePaginas(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(janelaDePaginas(8, 40)).toEqual([1, "…", 6, 7, 8, 9, 10, "…", 40]);
    // One hidden page shows as its number, not as an ellipsis
    expect(janelaDePaginas(4, 40)).toEqual([1, 2, 3, 4, 5, 6, "…", 40]);
  });
});

describe("consulta", () => {
  it("reads the first value of each key and drops empty ones", () => {
    expect(lerConsulta({ busca: ["ana", "x"], vazio: "", curso_id: undefined, pagina: "2" })).toEqual({ busca: "ana", pagina: "2" });
  });

  it("sanitizes page and page size, falling back to the defaults", () => {
    expect(lerPaginacao({ pagina: "3", por_pagina: "50" })).toEqual({ pagina: 3, porPagina: 50 });
    expect(lerPaginacao({ pagina: "-1", por_pagina: "37" })).toEqual({ pagina: 1, porPagina: 20 });
    expect(lerPaginacao({ pagina: "abc" }, 10)).toEqual({ pagina: 1, porPagina: 10 });
  });

  it("accepts only known options and valid ids, and keeps the query on the way back", () => {
    expect(opcao("ATIVO", ["ATIVO", "INATIVO"] as const)).toBe("ATIVO");
    expect(opcao("DROP", ["ATIVO"] as const)).toBeUndefined();
    expect(uuidOu("69be68a0-1e33-43d0-9f78-36ad14da5405")).toBe("69be68a0-1e33-43d0-9f78-36ad14da5405");
    expect(uuidOu("1 or 1=1")).toBeUndefined();
    expect(comConsulta("/estagios", { busca: "ana", situacao: undefined, pagina: "2" })).toBe("/estagios?busca=ana&pagina=2");
  });
});

describe("datas", () => {
  it("formats calendar dates and counts days between them", () => {
    expect(formatarData("2026-08-03")).toBe("03/08/2026");
    expect(formatarData(null)).toBe("Sem data");
    expect(diasEntre("2026-08-03", "2026-08-10")).toBe(7);
    expect(diasEntre("2026-03-01", "2026-02-28")).toBe(-1);
  });

  it("says deadlines and elapsed time in words", () => {
    expect(prazoEmPalavras("2026-11-01", "2026-11-01")).toBe("hoje");
    expect(prazoEmPalavras("2026-11-02", "2026-11-01")).toBe("amanhã");
    expect(prazoEmPalavras("2026-11-11", "2026-11-01")).toBe("em 10 dias");
    expect(prazoEmPalavras("2026-10-29", "2026-11-01")).toBe("há 3 dias");
    const agora = new Date("2026-11-01T15:00:00Z");
    expect(haQuantoTempo(new Date("2026-11-01T14:59:30Z"), agora)).toBe("agora");
    expect(haQuantoTempo(new Date("2026-11-01T12:00:00Z"), agora)).toBe("há 3 h");
    expect(haQuantoTempo(new Date("2026-10-31T15:00:00Z"), agora)).toBe("ontem");
  });
});

describe("rotulos", () => {
  it("turns situation codes into interface names inside a database message", () => {
    expect(humanizarCodigos("O estágio passou de EM_FORMALIZACAO para ATIVO.")).toBe("O estágio passou de em formalização para ativo.");
    expect(humanizarCodigos("Código RF070 e CODIGO_DESCONHECIDO ficam")).toBe("Código RF070 e CODIGO_DESCONHECIDO ficam");
  });

  it("formats CNPJ, including the alphanumeric one, and names audit operations", () => {
    expect(formatarCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatarCnpj("12ABC34501DE35")).toBe("12.ABC.345/01DE-35");
    expect(descreverOperacao("convenio_vigencia", "INSERT")).toBe("Vigência de convênio criado");
    expect(descreverOperacao("tabela_nova", "UPDATE")).toBe("tabela_nova alterado");
  });
});

describe("identificarEstagio", () => {
  it("uses the name when RLS shows it and the start date when it does not", () => {
    expect(identificarEstagio({ estudanteNome: "Ana", dataInicio: "2026-08-03" })).toBe("Ana");
    expect(identificarEstagio({ estudanteNome: null, dataInicio: "2026-08-03" })).toBe("Início em 3 de ago. de 2026");
  });
});
