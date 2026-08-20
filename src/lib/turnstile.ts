const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export async function verifyTurnstile(token: unknown): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY
  if (!secretKey) return true
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: secretKey, response: token }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}