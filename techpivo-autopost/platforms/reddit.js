import { buildUrl } from "../utils.js"

const API = "https://www.reddit.com/api/v1"

export async function post(article, env) {
  const clientId     = env.REDDIT_CLIENT_ID
  const clientSecret = env.REDDIT_CLIENT_SECRET
  const refreshToken = env.REDDIT_REFRESH_TOKEN
  const subreddit    = env.REDDIT_SUBREDDIT || "technology"

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET / REDDIT_REFRESH_TOKEN not set")
  }

  // Get access token from refresh token
  const tokenRes = await fetch(`${API}/access_token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "TechpivoAutopost/1.0",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }).toString(),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`Reddit auth (${tokenRes.status}): ${err}`)
  }

  const { access_token } = await tokenRes.json()
  if (!access_token) throw new Error("Reddit auth returned no access_token")

  // Submit link post
  const title = article.title.slice(0, 300)
  const url   = buildUrl(article, "reddit")

  const params = new URLSearchParams({
    api_type: "json",
    kind: "link",
    sr: subreddit,
    title,
    url,
    resubmit: "true",
  })

  const res = await fetch(`${API}/submit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "User-Agent": "TechpivoAutopost/1.0",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Reddit submit (${res.status}): ${err}`)
  }

  const data = await res.json()
  if (data.error) throw new Error(`Reddit API error: ${JSON.stringify(data)}`)

  const postId = data?.json?.data?.id || data?.json?.data?.name || ""
  return { platform: "reddit", postId }
}
