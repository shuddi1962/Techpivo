export const SHORT_IO_KEY = process.env.NEXT_PUBLIC_SHORT_IO_KEY || ""
export const SHORT_IO_DOMAIN = process.env.NEXT_PUBLIC_SHORT_IO_DOMAIN || ""

export async function shortenUrl(url: string, signal?: AbortSignal): Promise<string> {
  if (!url) return ""
  if (!SHORT_IO_KEY || !SHORT_IO_DOMAIN) return url
  try {
    const res = await fetch("https://api.short.io/links", {
      method: "POST",
      headers: {
        Authorization: SHORT_IO_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain: SHORT_IO_DOMAIN,
        originalURL: url,
      }),
      signal,
    })
    if (!res.ok) return url
    const data = (await res.json()) as { shortURL?: string }
    if (data.shortURL && data.shortURL.startsWith("http")) return data.shortURL
    return url
  } catch {
    return url
  }
}
