import { buildUrl } from "../utils.js"

const FB_API = "https://graph.facebook.com/v21.0"

export async function post(article, env) {
  const pageId = env.FB_PAGE_ID
  const token  = env.FB_PAGE_ACCESS_TOKEN
  if (!pageId || !token) throw new Error("FB_PAGE_ID / FB_PAGE_ACCESS_TOKEN not set")

  const message = (env.FACEBOOK_TEMPLATE || "{title}\n\n{excerpt}\n\n{url}")
    .replace(/\{title\}/g,   article.title)
    .replace(/\{url\}/g,     buildUrl(article, "facebook"))
    .replace(/\{excerpt\}/g, (article.excerpt || "").slice(0, 150))
    .replace(/\{tags\}/g,    (article.tags || []).join(", "))

  const body = new URLSearchParams({
    message,
    access_token: token,
  })

  const res = await fetch(`${FB_API}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Facebook API (${res.status}): ${err}`)
  }

  const data = await res.json()
  return { platform: "facebook", postId: data.id }
}
