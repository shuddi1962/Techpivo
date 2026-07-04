import { buildUrl } from "../utils.js"

const THREADS_API = "https://graph.threads.net/v1.0"

export async function post(article, env) {
  const userId = env.THREADS_USER_ID
  const token  = env.THREADS_ACCESS_TOKEN
  if (!userId || !token) throw new Error("THREADS_USER_ID / THREADS_ACCESS_TOKEN not set")

  const text = (env.THREADS_TEMPLATE || "{title}\n\n{excerpt}\n\n{url}")
    .replace(/\{title\}/g,   article.title)
    .replace(/\{url\}/g,     buildUrl(article, "threads"))
    .replace(/\{excerpt\}/g, (article.excerpt || "").slice(0, 150))
    .replace(/\{tags\}/g,    (article.tags || []).join(", "))

  // Step 1 — create a media container (text-only for now; Threads image
  // support is available via the same `media_type` param as Instagram)
  const createBody = new URLSearchParams({
    media_type: "TEXT",
    text,
    access_token: token,
  })

  if (article.image) {
    createBody.set("media_type", "IMAGE")
    createBody.set("image_url", article.image)
  }

  const createRes = await fetch(`${THREADS_API}/${userId}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: createBody,
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Threads create API (${createRes.status}): ${err}`)
  }

  const { id: creationId } = await createRes.json()

  // Step 2 — publish
  const publishBody = new URLSearchParams({
    creation_id: creationId,
    access_token: token,
  })

  const publishRes = await fetch(`${THREADS_API}/${userId}/threads_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: publishBody,
  })

  if (!publishRes.ok) {
    const err = await publishRes.text()
    throw new Error(`Threads publish API (${publishRes.status}): ${err}`)
  }

  const data = await publishRes.json()
  return { platform: "threads", postId: data.id }
}
