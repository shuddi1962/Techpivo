const SITE_URL = process.env.RSS_URL
  ? new URL(process.env.RSS_URL).origin
  : "https://techpivo.com"

export function buildUrl(article, platform) {
  const url = `${SITE_URL}/${article.slug}`
  const params = new URLSearchParams({
    utm_source: platform,
    utm_medium: "social",
    utm_campaign: "techpivo-auto",
  })
  return `${url}?${params}`
}

export function parseRSS(xmlText) {
  let items = []

  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const block = match[1]
    items.push({
      title:   extractTag(block, "title"),
      link:    extractTag(block, "link"),
      guid:    extractTag(block, "guid"),
      excerpt: extractTag(block, "description"),
      pubDate: extractTag(block, "pubDate"),
      image:   extractMediaContent(block) || extractEnclosure(block),
    })
  }

  // Also try Atom format if RSS items were empty
  if (items.length === 0) {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi
    while ((match = entryRegex.exec(xmlText)) !== null) {
      const block = match[1]
      items.push({
        title:   extractTag(block, "title"),
        link:    extractAtomLink(block),
        guid:    extractTag(block, "id"),
        excerpt: extractTag(block, "summary") || extractTag(block, "content"),
        pubDate: extractTag(block, "published") || extractTag(block, "updated"),
        image:   extractMediaContent(block),
      })
    }
  }

  return items
}

function extractTag(block, tag) {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i")
  let m = regex.exec(block)
  if (m) return decodeEntities(m[1].trim())

  const regex2 = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
  m = regex2.exec(block)
  if (m) return decodeEntities(m[1].trim())

  return ""
}

function extractMediaContent(block) {
  const m = /<media:content[^>]*url="([^"]+)"/i.exec(block)
  return m ? m[1] : null
}

function extractEnclosure(block) {
  const m = /<enclosure[^>]*url="([^"]+)"/i.exec(block)
  return m ? m[1] : null
}

function extractAtomLink(block) {
  const m = /<link[^>]*href="([^"]+)"[^>]*\/>/i.exec(block)
  return m ? m[1] : null
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
}
