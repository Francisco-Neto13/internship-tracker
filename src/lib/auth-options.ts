import { isIP } from "node:net";

// Environment-driven options of src/lib/auth.ts, kept pure so they can be unit tested.

type Env = Record<string, string | undefined>;

function lista(valor: string | undefined): string[] {
  return (valor ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cidrValido(entrada: string): boolean {
  const [endereco, prefixo, ...resto] = entrada.split("/");
  const versao = isIP(endereco);
  if (versao === 0 || resto.length > 0) return false;
  if (prefixo === undefined) return true;
  const bits = Number(prefixo);
  return Number.isInteger(bits) && bits >= 0 && bits <= (versao === 4 ? 32 : 128) && String(bits) === prefixo;
}

/**
 * Where the client address comes from, for the sign-in rate limit (RF002). A forwarded
 * header is only trustworthy when a proxy the client cannot bypass overwrites it.
 *
 * - AUTH_IP_HEADERS: headers set by your proxy, in order (e.g. "x-real-ip").
 * - AUTH_TRUSTED_PROXIES: addresses or CIDR ranges of your proxies; the forwarded chain is
 *   read right to left, skipping them.
 * - On Vercel (VERCEL=1) nothing is needed: the platform overwrites x-forwarded-for and
 *   x-vercel-forwarded-for to prevent spoofing.
 * - Self-hosted production without either variable refuses to start: Better Auth would
 *   otherwise trust a client-supplied header or share one bucket among all users.
 */
export function opcoesEnderecoIp(env: Env): { ipAddressHeaders?: string[]; trustedProxies?: string[] } {
  const headers = lista(env.AUTH_IP_HEADERS).map((header) => header.toLowerCase());
  const proxies = lista(env.AUTH_TRUSTED_PROXIES);

  const invalidos = proxies.filter((proxy) => !cidrValido(proxy));
  if (invalidos.length > 0) {
    throw new Error(`AUTH_TRUSTED_PROXIES tem entradas inválidas: ${invalidos.join(", ")}`);
  }

  if (headers.length > 0 || proxies.length > 0) {
    return {
      ...(headers.length > 0 ? { ipAddressHeaders: headers } : {}),
      ...(proxies.length > 0 ? { trustedProxies: proxies } : {}),
    };
  }
  if (env.VERCEL === "1") return { ipAddressHeaders: ["x-vercel-forwarded-for", "x-forwarded-for"] };
  if (env.NODE_ENV !== "production") return {};

  throw new Error(
    "Defina AUTH_IP_HEADERS (e, atrás de proxy, AUTH_TRUSTED_PROXIES): sem isso o limite de tentativas de login " +
      "confiaria num cabeçalho que o cliente pode falsificar. Na Vercel não é preciso.",
  );
}

/**
 * RF002, NIST SP 800-63B-4 3.1.1.2: new passwords are checked against Have I Been Pwned.
 * SENHAS_VAZADAS_VERIFICACAO=desligada skips it outside production only (tests, offline
 * development); production always checks.
 */
export function verificacaoSenhaVazadaAtiva(env: Env): boolean {
  const valor = env.SENHAS_VAZADAS_VERIFICACAO ?? "ativa";
  if (valor !== "ativa" && valor !== "desligada") {
    throw new Error(`SENHAS_VAZADAS_VERIFICACAO deve ser "ativa" ou "desligada", recebido "${valor}"`);
  }
  if (valor === "desligada" && env.NODE_ENV === "production") {
    throw new Error("SENHAS_VAZADAS_VERIFICACAO=desligada não é aceito em produção");
  }
  return valor === "ativa";
}

const URL_RANGE_PADRAO = "https://api.pwnedpasswords.com/range/";

/**
 * Range endpoint of the breached-password check. HIBP_RANGE_URL replaces it for the e2e
 * stub; in production only HTTPS or a loopback address is accepted, so a typo cannot send
 * hash prefixes over plain HTTP to another host.
 */
export function urlRangeSenhasVazadas(env: Env): string {
  const valor = env.HIBP_RANGE_URL?.trim();
  if (!valor) return URL_RANGE_PADRAO;

  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    throw new Error(`HIBP_RANGE_URL inválida: ${valor}`);
  }
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (env.NODE_ENV === "production" && url.protocol !== "https:" && !loopback) {
    throw new Error("HIBP_RANGE_URL precisa ser HTTPS em produção (ou loopback, para o stub do e2e)");
  }
  return valor.endsWith("/") ? valor : `${valor}/`;
}
