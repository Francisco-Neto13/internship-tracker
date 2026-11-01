// RF022: a generated PDF, private and never cached
export function pdfResponse(conteudo: Uint8Array, nomeArquivo: string): Response {
  return new Response(Buffer.from(conteudo), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
