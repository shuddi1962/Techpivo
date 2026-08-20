const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/"

export async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await globalThis.crypto.subtle.digest("SHA-1", data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function isPasswordBreached(password: string): Promise<boolean> {
  try {
    const hash = (await sha1Hex(password)).toUpperCase()
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)
    const headers: Record<string, string> = {}
    const apiKey = process.env.HIBP_API_KEY
    if (apiKey) headers["hibp-api-key"] = apiKey
    const res = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      headers,
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return false
    const body = await res.text()
    for (const line of body.split("\r\n")) {
      const [candidate] = line.split(":")
      if (candidate && candidate.toUpperCase() === suffix) return true
    }
    return false
  } catch {
    return false
  }
}