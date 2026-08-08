import Parser from "rss-parser"

const JINA_READER = "https://r.jina.ai"
const JINA_SEARCH = "https://s.jina.ai"
const JINA_API_KEY = process.env.JINA_API_KEY || ""
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ""
const TIMEOUT_MS = 30000
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

async function jinaReaderFetch(url: string): Promise<string> {
  const target = url.replace(/^https?:\/\//, "").replace(/^\/+/, "")
  const headers: Record<string, string> = {
    "Accept": "text/markdown",
    "X-Return-Format": "markdown",
    "X-Timeout": "20",
    "X-No-Cache": "true",
    "User-Agent": "Mozilla/5.0 (Techpivo Agent Reach)",
  }
  if (JINA_API_KEY) headers["Authorization"] = `Bearer ${JINA_API_KEY}`

  const res = await fetch(`${JINA_READER}/${target}`, {
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Web reader failed (${res.status})`)
  return res.text()
}

async function jinaSearchFetch(query: string): Promise<string> {
  const headers: Record<string, string> = {
    "Accept": "text/markdown",
    "X-Return-Format": "markdown",
    "X-No-Cache": "true",
    "User-Agent": "Mozilla/5.0 (Techpivo Agent Reach)",
  }
  if (JINA_API_KEY) headers["Authorization"] = `Bearer ${JINA_API_KEY}`

  const res = await fetch(
    `${JINA_SEARCH}/?q=${encodeURIComponent(query)}&top_k=10`,
    {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  )
  if (!res.ok) throw new Error(`Jina search failed (${res.status})`)
  return res.text()
}

export interface WebResult {
  url: string
  title?: string
  published?: string
  snippet?: string
}

export interface SearchChannel {
  engine: "jina" | "bing" | "duckduckgo"
  results: WebResult[]
}

export interface RssItem {
  title?: string
  link?: string
  pubDate?: string
  isoDate?: string
  contentSnippet?: string
  author?: string
  categories?: string[]
}

export interface TrendingItem {
  title: string
  url: string
  source: string
}

export interface TrendingBundle {
  hackerNews: TrendingItem[]
  github: TrendingItem[]
  keywords: string[]
  updatedAt: string
}

export interface ChannelStatus {
  channel: string
  status: "ok" | "error" | "missing"
  detail: string
}

export interface ChannelHealth {
  web: ChannelStatus
  search: ChannelStatus
  youtube: ChannelStatus
  github: ChannelStatus
  rss: ChannelStatus
  linkedin: ChannelStatus
  updatedAt: string
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|section|article|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

async function fetchPageDirect(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Direct fetch failed (${res.status})`)
  const text = await res.text()
  const cleaned = htmlToText(text)
  if (cleaned.length < 50) throw new Error("No readable content extracted from page")
  return cleaned.slice(0, 60000)
}

function extractDuckDuckGoResults(html: string): WebResult[] {
  const results: WebResult[] = []
  const blockRe = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi
  const snippetRe = /<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gi
  const blocks = [...html.matchAll(blockRe)]
  const snippets = [...html.matchAll(snippetRe)]

  blocks.forEach((m, i) => {
    let url = m[1]
    const uddgMatch = url.match(/uddg=([^&]+)/)
    if (uddgMatch) url = decodeURIComponent(uddgMatch[1])
    const title = m[2].replace(/<[^>]+>/g, "").trim()
    const snippet = snippets[i] ? snippets[i][1].replace(/<[^>]+>/g, "").trim() : ""
    if (url) results.push({ url, title, snippet })
  })

  return results
}

async function duckDuckGoSearch(query: string): Promise<WebResult[]> {
  const res = await fetch(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    {
      headers: { "User-Agent": BROWSER_UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  )
  if (!res.ok) throw new Error(`DuckDuckGo search failed (${res.status})`)
  const html = await res.text()
  return extractDuckDuckGoResults(html)
}

async function bingSearch(query: string): Promise<WebResult[]> {
  const res = await fetch(
    `https://www.bing.com/search?q=${encodeURIComponent(query)}&format=rss&count=10`,
    {
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  )
  if (!res.ok) throw new Error(`Bing search failed (${res.status})`)
  const xml = await res.text()
  const parser = new Parser()
  const feed = await parser.parseString(xml)
  return (feed.items || [])
    .map((item) => ({
      url: item.link || "",
      title: item.title || "",
      snippet: (item.contentSnippet || item.content || "").slice(0, 300),
    }))
    .filter((r) => r.url)
}

function extractJinaSearchResults(markdown: string): WebResult[] {
  const results: WebResult[] = []
  const blockRe = /^\[(\d+)\] (Title|URL Source|Description): (.*)$/gm
  const blocks: Record<number, Partial<WebResult>> = {}
  let lastIndex = -1

  for (const m of markdown.matchAll(blockRe)) {
    const idx = parseInt(m[1], 10)
    const key = m[2]
    const value = m[3].trim()
    if (idx !== lastIndex) {
      lastIndex = idx
      blocks[idx] = {}
    }
    if (key === "Title") blocks[idx].title = value
    else if (key === "URL Source") blocks[idx].url = value
    else if (key === "Description") blocks[idx].snippet = value.slice(0, 300)
  }

  for (const idx of Object.keys(blocks).sort((a, b) => Number(a) - Number(b))) {
    const b = blocks[Number(idx)]
    if (b.url) results.push({ url: b.url, title: b.title, snippet: b.snippet })
  }

  if (results.length > 0) return results

  // Fallback: markdown link parsing (older Jina response shape)
  const lines = markdown.split("\n")
  for (const line of lines) {
    const urlMatch = line.match(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/)
    if (urlMatch) {
      results.push({ url: urlMatch[2], title: urlMatch[1] })
    }
  }
  return results
}

export async function webFetch(url: string): Promise<{ url: string; content: string }> {
  const errors: string[] = []

  // Primary: Jina Reader (clean markdown)
  try {
    const content = await jinaReaderFetch(url)
    if (content && content.trim().length >= 50) return { url, content }
    errors.push("Jina returned empty content")
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "Jina reader failed")
  }

  // Fallback: direct fetch + HTML→text
  try {
    const content = await fetchPageDirect(url)
    return { url, content }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "Direct fetch failed")
  }

  throw new Error(`Web fetch failed — ${errors.join("; ")}`)
}

export async function webSearch(query: string): Promise<SearchChannel> {
  const jinaP = JINA_API_KEY
    ? jinaSearchFetch(query)
    : Promise.reject(new Error("JINA_API_KEY not configured"))
  const [jina, bing, ddg] = await Promise.allSettled([jinaP, bingSearch(query), duckDuckGoSearch(query)])

  const errors: string[] = []

  if (jina.status === "fulfilled") {
    const results = extractJinaSearchResults(jina.value)
    if (results.length > 0) return { engine: "jina", results: results.slice(0, 10) }
    errors.push("jina: no results")
  } else {
    errors.push(`jina: ${jina.reason instanceof Error ? jina.reason.message : "failed"}`)
  }

  if (bing.status === "fulfilled") {
    const results = bing.value
    if (results.length > 0) return { engine: "bing", results: results.slice(0, 10) }
    errors.push("bing: no results")
  } else {
    errors.push(`bing: ${bing.reason instanceof Error ? bing.reason.message : "failed"}`)
  }

  if (ddg.status === "fulfilled") {
    const results = ddg.value
    if (results.length > 0) return { engine: "duckduckgo", results: results.slice(0, 10) }
    errors.push("duckduckgo: no results")
  } else {
    errors.push(`duckduckgo: ${ddg.reason instanceof Error ? ddg.reason.message : "failed"}`)
  }

  throw new Error(`Search failed — ${errors.join("; ")}`)
}

export async function searchSuggest(query: string): Promise<string[]> {
  const q = query.trim()
  if (q.length < 2) return []

  // Primary: DuckDuckGo autocomplete (no key needed)
  try {
    const res = await fetch(
      `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) }
    )
    if (res.ok) {
      const data: unknown = await res.json()
      const suggestions = extractSuggestions(data, q)
      if (suggestions.length > 0) return suggestions
    }
  } catch {
    // fall through to Google suggest
  }

  // Fallback: Google suggest (firefox client returns simple JSON)
  try {
    const res = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&hl=en&q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) }
    )
    if (res.ok) {
      const data: unknown = await res.json()
      const suggestions = extractSuggestions(data, q)
      if (suggestions.length > 0) return suggestions
    }
  } catch {
    // give up silently
  }

  return []
}

function extractSuggestions(data: unknown, query: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  const walk = (value: unknown) => {
    if (typeof value === "string") {
      if (value.length >= 2 && value.length <= 120 && !seen.has(value)) {
        seen.add(value)
        out.push(value)
      }
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item)
      return
    }
    if (value && typeof value === "object") {
      for (const key of Object.keys(value as Record<string, unknown>)) walk((value as Record<string, unknown>)[key])
    }
  }

  walk(data)
  return out.filter((s) => s.toLowerCase() !== query.toLowerCase()).slice(0, 10)
}

export async function trending(): Promise<TrendingBundle> {
  const [hn, gh] = await Promise.allSettled([
    rssFetch("https://hnrss.org/frontpage"),
    githubTrending(),
  ])

  const hackerNews: TrendingItem[] =
    hn.status === "fulfilled"
      ? hn.value.items.slice(0, 12).map((item) => ({
          title: item.title || "Untitled",
          url: item.link || "https://news.ycombinator.com",
          source: "Hacker News",
        }))
      : []

  const github: TrendingItem[] = gh.status === "fulfilled" ? gh.value : []

  const keywords = extractKeywords([...hackerNews, ...github])

  return {
    hackerNews,
    github,
    keywords,
    updatedAt: new Date().toISOString(),
  }
}

async function githubTrending(): Promise<TrendingItem[]> {
  const markdown = await jinaReaderFetch("https://github.com/trending?since=daily")
  const repoRe = /\b([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\b/g
  const seen = new Set<string>()
  const repos: TrendingItem[] = []
  for (const m of markdown.matchAll(repoRe)) {
    const name = m[1]
    if (seen.has(name)) continue
    seen.add(name)
    repos.push({ title: name, url: `https://github.com/${name}`, source: "GitHub Trending" })
    if (repos.length >= 12) break
  }
  return repos
}

function extractKeywords(items: TrendingItem[]): string[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    const words = item.title
      .replace(/[^A-Za-z0-9\s-]/g, " ")
      .split(/\s+/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 3 && !/^\d+$/.test(w) && !["with", "from", "that", "this", "your", "into", "have", "their", "about", "after", "before", "over", "what", "when", "how", "why", "more", "most", "new", "now", "the", "for", "and", "are", "not", "you", "our", "can", "its", "has", "was", "latest", "today"].includes(w))
    const countsPerItem = new Map<string, number>()
    for (const w of words) countsPerItem.set(w, (countsPerItem.get(w) || 0) + 1)
    for (const [w, c] of countsPerItem) counts.set(w, (counts.get(w) || 0) + c)
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w)
  const pairs: string[] = []
  for (const item of items) {
    const titleWords = item.title
      .replace(/[^A-Za-z0-9\s-]/g, " ")
      .split(/\s+/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 3 && !/^\d+$/.test(w) && top.slice(0, 15).includes(w))
    if (titleWords.length >= 2) {
      const pair = titleWords.slice(0, 3).join(" ")
      if (!pairs.includes(pair)) pairs.push(pair)
    }
  }
  const result = [...top.slice(0, 12), ...pairs.slice(0, 6)]
  return result.slice(0, 18)
}

export async function youtubeInfo(url: string): Promise<Record<string, any>> {
  const res = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) }
  )
  if (!res.ok) throw new Error(`YouTube lookup failed (${res.status})`)
  return res.json()
}

export async function githubSearch(query: string, type: "repositories" | "issues" | "commits" | "users" = "repositories"): Promise<Record<string, any>> {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "Techpivo-Admin",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  if (GITHUB_TOKEN) headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`

  const res = await fetch(
    `https://api.github.com/search/${type}?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`,
    { headers, signal: AbortSignal.timeout(TIMEOUT_MS) }
  )
  if (!res.ok) throw new Error(`GitHub search failed (${res.status})`)
  return res.json()
}

export async function rssFetch(url: string): Promise<{ feedTitle?: string; items: RssItem[] }> {
  const parser = new Parser({
    timeout: TIMEOUT_MS,
    headers: { "User-Agent": "Mozilla/5.0 (Techpivo RSS Reader)" },
  })
  const feed = await parser.parseURL(url)
  return {
    feedTitle: feed.title,
    items: (feed.items || []).slice(0, 25).map((item) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      isoDate: item.isoDate,
      contentSnippet: item.contentSnippet?.slice(0, 400),
      author: item.author,
      categories: item.categories,
    })),
  }
}

export async function linkedinProfile(username: string): Promise<{ username: string; content: string }> {
  const clean = username.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/.*$/, "")
  const content = await jinaReaderFetch(`https://www.linkedin.com/in/${clean}`)
  if (!content || content.trim().length < 80) {
    throw new Error("Profile content unavailable (LinkedIn blocks anonymous reads on some profiles)")
  }
  return { username: clean, content }
}

export async function channelHealth(): Promise<ChannelHealth> {
  const tests = await Promise.allSettled([
    webFetch("https://example.com"),
    webSearch("tech news"),
    youtubeInfo("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    githubSearch("nextjs"),
    rssFetch("https://hnrss.org/frontpage"),
    linkedinProfile("billgates"),
  ])

  const statuses = tests.map((t) => ({
    status: t.status === "fulfilled" ? "ok" as const : "error" as const,
    detail: t.status === "fulfilled" ? "Connected" : (t.reason instanceof Error ? t.reason.message.slice(0, 80) : "Failed"),
  }))

  return {
    web: { channel: "Web Reader", ...statuses[0] },
    search: { channel: "Web Search", ...statuses[1] },
    youtube: { channel: "YouTube", ...statuses[2] },
    github: { channel: "GitHub", ...statuses[3] },
    rss: { channel: "RSS", ...statuses[4] },
    linkedin: { channel: "LinkedIn", ...statuses[5] },
    updatedAt: new Date().toISOString(),
  }
}
