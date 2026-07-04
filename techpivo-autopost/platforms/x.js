import crypto from "node:crypto"
import { buildUrl } from "../utils.js"

const X_API = "https://api.twitter.com/2"

function oauthHeader(method, url, params, env) {
  const nonce     = crypto.randomBytes(16).toString("hex")
  const timestamp = Math.floor(Date.now() / 1000).toString()

  const oauth = {
    oauth_consumer_key:     env.X_APP_KEY,
    oauth_nonce:            nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp:        timestamp,
    oauth_token:            env.X_ACCESS_TOKEN,
    oauth_version:          "1.0",
    ...params,
  }

  const paramStr = Object.entries(oauth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&")

  const base = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`
  const key  = `${encodeURIComponent(env.X_APP_SECRET)}&${encodeURIComponent(env.X_ACCESS_SECRET)}`
  const sig  = crypto.createHmac("sha1", key).update(base).digest("base64")

  oauth.oauth_signature = sig

  return "OAuth " + Object.entries(oauth)
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(", ")
}

async function uploadMedia(imageUrl, env) {
  if (!imageUrl) return null

  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) return null

  const buf  = await imgRes.arrayBuffer()
  const b64  = Buffer.from(buf).toString("base64")
  const mediaUrl = "https://upload.twitter.com/1.1/media/upload.json"

  // INIT
  const initBody = new URLSearchParams({
    command: "INIT",
    media_type: "image/jpeg",
    total_bytes: String(buf.byteLength),
  })

  const initAuth = oauthHeader("POST", mediaUrl, {
    command: "INIT",
    media_type: "image/jpeg",
    total_bytes: String(buf.byteLength),
  }, env)

  const initRes = await fetch(mediaUrl, {
    method: "POST",
    headers: { Authorization: initAuth, "Content-Type": "application/x-www-form-urlencoded" },
    body: initBody.toString(),
  })

  if (!initRes.ok) return null
  const { media_id_string } = await initRes.json()
  if (!media_id_string) return null

  // APPEND
  const appendAuth = oauthHeader("POST", mediaUrl, {
    command: "APPEND",
    media_id: media_id_string,
    segment_index: "0",
  }, env)

  const appendForm = new FormData()
  appendForm.append("command", "APPEND")
  appendForm.append("media_id", media_id_string)
  appendForm.append("segment_index", "0")
  appendForm.append("media_data", b64)

  await fetch(mediaUrl, {
    method: "POST",
    headers: { Authorization: appendAuth },
    body: appendForm,
  })

  // FINALIZE
  const finalizeAuth = oauthHeader("POST", mediaUrl, {
    command: "FINALIZE",
    media_id: media_id_string,
  }, env)

  await fetch(mediaUrl, {
    method: "POST",
    headers: { Authorization: finalizeAuth, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ command: "FINALIZE", media_id: media_id_string }).toString(),
  })

  return media_id_string
}

export async function post(article, env) {
  if (!env.X_APP_KEY || !env.X_APP_SECRET || !env.X_ACCESS_TOKEN || !env.X_ACCESS_SECRET) {
    throw new Error("X (Twitter) credentials not fully set in .env")
  }

  const text = (env.X_TEMPLATE || "{title}\n\n{url}")
    .replace(/\{title\}/g, article.title)
    .replace(/\{url\}/g,   buildUrl(article, "x"))
    .replace(/\{tags\}/g,  (article.tags || []).join(" "))

  const tweet = {
    text: text.length > 280 ? text.slice(0, 277) + "..." : text,
  }

  if (article.image) {
    const mediaId = await uploadMedia(article.image, env)
    if (mediaId) tweet.media = { media_ids: [mediaId] }
  }

  const auth = oauthHeader("POST", `${X_API}/tweets`, {}, env)

  const res = await fetch(`${X_API}/tweets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
    },
    body: JSON.stringify(tweet),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`X API (${res.status}): ${err}`)
  }

  const data = await res.json()
  return { platform: "x", postId: data.data?.id }
}
