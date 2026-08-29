// One-off bulk readability pass. Mirrors the /api/admin/readability route
// against the live DB. Idempotent — re-runs only update posts still below
// Flesch 50.

import { createClient } from "@supabase/supabase-js"
import { improveReadability } from "../src/lib/editor-autofix"
import { calculateReadability } from "../src/lib/seo-utils"
import { config } from "dotenv"

config({ path: ".env.local" })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.local")
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const MIN_SCORE = 50
const MAX_POSTS = 50

async function main() {
  const { data: posts, error: fetchError } = await supabase
    .from("posts")
    .select("id, title, content, flesch_score, readability_score, slug")
    .eq("status", "published")
    .or(`flesch_score.lt.${MIN_SCORE},flesch_score.is.null`)
    .order("flesch_score", { ascending: true, nullsFirst: true })
    .limit(MAX_POSTS)

  if (fetchError) {
    console.error("Failed to fetch:", fetchError.message)
    process.exit(1)
  }

  if (!posts || posts.length === 0) {
    console.log("No posts below Flesch", MIN_SCORE)
    return
  }

  console.log(`Found ${posts.length} posts to improve. Target Flesch ${MIN_SCORE}+.`)
  console.log()

  let improved = 0
  let failed = 0
  let stillBelow = 0
  let skipped = 0

  for (const post of posts) {
    if (!post.content) {
      console.log(`SKIP  ${post.title} (no content)`)
      skipped++
      continue
    }

    try {
      const before = calculateReadability(post.content)
      const newContent = improveReadability(post.content)
      const after = calculateReadability(newContent)

      const { error: updateError } = await supabase
        .from("posts")
        .update({
          content: newContent,
          flesch_score: after.flesch,
          readability_score: after.score,
        })
        .eq("id", post.id)

      if (updateError) {
        console.log(`FAIL  ${post.title} — ${updateError.message}`)
        failed++
        continue
      }

      const reached = after.flesch >= MIN_SCORE
      const arrow = reached ? "✓" : "✗"
      if (reached) improved++
      else stillBelow++

      const lenBefore = post.content.length
      const lenAfter = newContent.length
      const delta = lenAfter - lenBefore
      const deltaSign = delta >= 0 ? "+" : ""

      console.log(
        `${arrow}  ${post.title.slice(0, 60).padEnd(60)} ` +
        `${String(before.flesch).padStart(5)} → ${String(after.flesch).padStart(5)}  ` +
        `len ${deltaSign}${delta}B`
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.log(`FAIL  ${post.title} — ${message}`)
      failed++
    }
  }

  console.log()
  console.log("=" + "=".repeat(70))
  console.log(`Processed: ${posts.length}`)
  console.log(`Improved (Flesch ${MIN_SCORE}+):  ${improved}`)
  console.log(`Still below (will retry later): ${stillBelow}`)
  console.log(`Failed:                            ${failed}`)
  console.log(`Skipped (no content):              ${skipped}`)
}

main().catch(err => {
  console.error("Fatal:", err)
  process.exit(1)
})
