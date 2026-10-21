import { expect, type APIRequestContext, type APIResponse, type Browser } from "@playwright/test";

// Shared by the API specs: each person acts with their own session, as in real life. Every
// spec draws client addresses from its own range, so the sign-in rate limit of one spec never
// blocks another running in parallel.

export const SENHA = "senha-dev-internship";
const BASE = "http://localhost:3000";

/** Session factory for a spec; `faixa` is the first address of its range in 203.0.113.0/24. */
export function sessoes(faixa: number) {
  let proximo = faixa;
  return async function sessao(browser: Browser, email: string, senha: string): Promise<APIRequestContext> {
    const contexto = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": `203.0.113.${proximo++}` } });
    const resposta = await contexto.request.post("/api/auth/sign-in/email", { data: { email, password: senha }, headers: { origin: BASE } });
    expect(resposta.ok(), `login de ${email}`).toBe(true);
    return contexto.request;
  };
}

export async function dados<T>(resposta: APIResponse, status = 200): Promise<T> {
  expect(resposta.status(), await resposta.text()).toBe(status);
  return ((await resposta.json()) as { data: T }).data;
}

export async function erro(resposta: APIResponse, status: number): Promise<{ code: string; details?: { code: string }[] }> {
  expect(resposta.status(), await resposta.text()).toBe(status);
  return ((await resposta.json()) as { error: { code: string; details?: { code: string }[] } }).error;
}
