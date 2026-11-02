import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 (compatible con S3). Guarda las imágenes de comprobantes y facturas.
 * El bucket es privado: el navegador solo recibe URLs firmadas de vida corta.
 * Variables: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
 */
const UPLOAD_TTL = 300; // segundos
const DOWNLOAD_TTL = 300;

export function isR2Configured(): boolean {
  return Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);
}

function client(): { s3: S3Client; bucket: string } {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error("Falta configurar Cloudflare R2 (variables R2_*) en el servidor.");
  }
  return {
    bucket: R2_BUCKET,
    s3: new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    }),
  };
}

/** URL para subir un objeto con PUT directo desde el navegador. Firma el tipo y el tamaño exactos. */
export async function presignUpload(key: string, contentType: string, size: number): Promise<string> {
  const { s3, bucket } = client();
  return getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ContentLength: size }), { expiresIn: UPLOAD_TTL });
}

/** URL temporal para ver o descargar un objeto. */
export async function presignDownload(key: string): Promise<string> {
  const { s3, bucket } = client();
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: DOWNLOAD_TTL });
}

export async function deleteObject(key: string): Promise<void> {
  const { s3, bucket } = client();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
