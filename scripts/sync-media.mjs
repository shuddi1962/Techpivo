import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, "..", ".env.local") })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing env keys")
  process.exit(1)
}

const supabase = createClient(url, key)
const BUCKET = "media"
const UA = "Mozilla/5.0 (Techpivo Media Sync)"
const CONCURRENCY = 5

function extensionOf(remoteUrl) {
  try {
    const pathname = new URL(remoteUrl).pathname
    const m = pathname.match(/\.(jpe?g|png|webp|gif|avif|svg|bmp|ico)(\?.*)?$/i)
    return m ? m[1].toLowerCase() : "jpg"
  } catch {
    return "jpg"
  }
}

async function downloadImage(remoteUrl) {
  const res = await fetch(remoteUrl, {
    headers: { "User-Agent": UA },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const bytes = Buffer.from(await res.arrayBuffer())
  if (bytes.length < 1000) throw new Error("Too small (likely an error page)")
  return bytes
}

async function deleteTestFiles() {
  const toRemove = [
    "campaigns/1780826676177-ChatGPT Image Jun 1, 2026, 06_40_44 AM.png",
    "ad-slots/1780826728034-ChatGPT Image Jun 1, 2026, 06_40_44 AM.png",
  ]
  const { data, error } = await supabase.storage.from(BUCKET).remove(toRemove)
  console.log("Removed test files:", data?.map(d => d.name) || [], error || "")
}

async function syncFeaturedImages() {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, title, slug, featured_image")
    .not("featured_image", "is", null)
    .limit(2000)
  if (error) {
    console.error("Failed to fetch posts:", error.message)
    return
  }

  const remote = (posts || []).filter(p => !String(p.featured_image || "").includes(url))
  console.log(`\nSyncing ${remote.length} remote featured images...`)

  let synced = 0
  let failed = 0
  let cursor = 0
  const results = []

  const worker = async () => {
    while (cursor < remote.length) {
      const post = remote[cursor++]
      const remoteUrl = String(post.featured_image)
      const safeSlug = (post.slug || post.id).replace(/[^a-z0-9-]/gi, "").slice(0, 60) || "image"
      const destPath = `featured/${safeSlug}-${Date.now().toString(36)}.${extensionOf(remoteUrl)}`

      try {
        const bytes = await downloadImage(remoteUrl)
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(destPath, bytes, {
          contentType: `image/${extensionOf(remoteUrl) === "jpg" ? "jpeg" : extensionOf(remoteUrl)}`,
          cacheControl: "3600",
          upsert: false,
        })
        if (upErr) throw new Error(upErr.message)

        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(destPath)
        const { error: updateErr } = await supabase
          .from("posts")
          .update({ featured_image: publicUrl })
          .eq("id", post.id)
        if (updateErr) throw new Error(updateErr.message)

        const { error: rowErr } = await supabase.from("media_files").insert({
          name: destPath.split("/").pop(),
          path: destPath,
          url: publicUrl,
          mimetype: `image/${extensionOf(remoteUrl) === "jpg" ? "jpeg" : extensionOf(remoteUrl)}`,
          size: bytes.length,
        })
        if (rowErr) throw new Error(rowErr.message)

        synced++
        results.push(`OK   ${post.title.slice(0, 45)} -> ${destPath}`)
      } catch (e) {
        failed++
        results.push(`FAIL ${post.title.slice(0, 45)}: ${e.message}`)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, remote.length) }, worker))
  console.log(results.join("\n"))
  console.log(`\nDone: ${synced} synced, ${failed} failed (dead links left as-is)`)
}

async function main() {
  await deleteTestFiles()
  await syncFeaturedImages()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
