import { isIP } from "node:net";
import { opcoesEnderecoIp } from "./auth-options";

/**
 * Client address recorded as complementary evidence of a signature (RF019). It comes from the
 * same trusted source as the sign-in rate limit (AUTH_IP_HEADERS, or the headers Vercel
 * overwrites), first address of the chain; null when there is no trustworthy value. It is
 * evidence, never an authorization input.
 */
export function enderecoIpDaRequisicao(headers: Headers): string | null {
  let cabecalhos: string[];
  try {
    cabecalhos = opcoesEnderecoIp(process.env).ipAddressHeaders ?? ["x-forwarded-for"];
  } catch {
    return null;
  }
  for (const nome of cabecalhos) {
    const primeiro = headers.get(nome)?.split(",")[0]?.trim();
    if (primeiro && isIP(primeiro)) return primeiro;
  }
  return null;
}
