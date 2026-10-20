import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Private object storage (RNF-06): Cloudflare R2 in production, MinIO in development, both
// through the S3 API. Nothing here is public; every URL is signed and short-lived.
// Tests replace the implementation with an in-memory one (armazenamento-memoria.ts).

export type Armazenamento = {
  /** Signed PUT URL: Content-Type and Content-Length are part of the signature. */
  urlEnvio(chave: string, tipoMime: string, tamanhoBytes: number, segundos: number): Promise<string>;
  /** Signed GET URL that downloads with the given file name. */
  urlLeitura(chave: string, nomeArquivo: string, segundos: number): Promise<string>;
  tamanho(chave: string): Promise<number | null>;
  ler(chave: string): Promise<Uint8Array>;
  copiar(origem: string, destino: string): Promise<void>;
  remover(chave: string): Promise<void>;
};

function configuracaoS3() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT } = process.env;
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || (!R2_ENDPOINT && !R2_ACCOUNT_ID)) {
    throw new Error("Armazenamento não configurado: defina R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_ACCOUNT_ID ou R2_ENDPOINT");
  }
  return {
    bucket: R2_BUCKET,
    client: new S3Client({
      // R2 accepts "auto"; MinIO ignores the region
      region: "auto",
      endpoint: R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      // MinIO serves buckets by path (localhost:9000/bucket/key), R2 by virtual host
      forcePathStyle: process.env.R2_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    }),
  };
}

function armazenamentoS3(): Armazenamento {
  const { client, bucket } = configuracaoS3();
  return {
    urlEnvio: (chave, tipoMime, tamanhoBytes, segundos) =>
      getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: chave, ContentType: tipoMime, ContentLength: tamanhoBytes }), {
        expiresIn: segundos,
        signableHeaders: new Set(["content-type", "content-length"]),
      }),
    urlLeitura: (chave, nomeArquivo, segundos) =>
      getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: bucket,
          Key: chave,
          ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(nomeArquivo)}`,
        }),
        { expiresIn: segundos },
      ),
    async tamanho(chave) {
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: chave }));
        return head.ContentLength ?? null;
      } catch (error) {
        if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return null;
        throw error;
      }
    },
    async ler(chave) {
      const resposta = await client.send(new GetObjectCommand({ Bucket: bucket, Key: chave }));
      return resposta.Body!.transformToByteArray();
    },
    async copiar(origem, destino) {
      await client.send(new CopyObjectCommand({ Bucket: bucket, Key: destino, CopySource: `${bucket}/${origem}` }));
    },
    async remover(chave) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: chave }));
    },
  };
}

let atual: Armazenamento | undefined;

// Lazy, like the database pools: `next build` must not need storage credentials
export function getArmazenamento(): Armazenamento {
  return (atual ??= armazenamentoS3());
}

/** Tests only: swap the implementation (see armazenamento-memoria.ts). */
export function definirArmazenamento(armazenamento: Armazenamento | undefined): void {
  atual = armazenamento;
}
