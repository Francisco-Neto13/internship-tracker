import { createHash } from "node:crypto";

// D8 (DER-LOGICO §9.2): the type of a stored file is decided by its first bytes, never by
// the Content-Type the client declared (OWASP File Upload Cheat Sheet: the header "can be
// spoofed"). Only the three accepted formats are recognized.

const ASSINATURAS: { mime: string; bytes: number[] }[] = [
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
];

export function tipoPeloConteudo(conteudo: Uint8Array): string | null {
  const encontrado = ASSINATURAS.find(({ bytes }) => bytes.every((byte, indice) => conteudo[indice] === byte));
  return encontrado?.mime ?? null;
}

export function sha256Hex(conteudo: Uint8Array): string {
  return createHash("sha256").update(conteudo).digest("hex");
}

/** Object key decided by the server, never derived from the client's file name (OWASP). */
export function extensaoDoTipo(mime: string): string {
  return { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg" }[mime] ?? "bin";
}
