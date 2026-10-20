import type { Armazenamento } from "./armazenamento";

// In-memory stand-in for the bucket, used by database tests. `enviar` plays the part of the
// browser's PUT to the signed URL.

export function armazenamentoMemoria() {
  const objetos = new Map<string, Uint8Array>();
  const armazenamento: Armazenamento & { enviar(chave: string, conteudo: Uint8Array): void; objetos: Map<string, Uint8Array> } = {
    objetos,
    enviar(chave, conteudo) {
      objetos.set(chave, conteudo);
    },
    urlEnvio: async (chave) => `memoria://envio/${chave}`,
    urlLeitura: async (chave) => `memoria://leitura/${chave}`,
    tamanho: async (chave) => objetos.get(chave)?.length ?? null,
    async ler(chave) {
      const conteudo = objetos.get(chave);
      if (!conteudo) throw new Error(`objeto ${chave} inexistente`);
      return conteudo;
    },
    async copiar(origem, destino) {
      objetos.set(destino, await armazenamento.ler(origem));
    },
    async remover(chave) {
      objetos.delete(chave);
    },
  };
  return armazenamento;
}
