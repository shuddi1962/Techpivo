import { buildUrl } from "../utils.js"

const API = "https://api.pinterest.com/v5"

export async function post(article, env) {
  const token    = env.PINTEREST_ACCESS_TOKEN
  const boardId  = env.PINTEREST_BOARD_ID
  if (!token) throw new Error("PINTEREST_ACCESS_TOKEN not set")

  if (!article.image) throw new Error("Pinterest requires an image (article has none)")

  const description = (env.PINTEREST_TEMPLATE || "{title}\n\n{excerpt}\n\n{url}")
    .replace(/\{title\}/g,   article.title)
    .replace(/\{url\}/g,     buildUrl(article, "pinterest"))
    .replace(/\{excerpt\}/g, (article.excerpt || "").slice(0, 200))
    .replace(/\{tags\}/g,    (article.tags || []).join(", "))

  const body = {
    title: article.title.slice(0, 100),
    description,
    link: buildUrl(article, "pinterest"),
    alt_text: `Read about ${article.title}`,
  }

  if (boardId) body.board_id = boardId

  // Option A: pin from image URL
  body.image_source_url = article.image

  const res = await fetch(`${API}/pins`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Pinterest API (${res.status}): ${err}`)
  }

  const data = await res.json()
  return { platform: "pinterest", postId: data?.id || "" }
}
