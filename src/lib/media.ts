// Media helpers — store remote images into Cloudflare R2 bucket
// `techpivo-media` (served via https://images.techpivo.com) and track them
// in media_files (the Media Library's realtime source of truth).
import { createClient as createSessionClient } from "@/lib/supabase/server"
import { r2Upload } from "@/lib/r2"

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

    const publicUrl = await r2Upload({ key: path, body: bytes, contentType })

    const supabase = createSessionClient()
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
