import { createHash, randomUUID } from "node:crypto";
import { getArmazenamento } from "../../src/shared/documentos/armazenamento";

// End-to-end check of the S3 adapter against the configured bucket (D8, RNF-06): a signed
// PUT with the declared headers works, a PUT with another Content-Type is refused by the
// signature, and copy, size, read, signed GET and removal behave as the upload flow needs.
// `npm run storage:check` after `npm run storage:init`; used by the e2e CI job too.

async function main() {
  const armazenamento = getArmazenamento();
  const corpo = new TextEncoder().encode(`%PDF-1.7\nverificacao ${randomUUID()}\n%%EOF`);
  const pendente = `pendentes/verificacao-${randomUUID()}.pdf`;
  const final = `documentos/verificacao-${randomUUID()}.pdf`;
  const falhas: string[] = [];

  const url = await armazenamento.urlEnvio(pendente, "application/pdf", corpo.length, 60);
  const outroTipo = await fetch(url, { method: "PUT", body: corpo, headers: { "Content-Type": "text/html" } });
  if (outroTipo.ok) falhas.push("PUT com Content-Type diferente do assinado foi aceito");

  const envio = await fetch(url, { method: "PUT", body: corpo, headers: { "Content-Type": "application/pdf" } });
  if (!envio.ok) falhas.push(`PUT assinado recusado: ${envio.status} ${await envio.text()}`);

  if ((await armazenamento.tamanho(pendente)) !== corpo.length) falhas.push("tamanho do objeto enviado não confere");
  await armazenamento.copiar(pendente, final);
  await armazenamento.remover(pendente);
  if ((await armazenamento.tamanho(pendente)) !== null) falhas.push("objeto pendente não foi removido");

  const lido = await armazenamento.ler(final);
  const hash = (dados: Uint8Array) => createHash("sha256").update(dados).digest("hex");
  if (hash(lido) !== hash(corpo)) falhas.push("conteúdo lido difere do enviado");

  const leitura = await fetch(await armazenamento.urlLeitura(final, "verificação.pdf", 60));
  if (!leitura.ok) falhas.push(`GET assinado recusado: ${leitura.status}`);
  await armazenamento.remover(final);

  if (falhas.length > 0) {
    console.error(`Armazenamento com problema:\n- ${falhas.join("\n- ")}`);
    process.exitCode = 1;
    return;
  }
  console.log("Armazenamento ok: PUT assinado, recusa de tipo trocado, cópia, leitura e remoção");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
