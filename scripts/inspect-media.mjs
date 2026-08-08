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

const { data: files, error } = await supabase.storage.from("media").list("", { limit: 1000 })
console.log("MEDIA BUCKET FILES:", JSON.stringify(files?.map(f => f.name), null, 2), error || "")

const { data: posts } = await supabase
  .from("posts")
  .select("id, title, slug, featured_image")
  .not("featured_image", "is", null)
  .limit(2000)

const withRemote = (posts || []).filter(p => !String(p.featured_image || "").includes(url))
const hosted = (posts || []).filter(p => String(p.featured_image || "").includes(url))
console.log(`\nPOSTS WITH IMAGE: ${(posts || []).length}`)
console.log(`REMOTE (not in our supabase): ${withRemote.length}`)
console.log(`HOSTED (our supabase): ${hosted.length}`)
console.log("\nSAMPLE REMOTE IMAGES:")
withRemote.slice(0, 8).forEach(p => console.log(`- ${p.title.slice(0, 50)}: ${String(p.featured_image).slice(0, 90)}`))
console.log("\nSAMPLE HOSTED:")
hosted.slice(0, 5).forEach(p => console.log(`- ${p.title.slice(0, 50)}: ${String(p.featured_image).slice(0, 120)}`))
