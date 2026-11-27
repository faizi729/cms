// Server-only: uses AWS credentials. Never import from client code.
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

/** Max image size accepted by the upload endpoint. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Folders an upload may go into, so callers cannot write anywhere in the bucket. */
export const UPLOAD_FOLDERS = ['courses', 'thumbnails'] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

type ImageType = { mime: string; ext: string };

/**
 * Detect the image type from the file's first bytes rather than trusting the
 * browser-supplied name or MIME type. SVG is deliberately not allowed because
 * it can carry scripts.
 */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  const startsWith = (sig: number[], offset = 0) =>
    sig.every((b, i) => bytes[offset + i] === b);

  if (startsWith([0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', ext: 'jpg' };
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (startsWith([0x47, 0x49, 0x46, 0x38])) return { mime: 'image/gif', ext: 'gif' };
  // "RIFF" .... "WEBP"
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

function getS3Config() {
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET;
  if (!region || !bucket) {
    throw new Error(
      'S3 is not configured. Set AWS_REGION and AWS_S3_BUCKET (and AWS credentials) in .env',
    );
  }
  // Optional: a CloudFront / CDN base URL that serves the bucket.
  const publicBaseUrl = (
    process.env.AWS_S3_PUBLIC_URL ||
    `https://${bucket}.s3.${region}.amazonaws.com`
  ).replace(/\/+$/, '');
  return { region, bucket, publicBaseUrl };
}

let client: S3Client | null = null;
function getClient(region: string) {
  // Credentials come from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY, or from
  // the server's IAM role, via the SDK's default provider chain.
  if (!client) client = new S3Client({ region });
  return client;
}

export function isS3Configured(): boolean {
  return Boolean(process.env.AWS_REGION && process.env.AWS_S3_BUCKET);
}

/** Upload an image and return its public URL. */
export async function uploadImageToS3(
  bytes: Uint8Array,
  type: ImageType,
  folder: UploadFolder,
): Promise<{ url: string; key: string }> {
  const { region, bucket, publicBaseUrl } = getS3Config();
  const key = `uploads/${folder}/${new Date().getFullYear()}/${randomUUID()}.${type.ext}`;

  await getClient(region).send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: type.mime,
      // Uploaded file names are random UUIDs, so they never change: cache hard.
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return { url: `${publicBaseUrl}/${key}`, key };
}
