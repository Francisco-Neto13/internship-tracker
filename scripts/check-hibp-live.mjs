// Live check of the Have I Been Pwned range API (RF002). The test pipeline uses a local
// stub (e2e/support/hibp-stub.mjs); this script confirms the real service still answers in
// the format src/lib/senhas-vazadas.ts parses. Non-blocking: an outage there must not fail
// the build, it only means password changes are refused until the service returns.
import { createHash } from "node:crypto";

const URL_RANGE = process.env.HIBP_RANGE_URL ?? "https://api.pwnedpasswords.com/range/";
const hash = createHash("sha1").update("password").digest("hex").toUpperCase();

try {
  const resposta = await fetch(`${URL_RANGE}${hash.slice(0, 5)}`, {
    headers: { "Add-Padding": "true", "User-Agent": "Internship Tracker CI" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!resposta.ok) throw new Error(`status ${resposta.status}`);
  const linha = (await resposta.text()).split(/\r?\n/).find((l) => l.startsWith(`${hash.slice(5)}:`));
  const contagem = Number(linha?.split(":")[1]);
  if (!(contagem > 0)) throw new Error("formato inesperado: a senha de referência não apareceu como vazada");
  console.log(`HIBP ok: a senha de referência aparece ${contagem} vezes`);
} catch (error) {
  console.warn(`HIBP indisponível ou mudou de formato: ${error.message}`);
  process.exitCode = process.env.HIBP_LIVE_STRICT === "1" ? 1 : 0;
}
