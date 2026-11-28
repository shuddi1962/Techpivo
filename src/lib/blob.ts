// TechPivo image delivery — Vercel Blob via images.techpivo.com
//
// Public images (products, categories, banners, blogs) are served from
// the Vercel Blob store with CDN-backed public URLs.
// Private images (avatars, draft uploads) use `access: "private"` and
// server-generated URLs — never expose the Blob token to the browser.
//
// Logical paths: /products/, /products/gallery/, /categories/, /banners/,
// /stores/, /brands/, /blog/, /promotions/, /avatars/, /uploads/
//
// All credentials are server-side only (BLOB_READ_WRITE_TOKEN env var).

import { put, del } from "@vercel/blob"

// Public URL for a Blob object key. Vercel Blob returns the URL on `put()`,
// so this helper is used when the key is already known (e.g. stored path).
export function blobPublicUrl(key: string): string {
  const normalized = key.startsWith("/") ? key.slice(1) : key
  return `https://images.techpivo.com/${normalized}`
}

/** Upload bytes directly to Vercel Blob (server-side).
 *  Returns the public URL the file is available at after upload.
 */
export async function blobUpload({
  key,
  body,
  contentType,
}: {
  key: string
  body: Buffer
  contentType: string
}): Promise<string> {
  const { url } = await put(key, body, {
    access: "public",
    contentType,
    cacheControlMaxAge: 3600,
    addRandomSuffix: false,
  })
  return url
}

/** Generate a presigned-style upload for direct browser-to-Blob uploads.
 *  Vercel Blob's `put` can be called from the browser with the token exposed
 *  via a narrowly-scoped token, but for TechPivo all uploads go through the
 *  server route handler (`/api/upload`) which validates auth + magic bytes.
 *  This returns the target key + expected public URL so the client can
 *  display a preview before the server-side upload completes.
 */
export async function blobPresignedUpload({
  key,
  contentType,
}: {
  key: string
  contentType: string
}): Promise<{ key: string; publicUrl: string }> {
  // No presigned URL needed for server-side uploads; return the expected
  // public URL so callers can render optimistically.
  return { key, publicUrl: blobPublicUrl(key) }
}

/** Delete an object from Vercel Blob. */
export async function blobDelete({ key }: { key: string }): Promise<void> {
  await del(key)
}
