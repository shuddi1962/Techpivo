import Parser from "rss-parser"

const JINA_READER = "https://r.jina.ai"
const JINA_SEARCH = "https://s.jina.ai"
const JINA_API_KEY = process.env.JINA_API_KEY || ""
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ""
const TIMEOUT_MS = 30000

async function jinaFetch(url: string, mode: "reader" | "search"): Promise<string> {
  const headers: Record<string, string> = {
    "Accept": "text/markdown",
    "X-Return-Format": "markdown",
    "X-Timeout": "20",
  }
  if (JINA_API_KEY) headers["Authorization"] = `Bearer ${JINA_API_KEY}`

  const endpoint = mode === "reader"
    ? `${JINA_READER}/${url}`
    : `${JINA_SEARCH}/${url}`

  const res = await fetch(endpoint, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`Jina ${mode === "reader" ? "reader" : "search"} failed (${res.status})`)
  return res.text()
}

export interface WebResult {
  url: string
  title?: string
  published?: string
  snippet?: string
}

export interface SearchChannel {
  engine: "duckduckgo" | "jina"
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

function extractJinaSearchResults(markdown: string): WebResult[] {
  const results: WebResult[] = []
  const lines = markdown.split("\n")
  let currentUrl = ""

  for (const line of lines) {
    const urlMatch = line.match(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/)
    if (urlMatch) {
      results.push({ url: urlMatch[2], title: urlMatch[1] })
      currentUrl = urlMatch[2]
      continue
    }
    const bareMatch = line.match(/^\s*(https?:\/\/[^\s]+)$/)
    if (bareMatch && results.length > 0) {
      const last = results[results.length - 1]
      if (!last.url || last.url.length > 200) {
        last.url = bareMatch[1]
      }
    }
  }
  return results.filter(r => r.url)
}

export async function webFetch(url: string): Promise<{ url: string; content: string }> {
  const target = url.replace(/^https?:\/\//, "").replace(/^\/+/, "")
  const content = await jinaFetch(target, "reader")
  if (!content || content.trim().length < 50) {
    throw new Error("No readable content returned from the URL")
  }
  return { url, content }
}

export async function webSearch(query: string): Promise<SearchChannel> {
  if (JINA_API_KEY) {
    try {
      const markdown = await jinaFetch(encodeURIComponent(query), "search")
      const results = extractJinaSearchResults(markdown)
      if (results.length > 0) return { engine: "jina", results }
    } catch {
      // fall through to DuckDuckGo
    }
  }

  const res = await fetch(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  )
  if (!res.ok) throw new Error(`Search failed (${res.status})`)
  const html = await res.text()
  const results = extractDuckDuckGoResults(html)
  if (results.length === 0) throw new Error("No results found for query")
  return { engine: "duckduckgo", results }
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
  const content = await jinaFetch(`https://www.linkedin.com/in/${clean}`, "reader")
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
