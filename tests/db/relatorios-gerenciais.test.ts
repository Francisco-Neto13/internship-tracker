import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarCriterio, listCriterios, registrarAvaliacao } from "@/modules/acompanhamento/services/avaliacao-service";
import { exportarRelatorio, gerarRelatorio } from "@/modules/administracao/services/relatorio-gerencial-service";
import { concluirEstagio, rescindirEstagio } from "@/modules/estagios/services/encerramento-service";
import { closeOwnerDatabase, createMundoEstagio, createUsuario, grantPerfil } from "./fixtures";
import { como, estagioAtivo, type Mundo } from "./estagio-helpers";

// RF067, RF068, RN-29: management reports scoped to the courses of the caller (administrator:
// all), filtered by course, period and concedente, exported to CSV and PDF from the same rows.

afterAll(closeOwnerDatabase);

let administrador: { id: string };
beforeAll(async () => {
  administrador = await createUsuario();
  await grantPerfil(administrador.id, "ADMINISTRADOR");
  await criarCriterio(como(administrador), { codigo: `GERENCIAL_${randomUUID().slice(0, 8).toUpperCase()}`, descricao: "Organização", escalaMinima: 1, escalaMaxima: 5, ordem: 1 });
});

const semFiltro = { cursoId: null, concedenteId: null, de: null, ate: null };

async function concluido(mundo: Mundo) {
  const id = await estagioAtivo(mundo, { tipo: "NAO_OBRIGATORIO", bolsaValor: "1200.00", auxilioTransporteValor: "200.00" });
  const criterios = await listCriterios(como(mundo.supervisor));
  await registrarAvaliacao(como(mundo.supervisor), id, {
    momento: "FINAL",
    periodoInicio: null,
    periodoFim: null,
    observacoes: null,
    respostas: criterios.map((criterio) => ({ criterioId: criterio.id, nota: criterio.escalaMaxima, comentario: null })),
  });
  await concluirEstagio(como(mundo.coordenador), id);
  return id;
}

describe("alcance (RF067)", () => {
  it("the coordination sees its courses, the administrator all, any other profile nothing", async () => {
    const mundo = await createMundoEstagio();
    await estagioAtivo(mundo);
    const filtro = { ...semFiltro, cursoId: mundo.curso.id };
    const linha = { curso_id: mundo.curso.id, concedente_id: mundo.concedente.id, tipo: "OBRIGATORIO", estagiarios: 1 };
    expect(await gerarRelatorio(como(mundo.coordenador), "estagiarios-ativos", filtro)).toEqual([expect.objectContaining(linha)]);
    expect(await gerarRelatorio(como(administrador), "estagiarios-ativos", filtro)).toEqual([expect.objectContaining(linha)]);
    const outro = await createMundoEstagio();
    for (const pessoa of [outro.coordenador, mundo.aluno, mundo.orientador, mundo.representante]) {
      expect(await gerarRelatorio(como(pessoa), "estagiarios-ativos", filtro), pessoa.email).toEqual([]);
      expect(await gerarRelatorio(como(pessoa), "pendencias-integralizacao", filtro), pessoa.email).toEqual([]);
    }
  });
});

describe("relatórios (RF067)", () => {
  it("active interns follow the period and the concedente filter", async () => {
    const mundo = await createMundoEstagio();
    await estagioAtivo(mundo);
    const filtro = { ...semFiltro, cursoId: mundo.curso.id };
    expect(await gerarRelatorio(como(mundo.coordenador), "estagiarios-ativos", { ...filtro, de: "2026-01-01", ate: "2026-07-31" })).toEqual([]);
    expect(await gerarRelatorio(como(mundo.coordenador), "estagiarios-ativos", { ...filtro, de: "2026-08-01", ate: "2026-08-31" })).toHaveLength(1);
    const outra = await createMundoEstagio();
    expect(await gerarRelatorio(como(mundo.coordenador), "estagiarios-ativos", { ...filtro, concedenteId: outra.concedente.id })).toEqual([]);
  });

  it("partner concedentes have an agreement in force and count their internships", async () => {
    const mundo = await createMundoEstagio();
    await estagioAtivo(mundo);
    const [linha] = await gerarRelatorio(como(mundo.coordenador), "concedentes-parceiras", { ...semFiltro, cursoId: mundo.curso.id, concedenteId: mundo.concedente.id });
    expect(linha).toMatchObject({ concedente_id: mundo.concedente.id, situacao: "ATIVA", convenios_vigentes: 1, estagios: 1 });
    // The fixture agreement ends in 2030
    expect(await gerarRelatorio(como(mundo.coordenador), "concedentes-parceiras", { ...semFiltro, concedenteId: mundo.concedente.id, de: "2031-01-01", ate: "2031-12-31" })).toEqual([]);
  });

  it("the conclusion rate counts concluded and rescinded internships ended in the period", async () => {
    const um = await createMundoEstagio();
    await concluido(um);
    const outro = await createMundoEstagio();
    const rescindido = await estagioAtivo(outro);
    await rescindirEstagio(como(outro.coordenador), rescindido, { dataRescisao: "2026-08-05", solicitante: "ESTUDANTE", motivo: "Mudança de cidade", documentoId: null });

    expect(await gerarRelatorio(como(administrador), "taxa-conclusao", { ...semFiltro, cursoId: um.curso.id })).toEqual([
      expect.objectContaining({ concluidos: 1, rescindidos: 0, taxa_conclusao_percentual: 100 }),
    ]);
    expect(await gerarRelatorio(como(administrador), "taxa-conclusao", { ...semFiltro, cursoId: outro.curso.id })).toEqual([
      expect.objectContaining({ concluidos: 0, rescindidos: 1, taxa_conclusao_percentual: 0 }),
    ]);
    expect(await gerarRelatorio(como(administrador), "taxa-conclusao", { ...semFiltro, cursoId: um.curso.id, ate: "2026-01-01" })).toEqual([]);
  });

  it("integralization pending lists enrolled students with what is missing, in hours", async () => {
    const mundo = await createMundoEstagio();
    const linhas = await gerarRelatorio(como(mundo.coordenador), "pendencias-integralizacao", { ...semFiltro, cursoId: mundo.curso.id });
    // Course of the fixture: 400 h of internship and 200 h of activities, nothing done yet
    expect(linhas).toEqual([expect.objectContaining({ estudante_id: mundo.estudante.id, estagio_faltante_horas: 400, atividades_faltante_horas: 200 })]);
  });
});

describe("exportação (RF068)", () => {
  it("exports the same rows as CSV and PDF", async () => {
    const mundo = await createMundoEstagio();
    await estagioAtivo(mundo);
    const filtro = { ...semFiltro, cursoId: mundo.curso.id };
    const csv = (await exportarRelatorio(como(mundo.coordenador), "estagiarios-ativos", filtro, "csv")) as string;
    const [cabecalho, linha] = csv.replace(/^﻿/, "").trim().split("\r\n");
    expect(cabecalho).toBe('"Curso";"Concedente";"Tipo";"Estagiários"');
    expect(linha).toBe(`"${mundo.curso.nome}";"${mundo.concedente.razaoSocial}";"Obrigatório";"1"`);

    const pdf = (await exportarRelatorio(como(mundo.coordenador), "pendencias-integralizacao", filtro, "pdf")) as Uint8Array;
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
    // Nothing for a profile without scope, still a valid document
    const vazio = (await exportarRelatorio(como(mundo.aluno), "taxa-conclusao", filtro, "pdf")) as Uint8Array;
    expect(Buffer.from(vazio.slice(0, 5)).toString()).toBe("%PDF-");
  });
});
