import { buildUrl } from "../utils.js"

const API = "https://graph.facebook.com/v21.0"

export async function post(article, env) {
  const phoneId = env.WHATSAPP_PHONE_NUMBER_ID
  const token   = env.WHATSAPP_ACCESS_TOKEN
  if (!phoneId || !token) throw new Error("WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN not set")

  const text = (env.WHATSAPP_TEMPLATE || "{title}\n\n{excerpt}\n\n{url}")
    .replace(/\{title\}/g,   article.title)
    .replace(/\{url\}/g,     buildUrl(article, "whatsapp"))
    .replace(/\{excerpt\}/g, (article.excerpt || "").slice(0, 200))
    .replace(/\{tags\}/g,    (article.tags || []).join(", "))

  // WhatsApp Channel send
  const body = {
    messaging_product: "whatsapp",
    recipient_type: "channel",
    type: "text",
    text: { body: text },
  }

  const res = await fetch(`${API}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`WhatsApp API (${res.status}): ${err}`)
  }

  const data = await res.json()
  return { platform: "whatsapp", postId: data?.messages?.[0]?.id || "" }
}
