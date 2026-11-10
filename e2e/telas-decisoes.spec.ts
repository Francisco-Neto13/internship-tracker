import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { dados, erro, SENHA, sessoes, telaDe } from "./support/api";
import { criarEstagioAtivoDesdeAgosto, criarEstagioEmFormalizacao } from "./support/estagio";

// The screens added for what had no way in: choosing the responsible people by name, evaluating
// an intern, the organization of a concedente, the audit trail in plain words, and the PDFs.

const sessao = sessoes(100);
const entrar = async (browser: Browser, email: string) => telaDe(await sessao(browser, email, SENHA));

async function baixar(tela: Page, rotulo: string) {
  const [arquivo] = await Promise.all([tela.waitForEvent("download"), tela.getByRole("button", { name: rotulo, exact: true }).first().click()]);
  return readFile(await arquivo.path());
}
const ehPdf = (conteudo: Buffer) => expect(conteudo.subarray(0, 5).toString()).toBe("%PDF-");
const semViolacoes = async (tela: Page) => expect((await new AxeBuilder({ page: tela }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);

test("coordination binds the responsible people by name, without internal codes", async ({ browser }) => {
  const { id, coordenacao } = await criarEstagioEmFormalizacao(browser, sessao, "vinculo");
  const tela = await telaDe(coordenacao);
  await tela.goto(`/estagios/${id}?aba=formalizacao`);
  const painel = tela.getByTestId("vincular-responsavel");
  await expect(painel).toBeVisible();
  await expect(tela.getByText("Código da conta")).toHaveCount(0);

  await painel.getByLabel("Pessoa").fill("Olga");
  await painel.getByRole("button", { name: /Olga Orientadora/ }).click();
  await painel.getByRole("button", { name: "Vincular responsável" }).click();
  await tela.getByRole("dialog").getByRole("button", { name: "Vincular", exact: true }).click();
  await expect(tela.locator("main li").filter({ hasText: "Professor orientador" })).toContainText("Olga Orientadora");

  // A supervisor comes only from this concedente; the advisor is not offered as one
  await painel.getByLabel("Papel").selectOption("SUPERVISOR");
  await painel.getByLabel("Pessoa").fill("Olga");
  await expect(painel.getByText("Nenhuma conta compatível")).toBeVisible();
  await painel.getByLabel("Pessoa").fill("Sérgio");
  await expect(painel.getByRole("button", { name: /Sérgio Supervisor/ })).toBeVisible();
});

test("the supervisor evaluates an intern, and everyone involved reads the result", async ({ browser }) => {
  test.setTimeout(120_000);
  const { id, aluno, supervisor, coordenacao } = await criarEstagioAtivoDesdeAgosto(browser, sessao, "desempenho");
  const aba = `/estagios/${id}?aba=desempenho`;
  const tela = await telaDe(supervisor);
  await tela.goto(aba);
  const formulario = tela.getByTestId("nova-avaliacao");
  await semViolacoes(tela);

  // Saving without grades points at the first criterion and sends nothing
  await formulario.getByRole("button", { name: "Registrar avaliação" }).click();
  await expect(formulario.getByText("Dê uma nota a este critério").first()).toBeVisible();
  await expect(tela.getByRole("alertdialog")).toHaveCount(0);

  const criterios = formulario.locator("fieldset");
  for (let indice = 0; indice < (await criterios.count()); indice++) await criterios.nth(indice).locator("label").last().click();
  await formulario.getByRole("button", { name: "Registrar avaliação" }).click();
  const confirmacao = tela.getByRole("alertdialog");
  await expect(confirmacao).toContainText("exigida para a conclusão");
  await confirmacao.getByRole("button", { name: "Registrar avaliação" }).click();

  await expect(tela.getByTestId("avaliacoes")).toContainText("Avaliação final");
  await expect(tela.getByTestId("desempenho-resumo")).toContainText("10 / 10");
  await expect(formulario.getByLabel("Momento").locator("option")).toHaveText(["Avaliação periódica"]);
  ehPdf(await baixar(tela, "Baixar PDF"));

  // The student reads it and does not evaluate
  const telaAluno = await telaDe(aluno);
  await telaAluno.goto(aba);
  await expect(telaAluno.getByTestId("avaliacoes")).toContainText("Avaliação final");
  await expect(telaAluno.getByTestId("nova-avaliacao")).toHaveCount(0);

  // Attendance sheet and termination term, from the screens that offer them
  await dados(await aluno.post(`/api/v1/estagios/${id}/frequencias`, { data: { data: "2026-08-03", horas: 5 } }), 201);
  await telaAluno.goto(`/estagios/${id}?aba=acompanhamento`);
  ehPdf(await baixar(telaAluno, "Folha (PDF)"));
  await dados(await coordenacao.post(`/api/v1/estagios/${id}/rescisao`, { data: { data_rescisao: "2026-08-05", solicitante: "ESTUDANTE", motivo: "Efetivação em outra empresa" } }), 201);
  await telaAluno.goto(`/estagios/${id}?aba=ocorrencias`);
  ehPdf(await baixar(telaAluno, "Termo (PDF)"));
});

test("the administrator keeps the evaluation criteria", async ({ browser }) => {
  const tela = await entrar(browser, "admin@internship.local");
  await tela.goto("/administracao/parametros");
  const descricao = `Critério de teste ${randomUUID().slice(0, 8)}`;
  const novo = tela.getByTestId("novo-criterio");
  await novo.getByLabel("Descrição").fill(descricao);
  await novo.getByRole("button", { name: "Adicionar critério" }).click();
  const linha = tela.getByTestId("criterios-avaliacao").locator("li").filter({ hasText: descricao });
  await expect(linha).toContainText("Ativo");
  // Criteria are global: leaving this one active would demand a grade from every other test
  await linha.getByRole("button", { name: "Desativar" }).click();
  await expect(linha).toContainText("Desativado");
});

test("the concedente keeps its contacts and nothing else", async ({ browser }) => {
  const rh = await sessao(browser, "rh@exemplo-software.local", SENHA);
  const tela = await telaDe(rh);
  await tela.goto("/organizacao");
  await expect(tela.getByTestId("convenios-organizacao")).toContainText("CV-2026-0001");
  await semViolacoes(tela);
  const contatos = tela.getByTestId("contatos-organizacao");
  await contatos.getByLabel("Telefone").fill("(82) 3333-4444");
  await contatos.getByRole("button", { name: "Salvar contatos" }).click();
  await expect(contatos.getByRole("status")).toContainText("Contatos atualizados");
  await tela.reload();
  await expect(tela.getByTestId("contatos-organizacao").getByLabel("Telefone")).toHaveValue("(82) 3333-4444");

  const [concedente] = await dados<{ id: string }[]>(await rh.get("/api/v1/concedentes?busca=11222333000181"));
  expect((await erro(await rh.patch(`/api/v1/concedentes/${concedente.id}`, { data: { razao_social: "Outro nome" } }), 403)).code).toBe("ALTERACAO_RESTRITA_A_CONTATOS");
});

test("the audit trail reads in plain words, on screen and in the export", async ({ browser }) => {
  const tela = await entrar(browser, "admin@internship.local");
  await tela.goto("/administracao/auditoria");
  const lista = tela.getByTestId("auditoria-lista");
  await expect(lista).not.toContainText(/\b(INSERT|UPDATE|DELETE)\b/);
  await lista.locator("summary").first().click();
  await expect(lista.locator("details table").first().locator("tbody td:first-child").first()).not.toContainText("_");
  expect((await baixar(tela, "Exportar CSV")).toString()).toContain("Data e hora");
});
