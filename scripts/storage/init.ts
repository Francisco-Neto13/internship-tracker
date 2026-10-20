import { CreateBucketCommand, HeadBucketCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

// Prepares the private bucket (D8, RNF-06): creates it when missing and allows the browser
// of the application origin to PUT straight to signed URLs (CORS). Idempotent; run once per
// environment: `npm run storage:init`. Never makes anything public.

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT, BETTER_AUTH_URL } = process.env;
if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || (!R2_ENDPOINT && !R2_ACCOUNT_ID)) {
  console.error("Defina R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_ACCOUNT_ID ou R2_ENDPOINT (veja .env.example)");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: process.env.R2_FORCE_PATH_STYLE === "true",
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const origem = new URL(BETTER_AUTH_URL ?? "http://localhost:3000").origin;

async function main() {
  try {
    await client.send(new HeadBucketCommand({ Bucket: R2_BUCKET }));
    console.log(`bucket ${R2_BUCKET} já existe`);
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: R2_BUCKET }));
    console.log(`bucket ${R2_BUCKET} criado`);
  }

  try {
    await client.send(
      new PutBucketCorsCommand({
        Bucket: R2_BUCKET,
        CORSConfiguration: {
          CORSRules: [{ AllowedOrigins: [origem], AllowedMethods: ["PUT", "GET"], AllowedHeaders: ["content-type"], MaxAgeSeconds: 3600 }],
        },
      }),
    );
    console.log(`CORS: PUT e GET a partir de ${origem}`);
  } catch (error) {
    // Some local S3 servers have no bucket CORS API; production (R2) does
    console.warn(`CORS não aplicado (${(error as Error).name}); configure-o no provedor antes de usar em produção`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
