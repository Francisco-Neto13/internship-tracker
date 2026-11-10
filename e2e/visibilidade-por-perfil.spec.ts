import { readFile } from "node:fs/promises";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { dados, SENHA, sessoes, telaDe } from "./support/api";
import { criarEstagioAtivoDesdeAgosto } from "./support/estagio";

// Each profile sees only what it can use, in the menu and by address (RF003), and whatever the
// system generates reaches people as a document, never as the JSON of the API.

const sessao = sessoes(60);

const TELAS: Record<string, string> = {
  Painel: "/dashboard",
  Notificações: "/notificacoes",
  Estágios: "/estagios",
  Frequência: "/frequencia",
  Relatórios: "/relatorios",
  Atividades: "/atividades-complementares",
  Integralização: "/integralizacao",
  Estudantes: "/administracao/estudantes",
  Cursos: "/administracao/cursos",
  Concedentes: "/administracao/concedentes",
  Convênios: "/administracao/convenios",
  "Visão da administração": "/administracao",
  "Usuários e acesso": "/administracao/usuarios",
  "Relatórios gerenciais": "/administracao/relatorios-gerenciais",
  Parâmetros: "/administracao/parametros",
  "Guarda documental": "/administracao/guarda-documental",
  Auditoria: "/administracao/auditoria",
};
const NOVO_ESTAGIO = "/estagios/novo";

const MATRIZ: { perfil: string; email: string; menu: string[]; porLink?: string[] }[] = [
  { perfil: "Estudante", email: "ana.estudante@internship.local", menu: ["Painel", "Notificações", "Estágios", "Frequência", "Relatórios", "Atividades", "Integralização"] },
  { perfil: "Orientador", email: "orientador@internship.local", menu: ["Painel", "Notificações", "Estágios", "Frequência", "Relatórios"] },
  { perfil: "Supervisor", email: "supervisor@exemplo-software.local", menu: ["Painel", "Notificações", "Estágios", "Frequência"] },
  { perfil: "Concedente", email: "rh@exemplo-software.local", menu: ["Painel", "Notificações", "Estágios"] },
  {
    perfil: "Coordenação",
    email: "coordenacao.software@internship.local",
    menu: ["Painel", "Notificações", "Estágios", "Frequência", "Relatórios", "Atividades", "Estudantes", "Cursos", "Concedentes", "Convênios", "Visão da administração", "Relatórios gerenciais"],
    porLink: [NOVO_ESTAGIO],
  },
  {
    perfil: "Administrador",
    email: "admin@internship.local",
    menu: ["Painel", "Notificações", "Estudantes", "Cursos", "Concedentes", "Convênios", "Visão da administração", "Usuários e acesso", "Relatórios gerenciais", "Parâmetros", "Guarda documental", "Auditoria"],
    porLink: ["/estagios"],
  },
];

const entrar = async (browser: Browser, email: string) => telaDe(await sessao(browser, email, SENHA));
const semAcesso = (tela: Page) => expect(tela.getByRole("heading", { name: "Sem acesso", level: 1 })).toBeVisible();

/** Clicks a download button and returns the name and the first bytes of the file received. */
async function baixar(tela: Page, rotulo: string) {
  const [arquivo] = await Promise.all([tela.waitForEvent("download"), tela.getByRole("button", { name: rotulo, exact: true }).click()]);
  return { nome: arquivo.suggestedFilename(), conteudo: await readFile(await arquivo.path()) };
}

for (const { perfil, email, menu, porLink = [] } of MATRIZ) {
  test(`${perfil} sees only its screens, in the menu and by address`, async ({ browser }) => {
    test.setTimeout(120_000);
    const tela = await entrar(browser, email);

    await tela.goto("/sem-acesso");
    await semAcesso(tela);
    expect(await tela.locator("li a span.truncate").allTextContents()).toEqual(menu);

    const abertas = new Set([...menu.map((rotulo) => TELAS[rotulo]), ...porLink]);
    for (const caminho of [...Object.values(TELAS), NOVO_ESTAGIO]) {
      await tela.goto(caminho);
      if (abertas.has(caminho)) {
        await expect(tela.getByRole("heading", { level: 1 }).first(), caminho).toBeVisible();
        expect(new URL(tela.url()).pathname, caminho).toBe(caminho);
        await expect(tela.getByText("Não foi possível carregar esta página"), caminho).toHaveCount(0);
      } else {
        await expect(tela, caminho).toHaveURL(/\/sem-acesso$/);
        await semAcesso(tela);
      }
    }
  });
}

test("an internship shows each person only the tabs and documents that are theirs", async ({ browser }) => {
  test.setTimeout(120_000);
  const { id, estudanteId, aluno, orientador, supervisor, coordenacao, concedenteRh, admin } = await criarEstagioAtivoDesdeAgosto(browser, sessao, "visivel");
  const [primeiro] = await dados<{ id: string }[]>(await aluno.get(`/api/v1/estagios/${id}/relatorios`));
  await dados(await aluno.post(`/api/v1/relatorios/${primeiro.id}/versoes`, { data: { conteudo: "Desenvolvi a tela de login\nDocumentei a API" } }), 201);
  const acompanhamento = `/estagios/${id}?aba=acompanhamento`;
  const leitura = `/estagios/${id}/relatorios/${primeiro.id}`;
  const secoes = (tela: Page) => tela.getByRole("navigation", { name: "Seções" }).getByRole("link");

  // Student, advisor and coordination read the report on screen and receive it as a PDF
  for (const pessoa of [aluno, orientador, coordenacao]) {
    const tela = await telaDe(pessoa);
    await tela.goto(acompanhamento);
    await tela.getByRole("link", { name: "Ler relatório" }).first().click();
    await expect(tela).toHaveURL(new RegExp(`/relatorios/${primeiro.id}$`));
    await expect(tela.getByTestId("relatorio-versoes")).toContainText("Desenvolvi a tela de login");
    await expect(tela.locator("main")).not.toContainText('"data"');
    const { nome, conteudo } = await baixar(tela, "Baixar PDF");
    expect(nome).toMatch(/\.pdf$/);
    expect(conteudo.subarray(0, 5).toString()).toBe("%PDF-");
    await tela.close();
  }

  // Only the advisor gets the decision beside the text
  const telaOrientador = await telaDe(orientador);
  await telaOrientador.goto(leitura);
  await expect(telaOrientador.getByRole("button", { name: "Aprovar", exact: true })).toBeVisible();
  const telaAluno = await telaDe(aluno);
  await telaAluno.goto(leitura);
  await expect(telaAluno.getByTestId("relatorio-versoes")).toBeVisible();
  await expect(telaAluno.getByRole("button", { name: "Aprovar", exact: true })).toHaveCount(0);

  // Supervisor, concedente and administrator do not read reports (DER §4.5), by address either
  for (const pessoa of [supervisor, concedenteRh, admin]) {
    const tela = await telaDe(pessoa);
    await tela.goto(leitura);
    await semAcesso(tela);
    await tela.close();
  }

  // The administrator reads the internship, without tabs that would only say it is out of reach
  const telaAdmin = await telaDe(admin);
  await telaAdmin.goto(`/estagios/${id}`);
  await expect(secoes(telaAdmin)).toHaveText(["Resumo", "Formalização"]);
  await telaAdmin.goto(`/estagios/${id}?aba=acompanhamento`);
  await expect(telaAdmin.getByText("Acompanhamento fora do seu alcance")).toHaveCount(0);
  await telaAdmin.goto(`/administracao/estudantes/${estudanteId}`);
  await expect(secoes(telaAdmin)).toHaveText(["Visão geral", /^Estágios/, "Dados acadêmicos"]);

  // A person outside the internship gets a screen, not a failure
  const estranha = await entrar(browser, "bruno.estudante@internship.local");
  await estranha.goto(`/estagios/${id}`);
  await expect(estranha.getByText("Não encontrado ou fora do seu alcance")).toBeVisible();
});

test("documents download as files, and a refusal stays on the screen", async ({ browser }) => {
  const coordenacao = await entrar(browser, "coordenacao.software@internship.local");

  await coordenacao.goto("/administracao/relatorios-gerenciais");
  const pdf = await baixar(coordenacao, "Exportar PDF");
  expect(pdf.conteudo.subarray(0, 5).toString()).toBe("%PDF-");
  const csv = await baixar(coordenacao, "Exportar CSV");
  expect(csv.nome).toMatch(/\.csv$/);
  expect(csv.conteudo.toString()).toContain("Curso");

  // An invalid period is ignored by the table, so the export answers too
  await coordenacao.goto("/administracao/relatorios-gerenciais?de=2026-12-31&ate=2026-01-01");
  await expect(coordenacao.getByRole("alert").filter({ hasText: "Filtros inválidos" })).toBeVisible();
  expect((await baixar(coordenacao, "Exportar PDF")).conteudo.subarray(0, 5).toString()).toBe("%PDF-");

  // A refusal of the API becomes a message; the JSON never reaches the person
  await coordenacao.route("**/exportacao**", (rota) => rota.fulfill({ status: 401, json: { error: { code: "NAO_AUTENTICADO", message: "Sessão ausente ou expirada." } } }));
  await coordenacao.goto("/administracao/relatorios-gerenciais");
  await coordenacao.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  await expect(coordenacao.getByRole("alert").filter({ hasText: "Sessão ausente ou expirada." })).toBeVisible();
  expect(new URL(coordenacao.url()).pathname).toBe("/administracao/relatorios-gerenciais");
  await expect(coordenacao.locator("body")).not.toContainText("NAO_AUTENTICADO");
});

test("whoever receives a declaration checks it on a page, without login", async ({ page }) => {
  await page.goto("/verificar/AAAA-AAAA-AAAA-AAAA");
  await expect(page.getByRole("heading", { name: "Verificar declaração", level: 1 })).toBeVisible();
  await expect(page.getByText("Nenhuma declaração com este código")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("DECLARACAO_NAO_ENCONTRADA");
});
