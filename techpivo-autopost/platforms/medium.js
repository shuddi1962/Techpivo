import { buildUrl } from "../utils.js"

const API = "https://api.medium.com/v1"

export async function post(article, env) {
  const token = env.MEDIUM_INTEGRATION_TOKEN
  if (!token) throw new Error("MEDIUM_INTEGRATION_TOKEN not set")

  // Get the authenticated user's ID
  const meRes = await fetch(`${API}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!meRes.ok) {
    const err = await meRes.text()
    throw new Error(`Medium auth (${meRes.status}): ${err}`)
  }

  const { data: user } = await meRes.json()
  if (!user?.id) throw new Error("Medium: could not get user ID")

  const content = article.content || article.excerpt || article.title
  const tags    = (article.tags || []).slice(0, 5)

  const body = {
    title: article.title,
    contentFormat: "html",
    content,
    canonicalUrl: buildUrl(article, "medium"),
    tags,
    publishStatus: "public",
  }

  const res = await fetch(`${API}/users/${user.id}/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Medium API (${res.status}): ${err}`)
  }

  const data = await res.json()
  return { platform: "medium", postId: data?.data?.id || "" }
}
