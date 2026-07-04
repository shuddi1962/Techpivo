import { buildUrl } from "../utils.js"

const API = "https://dev.to/api"

export async function post(article, env) {
  const apiKey = env.DEVTO_API_KEY
  if (!apiKey) throw new Error("DEVTO_API_KEY not set")

  const content = stripHtml(article.content || article.excerpt || article.title)
  const tags    = (article.tags || []).slice(0, 4).map(t => t.toLowerCase().replace(/\s+/g, ""))

  const body = {
    article: {
      title: article.title,
      body_markdown: content,
      published: true,
      tags,
      canonical_url: buildUrl(article, "devto"),
    },
  }

  const res = await fetch(`${API}/articles`, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Dev.to API (${res.status}): ${err}`)
  }

  const data = await res.json()
  return { platform: "devto", postId: String(data?.id || "") }
}

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim()
}
