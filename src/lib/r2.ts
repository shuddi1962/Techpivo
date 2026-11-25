// R2 media client — Cloudflare R2 bucket `techpivo-media` served via
// https://images.techpivo.com (public read).
//
// All credentials are server-side only; nothing is exposed to the browser.
// Uploads go through a presigned PUT URL so the browser uploads directly to
// R2 and we never buffer large files through the edge function.
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const BUCKET = process.env.R2_BUCKET || "techpivo-media"
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://images.techpivo.com"

let s3: S3Client | null = null

function getS3(): S3Client {
  if (s3) return s3
  const endpoint = process.env.R2_ENDPOINT
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing R2 environment variables")
  }
  s3 = new S3Client({
    endpoint,
    region: "auto",
    credentials: { accessKeyId, secretAccessKey },
    // R2 is S3-compatible; force path-style addressing.
    forcePathStyle: true,
  })
  return s3
}

/** Public URL for an object key (no secrets). */
export function r2PublicUrl(key: string): string {
  const normalized = key.startsWith("/") ? key.slice(1) : key
  return `${PUBLIC_URL.replace(/\/$/, "")}/${normalized}`
}

/** Generate a presigned PUT URL for direct browser-to-R2 upload.
 *  Returns the upload URL, the object key, and the public URL.
 */
export async function r2PresignedUpload({
  key,
  contentType,
  expiresIn = 900, // 15 minutes
}: {
  key: string
  contentType: string
  expiresIn?: number
}): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const client = getS3()
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  })
  const uploadUrl = await getSignedUrl(client, command, { expiresIn })
  return { uploadUrl, key, publicUrl: r2PublicUrl(key) }
}

/** Upload bytes directly to R2 (server-side). Used when we already have
 *  the buffer in hand (e.g. fetched remote image). */
export async function r2Upload({
  key,
  body,
  contentType,
}: {
  key: string
  body: Buffer | Uint8Array
  contentType: string
}): Promise<string> {
  const client = getS3()
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "3600",
    }),
  )
  return r2PublicUrl(key)
}

export async function r2Delete({ key }: { key: string }): Promise<void> {
  const client = getS3()
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

export { BUCKET }
