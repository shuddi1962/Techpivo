import { buildUrl } from "../utils.js"

const FB_API = "https://graph.facebook.com/v21.0"

export async function post(article, env) {
  const igUserId = env.IG_USER_ID
  const token    = env.FB_PAGE_ACCESS_TOKEN
  if (!igUserId || !token) throw new Error("IG_USER_ID / FB_PAGE_ACCESS_TOKEN not set")
  if (!article.image) throw new Error("Instagram requires an image (article has none)")

  const caption = (env.INSTAGRAM_TEMPLATE || "{title}\n\n{excerpt}\n\nLink in bio 🔗\ntechpivo.com")
    .replace(/\{title\}/g,   article.title)
    .replace(/\{url\}/g,     buildUrl(article, "instagram"))
    .replace(/\{excerpt\}/g, (article.excerpt || "").slice(0, 150))
    .replace(/\{tags\}/g,    (article.tags || []).join(", "))

  // Step 1 — create a media container with the image URL
  const createBody = new URLSearchParams({
    image_url: article.image,
    caption,
    access_token: token,
  })

  const createRes = await fetch(`${FB_API}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: createBody,
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Instagram create-media API (${createRes.status}): ${err}`)
  }

  const { id: creationId } = await createRes.json()

  // Step 2 — publish the container
  const publishBody = new URLSearchParams({
    creation_id: creationId,
    access_token: token,
  })

  const publishRes = await fetch(`${FB_API}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: publishBody,
  })

  if (!publishRes.ok) {
    const err = await publishRes.text()
    throw new Error(`Instagram publish API (${publishRes.status}): ${err}`)
  }

  const data = await publishRes.json()
  return { platform: "instagram", postId: data.id }
}
