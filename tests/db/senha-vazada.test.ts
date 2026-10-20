import { createHash, randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { getAuth } from "@/lib/auth";
import { resolveSession } from "@/lib/session";
import { trocarSenha } from "@/modules/acesso/services/senha-service";
import { createUsuario as criarUsuario } from "@/modules/acesso/services/usuario-service";
import { createAccessScenario, identityOf, signIn } from "./fixtures";

// RF002, NIST SP 800-63B-4 3.1.1.2. Have I Been Pwned is stubbed: the tests check what
// leaves the server and how each answer is handled, without depending on the network.

const VAZADA = "senha vazada em algum lugar 2019";
const LIMPA = "uma frase que ninguem usou antes";

function sha1(texto: string) {
  return createHash("sha1").update(texto).digest("hex").toUpperCase();
}

/** A range response as the API sends it: suffix:count lines, padding entries with count 0. */
function respostaRange(prefixo: string) {
  const vazada = sha1(VAZADA);
  const linhas = ["0018A45C4D1DEF81644B54AB7F969B88D65:0", "00D4F6E8FA6EECAD2A3AA415EEC418D38EC:2"];
  if (vazada.startsWith(prefixo)) linhas.push(`${vazada.slice(5)}:3861493`);
  return new Response(linhas.join("\r\n"), { status: 200, headers: { "content-type": "text/plain" } });
}

async function primeiroAcesso(administradorId: string) {
  const email = `vazada-${randomUUID().slice(0, 8)}@teste.local`;
  const { senhaProvisoria } = await criarUsuario(identityOf(administradorId), {
    nome: "Pessoa Teste Senha",
    email,
    perfis: [{ perfil: "ESTUDANTE", cursoId: null }],
  });
  const cookie = await signIn(email, senhaProvisoria);
  const resolved = (await resolveSession(cookie))!;
  return { email, senhaProvisoria, cookie, resolved };
}

describe("breached password check on password change (RF002)", () => {
  let administradorId: string;
  const chamadas: { url: string; headers: Headers }[] = [];
  let falhar = false;

  beforeAll(async () => {
    administradorId = (await createAccessScenario()).administrador.id;
    process.env.SENHAS_VAZADAS_VERIFICACAO = "ativa";
    vi.stubGlobal("fetch", async (entrada: RequestInfo | URL, init?: RequestInit) => {
      const url = String(entrada instanceof Request ? entrada.url : entrada);
      chamadas.push({ url, headers: new Headers(init?.headers) });
      if (falhar) throw new TypeError("fetch failed");
      return respostaRange(url.slice(-5));
    });
  });

  afterEach(() => {
    chamadas.length = 0;
    falhar = false;
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    process.env.SENHAS_VAZADAS_VERIFICACAO = "desligada";
  });

  it("refuses a breached password and keeps the temporary one", async () => {
    const { email, senhaProvisoria, cookie, resolved } = await primeiroAcesso(administradorId);

    await expect(
      trocarSenha(resolved.identity, resolved.user, cookie, { senhaAtual: senhaProvisoria, novaSenha: VAZADA }),
    ).rejects.toMatchObject({ code: "SENHA_VAZADA", kind: "UNPROCESSABLE" });

    expect((await resolveSession(await signIn(email, senhaProvisoria)))?.user.trocaSenhaObrigatoria).toBe(true);
  });

  it("sends only the first five characters of the SHA-1, with padding", async () => {
    const { senhaProvisoria, cookie, resolved } = await primeiroAcesso(administradorId);

    await trocarSenha(resolved.identity, resolved.user, cookie, { senhaAtual: senhaProvisoria, novaSenha: LIMPA });

    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].url).toBe(`https://api.pwnedpasswords.com/range/${sha1(LIMPA).slice(0, 5)}`);
    expect(chamadas[0].url).not.toContain(sha1(LIMPA).slice(5));
    expect(chamadas[0].headers.get("add-padding")).toBe("true");
  });

  it("fails closed when the service cannot be reached", async () => {
    const { senhaProvisoria, cookie, resolved } = await primeiroAcesso(administradorId);
    falhar = true;

    await expect(
      trocarSenha(resolved.identity, resolved.user, cookie, { senhaAtual: senhaProvisoria, novaSenha: LIMPA }),
    ).rejects.toMatchObject({ code: "VERIFICACAO_SENHA_INDISPONIVEL", kind: "UNAVAILABLE" });
  });

  it("rejects context-specific words before any lookup", async () => {
    const { email, senhaProvisoria, cookie, resolved } = await primeiroAcesso(administradorId);

    await expect(
      trocarSenha(resolved.identity, resolved.user, cookie, { senhaAtual: senhaProvisoria, novaSenha: `${email}2026` }),
    ).rejects.toMatchObject({ code: "SENHA_PREVISIVEL" });
    expect(chamadas).toEqual([]);
  });

  it("does not check the generated temporary password against the service", async () => {
    await criarUsuario(identityOf(administradorId), {
      nome: "Sem Consulta",
      email: `semconsulta-${randomUUID().slice(0, 8)}@teste.local`,
      perfis: [{ perfil: "ESTUDANTE", cursoId: null }],
    });
    expect(chamadas).toEqual([]);
  });
});

describe("account routes closed over HTTP (RF001, RF002)", () => {
  it.each(["/update-user", "/change-password", "/change-email", "/verify-password", "/request-password-reset"])(
    "answers 404 to POST /api/auth%s",
    async (rota) => {
      const resposta = await getAuth().handler(
        new Request(`http://localhost:3000/api/auth${rota}`, {
          method: "POST",
          headers: { "content-type": "application/json", origin: "http://localhost:3000" },
          body: JSON.stringify({ name: "Outro Nome", newPassword: LIMPA, currentPassword: LIMPA }),
        }),
      );
      expect(resposta.status).toBe(404);
    },
  );
});
