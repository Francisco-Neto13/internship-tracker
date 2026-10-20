// Stand-in for https://api.pwnedpasswords.com/range/{prefix} during e2e runs (RF002), so
// the pipeline does not depend on a third-party service. It answers like the real API with
// padding entries only, except for STUB_BREACHED_PASSWORD, reported as breached.
// The live service is checked separately by scripts/check-hibp-live.mjs (non-blocking).
import { createHash } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.HIBP_STUB_PORT ?? 3999);
const VAZADA = createHash("sha1").update("senha vazada no stub do e2e").digest("hex").toUpperCase();

createServer((request, response) => {
  const match = /^\/range\/([0-9A-Fa-f]{5})$/.exec(request.url ?? "");
  if (request.url === "/health") return response.end("ok");
  if (!match) {
    response.statusCode = 404;
    return response.end();
  }
  const prefixo = match[1].toUpperCase();
  const linhas = Array.from({ length: 800 }, (_, i) => `${i.toString(16).toUpperCase().padStart(35, "0")}:0`);
  if (VAZADA.startsWith(prefixo)) linhas.push(`${VAZADA.slice(5)}:42`);
  response.setHeader("content-type", "text/plain");
  response.end(linhas.join("\r\n"));
}).listen(PORT, "127.0.0.1", () => console.log(`hibp stub on http://127.0.0.1:${PORT}`));
