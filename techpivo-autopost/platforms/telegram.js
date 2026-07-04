import { buildUrl } from "../utils.js"

const API = "https://api.telegram.org"

export async function post(article, env) {
  const token  = env.TELEGRAM_BOT_TOKEN
  const chatId = env.TELEGRAM_CHAT_ID
  if (!token || !chatId) throw new Error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set")

  const text = (env.TELEGRAM_TEMPLATE || "<b>{title}</b>\n\n{excerpt}\n\n{url}")
    .replace(/\{title\}/g,   escapeHtml(article.title))
    .replace(/\{url\}/g,     buildUrl(article, "telegram"))
    .replace(/\{excerpt\}/g, escapeHtml((article.excerpt || "").slice(0, 200)))
    .replace(/\{tags\}/g,    (article.tags || []).join(", "))

  const body = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: false,
  }

  if (article.image) {
    body.photo = article.image
  }

  const res = await fetch(`${API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Telegram API (${res.status}): ${err}`)
  }

  const data = await res.json()
  return { platform: "telegram", postId: String(data.result?.message_id || "") }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
