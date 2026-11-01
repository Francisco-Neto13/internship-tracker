import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sha256Hex, tipoPeloConteudo } from "./conteudo";
import { assinarPedido, verificarPedido, type PedidoUpload } from "./token-upload";

describe("file type by content (D8, OWASP File Upload)", () => {
  it("recognizes PDF, PNG and JPEG by their first bytes", () => {
    expect(tipoPeloConteudo(new TextEncoder().encode("%PDF-1.7\n..."))).toBe("application/pdf");
    expect(tipoPeloConteudo(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("image/png");
    expect(tipoPeloConteudo(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
  });

  it("does not trust an extension or header: an HTML file is no PDF", () => {
    expect(tipoPeloConteudo(new TextEncoder().encode("<html><script>alert(1)</script>"))).toBeNull();
  });

  it("hashes with SHA-256 in lowercase hex", () => {
    expect(sha256Hex(new TextEncoder().encode("abc"))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("upload token (D8)", () => {
  const segredoAnterior = process.env.BETTER_AUTH_SECRET;
  const pedido: PedidoUpload = {
    usuarioId: "u1",
    chavePendente: "pendentes/x.pdf",
    tipo: "CONVENIO",
    tipoMime: "application/pdf",
    tamanhoBytes: 10,
    sha256: "a".repeat(64),
    nomeOriginal: "convenio.pdf",
    concedenteId: "c1",
    estagioId: null,
    estudanteId: null,
    sensivel: false,
    expiraEm: Date.now() + 60_000,
  };

  beforeEach(() => {
    process.env.BETTER_AUTH_SECRET = "segredo-de-teste-com-tamanho-suficiente-0123";
  });
  afterEach(() => {
    process.env.BETTER_AUTH_SECRET = segredoAnterior;
  });

  it("round-trips for the same user before expiry", () => {
    expect(verificarPedido(assinarPedido(pedido), "u1")).toEqual(pedido);
  });

  it("refuses another user, an expired request and any tampered field", () => {
    const token = assinarPedido(pedido);
    expect(verificarPedido(token, "u2")).toBeNull();
    expect(verificarPedido(token, "u1", pedido.expiraEm + 1)).toBeNull();

    const [corpo, assinatura] = token.split(".");
    const alterado = Buffer.from(JSON.stringify({ ...pedido, tamanhoBytes: 10_000_000 })).toString("base64url");
    expect(verificarPedido(`${alterado}.${assinatura}`, "u1")).toBeNull();
    expect(verificarPedido(`${corpo}.x${assinatura.slice(1)}`, "u1")).toBeNull();
  });
});
