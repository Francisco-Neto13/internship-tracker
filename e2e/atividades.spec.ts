import { createHash, randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { dados, erro, SENHA, sessoes, telaDe } from "./support/api";

// Fase 4 end to end through the HTTP API: a new student uploads a proof straight to the
// bucket (D8), registers a complementary activity, the coordination approves it within the
// category limit, and the integralization shows the hours counted. A new student is created
// on every run, so a previous run never blocks this one.

const sessao = sessoes(130);

/** D8: signed PUT straight to the bucket, then the server checks the object. */
async function enviarComprovante(api: APIRequestContext, estudanteId: string, conteudo: string) {
  const pdf = Buffer.from(`%PDF-1.7\n${conteudo}\n%%EOF`);
  const upload = await dados<{ upload_id: string; url: string; cabecalhos: Record<string, string> }>(
    await api.post("/api/v1/documentos/upload", {
      data: {
        tipo: "COMPROVANTE_ATIVIDADE",
        tipo_mime: "application/pdf",
        tamanho_bytes: pdf.length,
        sha256: createHash("sha256").update(pdf).digest("hex"),
        nome_original: "certificado.pdf",
        estudante_id: estudanteId,
      },
    }),
    201,
  );
  const envio = await api.put(upload.url, { data: pdf, headers: { "Content-Type": upload.cabecalhos["Content-Type"] } });
  expect(envio.ok(), "PUT direto ao bucket").toBe(true);
  return dados<{ id: string }>(await api.post("/api/v1/documentos/upload/confirmacao", { data: { upload_id: upload.upload_id } }), 201);
}

test("a complementary activity is registered, approved and counted (Fase 4)", async ({ browser }) => {
  const admin = await sessao(browser, "admin@internship.local", SENHA);
  const curso = (await dados<{ id: string; codigo: string }[]>(await admin.get("/api/v1/cursos"))).find((item) => item.codigo === "ENG-SOFT")!;
  const email = `atividades-${randomUUID().slice(0, 8)}@internship.local`;
  const novo = await dados<{ id: string; senha_provisoria: string }>(
    await admin.post("/api/v1/usuarios", { data: { nome: "Estudante de Atividades E2E", email, perfis: [{ perfil: "ESTUDANTE" }] } }),
    201,
  );
  const estudante = await dados<{ id: string }>(
    await admin.post("/api/v1/estudantes", { data: { usuario_id: novo.id, curso_id: curso.id, matricula: `ATV${randomUUID().slice(0, 8)}`, periodo: 4 } }),
    201,
  );
  const aluno = await sessao(browser, email, novo.senha_provisoria);
  await dados(await aluno.post("/api/v1/auth/senha", { data: { senha_atual: novo.senha_provisoria, nova_senha: "frase segura das atividades e2e" } }));

  // RF057: before any activity, the progress is calculated on the spot
  const antes = await dados<{ apurado_em: string | null; atividades_complementares: { exigido: number; por_categoria: { categoria_id: string; categoria: string; limite: number }[] } }>(
    await aluno.get("/api/v1/integralizacao"),
  );
  expect(antes.apurado_em).toBeNull();
  const cursosLivres = antes.atividades_complementares.por_categoria.find((categoria) => categoria.categoria === "Cursos livres")!;
  expect(cursosLivres.limite).toBe(40);

  // RF049, RF050: registration with proof; RF052: the same file again is refused
  const marca = randomUUID();
  const comprovante = await enviarComprovante(aluno, estudante.id, `certificado ${marca}`);
  const atividade = {
    categoria_id: cursosLivres.categoria_id,
    descricao: `Curso livre de acessibilidade ${marca.slice(0, 6)}`,
    instituicao_promotora: "Escola Virtual",
    data_inicio: "2026-06-01",
    data_fim: "2026-06-30",
    horas_declaradas: 50,
  };
  const criada = await dados<{ id: string; situacao: string }>(await aluno.post("/api/v1/atividades-complementares", { data: { ...atividade, documento_ids: [comprovante.id] } }), 201);
  expect(criada.situacao).toBe("EM_ANALISE");
  const repetido = await enviarComprovante(aluno, estudante.id, `certificado ${marca}`);
  expect(
    (await erro(await aluno.post("/api/v1/atividades-complementares", { data: { ...atividade, descricao: "outra", documento_ids: [repetido.id] } }), 409)).code,
  ).toBe("COMPROVANTE_DUPLICADO");

  // RF053, RF051: the coordination's queue previews the excess; the approval counts 40 of 50 h
  const coordenacao = await sessao(browser, "coordenacao.software@internship.local", SENHA);
  const fila = await dados<{ id: string; previa_aproveitamento: { horas_aproveitaveis: number; horas_excedentes: number } }[]>(
    await coordenacao.get("/api/v1/atividades-complementares/pendentes"),
  );
  expect(fila.find((item) => item.id === criada.id)?.previa_aproveitamento).toMatchObject({ horas_aproveitaveis: 40, horas_excedentes: 10 });
  expect((await erro(await aluno.post(`/api/v1/atividades-complementares/${criada.id}/aprovacao`), 403)).code).toBe("ANALISE_RESTRITA_A_COORDENACAO");
  // The queue holds what the caller decides: the student reads the activity, with no queue and no buttons to decide it
  expect(await dados<unknown[]>(await aluno.get("/api/v1/atividades-complementares/pendentes"))).toEqual([]);
  const telaAluno = await telaDe(aluno);
  await telaAluno.goto("/atividades-complementares");
  await expect(telaAluno.getByText(atividade.descricao).first()).toBeVisible();
  await expect(telaAluno.getByTestId("fila-analise")).toHaveCount(0);
  await expect(telaAluno.getByRole("button", { name: "Recusar" })).toHaveCount(0);
  const aprovada = await dados<{ situacao: string; horas_aproveitadas: number; analise: { horas_excedentes: number; motivo_excedente: string } }>(
    await coordenacao.post(`/api/v1/atividades-complementares/${criada.id}/aprovacao`),
    201,
  );
  expect(aprovada).toMatchObject({ situacao: "APROVADA", horas_aproveitadas: 40, analise: { horas_excedentes: 10 } });
  expect(aprovada.analise.motivo_excedente).toContain("Cursos livres");

  // RF056, RF057: the approval stored an assessment; the student and the coordination read it
  const depois = await dados<{ gatilho: string; atividades_complementares: { aproveitado: number; pendente: number } }>(await aluno.get("/api/v1/integralizacao"));
  expect(depois).toMatchObject({ gatilho: "ATIVIDADE_APROVADA", atividades_complementares: { aproveitado: 40, pendente: 160 } });
  await dados(await coordenacao.get(`/api/v1/estudantes/${estudante.id}/integralizacao`));
  const supervisor = await sessao(browser, "supervisor@exemplo-software.local", SENHA);
  expect((await erro(await supervisor.get(`/api/v1/estudantes/${estudante.id}/integralizacao`), 404)).code).toBe("ESTUDANTE_NAO_ENCONTRADO");
});
