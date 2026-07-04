import "dotenv/config"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import cron from "node-cron"
import { parseRSS } from "./utils.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const POSTED_FILE = path.join(__dirname, "posted.json")
const RSS_URL = process.env.RSS_URL || "https://techpivo.com/rss.xml"
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || `*/${process.env.POLL_INTERVAL_MINUTES || 15} * * * *`
const RUN_ONCE = process.argv.includes("--once")

// ── Platform loader ──────────────────────────────────────────────────────
const PLATFORMS = {}

async function loadPlatform(name) {
  try {
    const mod = await import(`./platforms/${name}.js`)
    PLATFORMS[name] = mod.post
  } catch {
    // platform module not found — skip
  }
}

const PLATFORM_MAP = {
  facebook:          "ENABLE_FACEBOOK",
  instagram:         "ENABLE_INSTAGRAM",
  threads:           "ENABLE_THREADS",
  linkedin:          "ENABLE_LINKEDIN",
  x:                 "ENABLE_X",
  telegram:          "ENABLE_TELEGRAM",
  reddit:            "ENABLE_REDDIT",
  whatsapp:          "ENABLE_WHATSAPP",
  medium:            "ENABLE_MEDIUM",
  devto:             "ENABLE_DEVTO",
  hashnode:          "ENABLE_HASHNODE",
  pinterest:         "ENABLE_PINTEREST",
  youtube_community: "ENABLE_YOUTUBE_COMMUNITY",
}

// ── posted.json ledger ───────────────────────────────────────────────────
function readPosted() {
  try {
    return JSON.parse(fs.readFileSync(POSTED_FILE, "utf-8"))
  } catch {
    return {}
  }
}

function writePosted(posted) {
  fs.writeFileSync(POSTED_FILE, JSON.stringify(posted, null, 2))
}

// ── Main logic ───────────────────────────────────────────────────────────
async function runOnce() {
  console.log(`[${new Date().toISOString()}] Polling ${RSS_URL} ...`)

  // 1. Fetch & parse RSS
  let xml
  try {
    const res = await fetch(RSS_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    xml = await res.text()
  } catch (err) {
    console.error(`[RSS] Fetch failed: ${err.message}`)
    return
  }

  const items = parseRSS(xml)
  console.log(`[RSS] ${items.length} items found`)

  if (items.length === 0) {
    console.log("[RSS] No items — check feed URL or format")
    return
  }

  // 2. Build article key (guid or link)
  const posted = readPosted()

  for (const item of items) {
    const articleKey = item.guid || item.link
    if (!articleKey) continue

    const article = {
      title:   item.title,
      slug:    extractSlug(item.link),
      excerpt: item.excerpt,
      image:   item.image,
      tags:    extractTags(item),
      content: item.excerpt, // RSS feeds carry excerpt, not full body
      link:    item.link,
    }

    if (!article.image) {
      console.log(`  ⏭  "${article.title}" — no image, skipping`)
      continue
    }

    // 3. For each enabled platform
    for (const [platform, envVar] of Object.entries(PLATFORM_MAP)) {
      if (process.env[envVar] !== "true") continue

      const postKey = `${articleKey}::${platform}`
      if (posted[postKey]) {
        continue // already posted
      }

      if (!PLATFORMS[platform]) {
        await loadPlatform(platform)
      }
      if (!PLATFORMS[platform]) {
        console.warn(`  ⚠  No module for "${platform}" — check platforms/${platform}.js`)
        continue
      }

      console.log(`  → posting to ${platform} ...`)
      try {
        const result = await PLATFORMS[platform](article, process.env)
        posted[postKey] = {
          postedAt: new Date().toISOString(),
          postId:   result.postId,
        }
        console.log(`    ✓ ${result.platform} postId: ${result.postId}`)
      } catch (err) {
        posted[postKey] = {
          postedAt:  new Date().toISOString(),
          failed:    true,
          error:     err.message.slice(0, 300),
        }
        console.error(`    ✗ ${platform}: ${err.message}`)
      }

      writePosted(posted)
    }
  }

  console.log(`[${new Date().toISOString()}] Done.`)
}

// ── Helpers ──────────────────────────────────────────────────────────────
function extractSlug(link) {
  if (!link) return ""
  try {
    const url = new URL(link)
    return url.pathname.replace(/^\//, "").replace(/\/$/, "")
  } catch {
    return link.split("/").filter(Boolean).pop() || ""
  }
}

function extractTags(item) {
  const tags = []
  const tagRegex = /<category[^>]*>([\s\S]*?)<\/category>/gi
  let m
  while ((m = tagRegex.exec(item._raw || "")) !== null) {
    tags.push(m[1].trim())
  }
  return tags
}

// Inject raw XML for tag extraction in parseRSS
function injectRaw(xmlText) {
  const items = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match
  while ((match = itemRegex.exec(xmlText)) !== null) {
    items.push({ _raw: match[1] })
  }
  return items
}

// Patch parseRSS to attach _raw for tag extraction
const origParse = parseRSS
parseRSS = function(xml) {
  const items = origParse(xml)
  const rawItems = injectRaw(xml)
  items.forEach((item, i) => {
    if (rawItems[i]) item._raw = rawItems[i]._raw
  })
  return items
}

// ── Entry point ──────────────────────────────────────────────────────────
if (RUN_ONCE) {
  runOnce()
} else {
  console.log(`[TechPivo Auto-Poster] Starting — polling every ${CRON_SCHEDULE}`)
  runOnce()
  cron.schedule(CRON_SCHEDULE, runOnce)
}
