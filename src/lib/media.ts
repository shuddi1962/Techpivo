// Media helpers — store remote images into the `media` bucket and track them
// in media_files (the Media Library's realtime source of truth).
import { createClient } from "@/lib/supabase/admin"

const BUCKET = "media"
const UA = "Mozilla/5.0 (Techpivo Media)"

function extensionOf(remoteUrl: string): string {
  try {
    const pathname = new URL(remoteUrl).pathname
    const m = pathname.match(/\.(jpe?g|png|webp|gif|avif|svg|bmp|ico)(\?.*)?$/i)
    return m ? m[1].toLowerCase() : "jpg"
  } catch {
    return "jpg"
  }
}

function safePath(prefix: string, remoteUrl: string): string {
  const slug = (decodeURIComponent(remoteUrl.split("?")[0].split("/").pop() || "image"))
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  return `${(prefix || "featured").replace(/^\/+|\/+$/g, "")}/${slug || "image"}-${Date.now().toString(36)}.${extensionOf(remoteUrl)}`
}

export async function storeRemoteImage(
  remoteUrl: string,
  prefix: string = "featured",
): Promise<string | null> {
  try {
    const supabase = createClient()
    const res = await fetch(remoteUrl, {
      headers: { "User-Agent": UA },
      redirect: "follow",
      signal: AbortSignal.timeout(45000),
    })
    if (!res.ok) return null
    const bytes = Buffer.from(await res.arrayBuffer())
    if (bytes.length < 1000) return null

    const path = safePath(prefix, remoteUrl)
    const ext = extensionOf(remoteUrl)
    const contentType = res.headers.get("content-type") || `image/${ext === "jpg" ? "jpeg" : ext}`

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    })
    if (upErr) return null

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

    await supabase.from("media_files").insert({
      name: path.split("/").pop(),
      path,
      url: publicUrl,
      mimetype: contentType,
      size: bytes.length,
    })

    return publicUrl
  } catch {
    return null
  }
}
