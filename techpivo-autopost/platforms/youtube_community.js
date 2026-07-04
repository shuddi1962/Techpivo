import { buildUrl } from "../utils.js"

const API = "https://www.googleapis.com/youtube/v3"

export async function post(article, env) {
  const channelId = env.YOUTUBE_CHANNEL_ID
  const apiKey    = env.YOUTUBE_API_KEY
  if (!channelId || !apiKey) throw new Error("YOUTUBE_CHANNEL_ID / YOUTUBE_API_KEY not set")

  // YouTube Community posts via API are only available to channels
  // with >500 subscribers and require OAuth 2.0 (not just API key).
  // This module attempts to use the unlisted `insert` endpoint.
  // If you have OAuth credentials instead, set YOUTUBE_ACCESS_TOKEN.

  const text = (env.YOUTUBE_TEMPLATE || "{title}\n\n{excerpt}\n\n{url}")
    .replace(/\{title\}/g,   article.title)
    .replace(/\{url\}/g,     buildUrl(article, "youtube_community"))
    .replace(/\{excerpt\}/g, (article.excerpt || "").slice(0, 200))
    .replace(/\{tags\}/g,    (article.tags || []).join(", "))

  // YouTube Community API (beta, OAuth 2.0 required)
  const accessToken = env.YOUTUBE_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error(
      "YouTube Community posts require YOUTUBE_ACCESS_TOKEN (OAuth 2.0). " +
      "API keys don't support this endpoint. " +
      "See https://developers.google.com/youtube/v3/docs/communityPosts"
    )
  }

  const body = {
    snippet: {
      channelId,
      text,
    },
  }

  if (article.image) {
    body.contentDetails = {
      attachment: {
        image: {
          url: article.image,
        },
      },
    }
  }

  const res = await fetch(`${API}/communityPosts?part=snippet,contentDetails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`YouTube Community API (${res.status}): ${err}`)
  }

  const data = await res.json()
  return { platform: "youtube_community", postId: data?.id || "" }
}
