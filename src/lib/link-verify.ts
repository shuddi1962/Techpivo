// Link verification — checks external URLs before they're shown to editors.
// Uses HEAD requests with a GET fallback (some sites reject HEAD), runs with
// limited concurrency, and treats 2xx/3xx as valid. Hard failures (timeout,
// DNS error, 4xx/5xx) are dropped.

const CONCURRENCY = 10
const TIMEOUT_MS = 6000
const UA = "Mozilla/5.0 (Techpivo Link Checker)"

async function checkOne(url: string): Promise<boolean> {
  try {
    const headers = { "User-Agent": UA }

    const head = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (head.ok) return true
    if (![405, 501, 403].includes(head.status)) return false

    const get = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { ...headers, "Range": "bytes=0-2048" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    return get.ok
  } catch {
    return false
  }
}

export async function verifyUrls(urls: string[]): Promise<Set<string>> {
  const cleaned = [...new Set(urls.filter((u) => /^https?:\/\//i.test(u)))]
  const verified = new Set<string>()
  let cursor = 0

  const worker = async () => {
    while (cursor < cleaned.length) {
      const url = cleaned[cursor++]
      if (await checkOne(url)) verified.add(url)
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, cleaned.length) }, worker))
  return verified
}

// Filter an array of objects down to those whose `url` field is valid.
// Items without a url are dropped unless keepNoUrl is true.
export async function filterVerified<T extends { url?: string }>(
  items: T[],
  keepNoUrl = false,
): Promise<T[]> {
  const withUrl = items.filter((i) => /^https?:\/\//i.test(i.url || ""))
  const noUrl = keepNoUrl ? items.filter((i) => !/^https?:\/\//i.test(i.url || "")) : []
  const verified = await verifyUrls(withUrl.map((i) => i.url!))
  return [...withUrl.filter((i) => verified.has(i.url!)), ...noUrl]
}
