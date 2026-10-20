import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { auditoria, concedente, vinculoPerfil } from "@/db/schema";
import { createUsuario as criarUsuario, substituirPerfis } from "@/modules/acesso/services/usuario-service";
import type { ConcedenteValues } from "@/modules/concedentes/repositories/concedente-repository";
import {
  alterarSituacaoConcedente,
  createClassificacao,
  createConcedente,
  listConcedentes,
  listHistoricoSituacao,
  updateClassificacaoDados,
  updateConcedenteDados,
} from "@/modules/concedentes/services/concedente-service";
import { cnpjAleatorio, createAccessScenario, createConcedente as concedenteFixture, createUsuario, grantPerfil, identityOf, owner } from "./fixtures";

type Scenario = Awaited<ReturnType<typeof createAccessScenario>>;

function dados(overrides: Partial<ConcedenteValues> = {}): ConcedenteValues {
  const id = randomUUID().slice(0, 6);
  return {
    razaoSocial: `Empresa ${id} Ltda`,
    nomeFantasia: null,
    cnpj: cnpjAleatorio(),
    logradouro: "Av. Fernandes Lima",
    numeroEndereco: "10",
    complemento: null,
    bairro: "Farol",
    municipio: "Maceió",
    uf: "AL",
    cep: "57050000",
    emailContato: `rh-${id}@empresa.local`,
    telefoneContato: null,
    representanteLegalNome: "Ana Representante",
    representanteLegalCargo: null,
    areaAtuacao: "Desenvolvimento de software",
    porteId: null,
    setorAtuacaoId: null,
    ...overrides,
  };
}

describe("concedente registration (RF007, RF013)", () => {
  let s: Scenario;

  beforeAll(async () => {
    s = await createAccessScenario();
  });

  it("lets coordination register a concedente, normalizing the CNPJ and starting ATIVA", async () => {
    const cnpj = cnpjAleatorio();
    const formatado = `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;

    const criada = await createConcedente(identityOf(s.coordenadorA.id), dados({ cnpj: formatado }));

    expect(criada).toMatchObject({ cnpj, situacao: "ATIVA" });
  });

  it("accepts an alphanumeric CNPJ (IN RFB 2.229/2024)", async () => {
    const alfanumerico = await createConcedente(identityOf(s.administrador.id), dados({ cnpj: "12.ABC.345/01DE-35" })).catch(
      (error: { code?: string }) => error,
    );
    // The official example may already exist from an earlier run: either way it was accepted as valid
    expect("code" in alfanumerico ? alfanumerico.code : "CRIADA").toMatch(/CRIADA|CNPJ_DUPLICADO/);
  });

  it("rejects an invalid or repeated CNPJ", async () => {
    await expect(createConcedente(identityOf(s.administrador.id), dados({ cnpj: "11222333000182" }))).rejects.toMatchObject({
      code: "CNPJ_INVALIDO",
    });
    const cnpj = cnpjAleatorio();
    await createConcedente(identityOf(s.administrador.id), dados({ cnpj }));
    await expect(createConcedente(identityOf(s.administrador.id), dados({ cnpj }))).rejects.toMatchObject({ code: "CNPJ_DUPLICADO" });
  });

  it("refuses registration by a student", async () => {
    await expect(createConcedente(identityOf(s.alunoA.id), dados())).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
  });

  it("refuses a deactivated size or sector", async () => {
    const porte = await createClassificacao(identityOf(s.administrador.id), "porte", `Porte ${randomUUID().slice(0, 6)}`);
    await updateClassificacaoDados(identityOf(s.administrador.id), "porte", porte.id, { ativo: false });

    await expect(createConcedente(identityOf(s.administrador.id), dados({ porteId: porte.id }))).rejects.toMatchObject({
      code: "CLASSIFICACAO_INATIVA",
    });
  });

  it("finds a concedente by a formatted CNPJ and shows the catalog to every profile", async () => {
    const criada = await createConcedente(identityOf(s.administrador.id), dados());
    const formatado = `${criada.cnpj.slice(0, 2)}.${criada.cnpj.slice(2, 5)}.${criada.cnpj.slice(5, 8)}/${criada.cnpj.slice(8, 12)}-${criada.cnpj.slice(12)}`;

    const { items } = await listConcedentes(identityOf(s.alunoA.id), { page: 1, limit: 10, busca: formatado });
    expect(items.map((item) => item.id)).toEqual([criada.id]);
  });
});

describe("concedente representative and contacts (RF007, RN-37)", () => {
  let s: Scenario;
  let alvo: Awaited<ReturnType<typeof concedenteFixture>>;
  let representante: Awaited<ReturnType<typeof createUsuario>>;

  beforeAll(async () => {
    s = await createAccessScenario();
    alvo = await concedenteFixture();
    representante = await createUsuario();
    await grantPerfil(representante.id, "CONCEDENTE", { concedenteId: alvo.id });
  });

  it("lets the representative update its own contacts", async () => {
    const atualizada = await updateConcedenteDados(identityOf(representante.id), alvo.id, { telefoneContato: "82 99999-0000" });
    expect(atualizada.telefoneContato).toBe("82 99999-0000");
  });

  it("refuses any other field to the representative", async () => {
    await expect(updateConcedenteDados(identityOf(representante.id), alvo.id, { razaoSocial: "Outro nome" })).rejects.toMatchObject({
      code: "ALTERACAO_RESTRITA_A_CONTATOS",
    });
  });

  it("refuses edition of another concedente to the representative", async () => {
    const outra = await concedenteFixture();
    await expect(updateConcedenteDados(identityOf(representante.id), outra.id, { telefoneContato: "1" })).rejects.toMatchObject({
      code: "ACESSO_NEGADO",
    });
  });
});

describe("suspension and reactivation (RF008, RN-31)", () => {
  let s: Scenario;

  beforeAll(async () => {
    s = await createAccessScenario();
  });

  it("suspends with a reason, records the author and reactivates", async () => {
    const alvo = await concedenteFixture();

    const suspensa = await alterarSituacaoConcedente(identityOf(s.coordenadorA.id), alvo.id, "SUSPENSA", "Documentação vencida");
    expect(suspensa.concedente.situacao).toBe("SUSPENSA");
    await expect(alterarSituacaoConcedente(identityOf(s.coordenadorA.id), alvo.id, "SUSPENSA", "de novo")).rejects.toMatchObject({
      code: "CONCEDENTE_JA_SUSPENSA",
    });
    await alterarSituacaoConcedente(identityOf(s.administrador.id), alvo.id, "ATIVA", null);

    const historico = await listHistoricoSituacao(identityOf(s.administrador.id), alvo.id);
    expect(historico.map((item) => item.situacaoNova)).toEqual(["ATIVA", "SUSPENSA"]);
    expect(historico[1]).toMatchObject({ motivo: "Documentação vencida", decididoPorUsuarioId: s.coordenadorA.id });

    const [registro] = await owner()
      .select()
      .from(auditoria)
      .where(and(eq(auditoria.tabela, "concedente"), eq(auditoria.registroId, alvo.id)))
      .orderBy(desc(auditoria.id))
      .limit(1);
    expect(registro.usuarioId).toBe(s.administrador.id);
  });

  it("refuses a situation change without history, even for the owner", async () => {
    const alvo = await concedenteFixture();
    await expect(owner().update(concedente).set({ situacao: "SUSPENSA" }).where(eq(concedente.id, alvo.id))).rejects.toMatchObject({
      cause: expect.objectContaining({ message: expect.stringMatching(/^SITUACAO_SEM_HISTORICO/) }),
    });
  });

  it("refuses suspension to a student and hides the history from them", async () => {
    const alvo = await concedenteFixture();
    await expect(alterarSituacaoConcedente(identityOf(s.alunoA.id), alvo.id, "SUSPENSA", "x")).rejects.toMatchObject({
      code: "ACESSO_NEGADO",
    });
    expect(await listHistoricoSituacao(identityOf(s.alunoA.id), alvo.id)).toEqual([]);
  });
});

describe("supervisor and concedente links (RF031, RN-37)", () => {
  let s: Scenario;

  beforeAll(async () => {
    s = await createAccessScenario();
  });

  it("creates a supervisor bound to a concedente and replaces it by another one", async () => {
    const primeira = await concedenteFixture();
    const segunda = await concedenteFixture();
    const { usuario } = await criarUsuario(identityOf(s.administrador.id), {
      nome: "Supervisora",
      email: `sup-${randomUUID().slice(0, 8)}@teste.local`,
      perfis: [{ perfil: "SUPERVISOR", cursoId: null, concedenteId: primeira.id }],
    });
    expect(usuario.perfis).toEqual([expect.objectContaining({ perfil: "SUPERVISOR", concedenteId: primeira.id })]);

    const vigentes = await substituirPerfis(identityOf(s.administrador.id), usuario.id, [
      { perfil: "SUPERVISOR", cursoId: null, concedenteId: segunda.id },
    ]);
    expect(vigentes.map((vinculo) => vinculo.concedenteId)).toEqual([segunda.id]);
  });

  it("rejects a supervisor without concedente in the domain and in the database", async () => {
    await expect(
      criarUsuario(identityOf(s.administrador.id), {
        nome: "Sem concedente",
        email: `semc-${randomUUID().slice(0, 8)}@teste.local`,
        perfis: [{ perfil: "SUPERVISOR", cursoId: null }],
      }),
    ).rejects.toMatchObject({ code: "VINCULOS_INVALIDOS" });

    const pessoa = await createUsuario();
    await expect(owner().insert(vinculoPerfil).values({ usuarioId: pessoa.id, perfil: "SUPERVISOR" })).rejects.toMatchObject({
      cause: expect.objectContaining({ constraint: "vinculo_perfil_concedente_exige_concedente" }),
    });
  });

  it("reports a link to a concedente that does not exist", async () => {
    await expect(
      criarUsuario(identityOf(s.administrador.id), {
        nome: "Concedente fantasma",
        email: `fant-${randomUUID().slice(0, 8)}@teste.local`,
        perfis: [{ perfil: "CONCEDENTE", cursoId: null, concedenteId: randomUUID() }],
      }),
    ).rejects.toMatchObject({ code: "CONCEDENTE_INEXISTENTE" });
  });
});
