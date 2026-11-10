import { expect, test, type Page } from "@playwright/test";
import { dados, sessoes, telaDe } from "./support/api";
import { criarEstagioAtivoDesdeAgosto } from "./support/estagio";

// Each person sees only their own part of the internship (papeis.ts): the student does not get
// the buttons to approve the report they sent, the supervisor does not get the student's form,
// and the advisor approves from the screen without an opinion, which the button sends with no
// body (RF038). An internship is created on every run, with addresses of its own range.

const sessao = sessoes(20);
const botao = (tela: Page, nome: string) => tela.getByRole("button", { name: nome, exact: true });
const titulo = (tela: Page, nome: string) => tela.getByRole("heading", { name: nome, exact: true });

test("each person sees only their own part of an active internship", async ({ browser }) => {
  const { id, aluno, orientador, supervisor, coordenacao } = await criarEstagioAtivoDesdeAgosto(browser, sessao, "perfis");
  const [primeiro] = await dados<{ id: string }[]>(await aluno.get(`/api/v1/estagios/${id}/relatorios`));
  await dados(await aluno.post(`/api/v1/relatorios/${primeiro.id}/versoes`, { data: { conteudo: "Atividades de agosto" } }), 201);
  const acompanhamento = `/estagios/${id}?aba=acompanhamento`;
  const ocorrencias = `/estagios/${id}?aba=ocorrencias`;

  // Student: records hours and sends reports; does not decide, homologate, follow up or end it
  const telaAluno = await telaDe(aluno);
  await telaAluno.goto(acompanhamento);
  await expect(titulo(telaAluno, "Registrar dia")).toBeVisible();
  await expect(telaAluno.getByTestId("relatorios")).toContainText("Em análise");
  await expect(botao(telaAluno, "Aprovar")).toHaveCount(0);
  await expect(botao(telaAluno, "Devolver")).toHaveCount(0);
  await expect(titulo(telaAluno, "Homologar período")).toHaveCount(0);
  await expect(titulo(telaAluno, "Acompanhamento do orientador")).toHaveCount(0);
  await telaAluno.goto(ocorrencias);
  await expect(titulo(telaAluno, "Afastamentos")).toBeVisible();
  await expect(telaAluno.getByText("Registrar afastamento")).toHaveCount(0);
  await expect(titulo(telaAluno, "Concluir estágio")).toHaveCount(0);
  await expect(titulo(telaAluno, "Rescindir estágio")).toHaveCount(0);

  // Supervisor: homologates; does not record the student's days nor read reports (DER §4.5)
  const telaSupervisor = await telaDe(supervisor);
  await telaSupervisor.goto(acompanhamento);
  await expect(titulo(telaSupervisor, "Homologar período")).toBeVisible();
  await expect(titulo(telaSupervisor, "Registrar dia")).toHaveCount(0);
  await expect(telaSupervisor.getByTestId("relatorios")).toHaveCount(0);
  await expect(titulo(telaSupervisor, "Acompanhamento do orientador")).toHaveCount(0);

  // Advisor: decides the report and records the follow-up; approving without an opinion works
  const telaOrientador = await telaDe(orientador);
  await telaOrientador.goto(acompanhamento);
  await expect(titulo(telaOrientador, "Acompanhamento do orientador")).toBeVisible();
  await expect(titulo(telaOrientador, "Registrar dia")).toHaveCount(0);
  await expect(titulo(telaOrientador, "Homologar período")).toHaveCount(0);
  await expect(telaOrientador.getByTestId("relatorios").getByText("Enviar relatório")).toHaveCount(0);
  await botao(telaOrientador, "Aprovar").click();
  await telaOrientador.getByRole("dialog").getByRole("button", { name: "Aprovar", exact: true }).click();
  await expect(telaOrientador.getByTestId("relatorios")).toContainText("Aprovado");
  await expect(botao(telaOrientador, "Aprovar")).toHaveCount(0);

  // Coordination: reads reports and ends the internship; does not act for the others
  const telaCoordenacao = await telaDe(coordenacao);
  await telaCoordenacao.goto(acompanhamento);
  await expect(telaCoordenacao.getByTestId("relatorios")).toContainText("Aprovado");
  await expect(titulo(telaCoordenacao, "Registrar dia")).toHaveCount(0);
  await expect(titulo(telaCoordenacao, "Homologar período")).toHaveCount(0);
  await expect(titulo(telaCoordenacao, "Acompanhamento do orientador")).toHaveCount(0);
  await telaCoordenacao.goto(ocorrencias);
  await expect(titulo(telaCoordenacao, "Concluir estágio")).toBeVisible();
  await expect(titulo(telaCoordenacao, "Rescindir estágio")).toBeVisible();
});
