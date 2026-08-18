import xss, { IFilterXSSOptions } from 'xss'

const xssOptions: IFilterXSSOptions = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
}

export const sanitize = (input: string): string => {
  if (!input || typeof input !== 'string') return ''
  return xss(input.trim(), xssOptions)
}

export const sanitizeObject = <T extends Record<string, unknown>>(obj: T): T => {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitize(value)
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string' ? sanitize(item) : item
      )
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized as T
}

export const sanitizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') return ''
  return email.trim().toLowerCase()
}

/**
 * Sanitize rich article HTML before rendering with dangerouslySetInnerHTML.
 * Permissive-but-safe: allows editorial content (prose, figures, tables, code,
 * YouTube embeds) while stripping scripts, event handlers, and dangerous URLs.
 */
const RICH_TAG_ALLOWLIST: Record<string, string[]> = {
  a: ["href", "title", "target", "rel"],
  abbr: ["title"],
  img: ["src", "alt", "width", "height", "loading", "class"],
  figure: ["class"], figcaption: ["class"],
  iframe: ["src", "width", "height", "title", "loading", "allow", "allowfullscreen", "frameborder", "class"],
  div: ["class", "style"], span: ["class", "style"],
  p: ["class"],
  h1: ["id"], h2: ["id"], h3: ["id"], h4: ["id"], h5: ["id"], h6: ["id"],
  ul: ["class"], ol: ["class"], li: ["class"],
  blockquote: ["cite", "class"],
  pre: ["class"], code: ["class"],
  table: ["class"], thead: [], tbody: [], tr: [], th: ["colspan", "rowspan"], td: ["colspan", "rowspan"],
  hr: [], br: [], strong: [], em: [], b: [], i: [], u: [], s: [], mark: ["class"],
  sup: [], sub: [], kbd: [], small: [], time: ["datetime"],
  details: [], summary: [],
}

const YOUTUBE_HOSTS = /^(https?:)?\/\/(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)(\/|$)/i

const richOptions: IFilterXSSOptions = {
  whiteList: RICH_TAG_ALLOWLIST,
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style", "object", "embed", "form"],
  safeAttrValue: (tag, name, value) => {
    if (name === "href" || name === "src") {
      const v = String(value).trim()
      if (/^\s*javascript:/i.test(v) || /^vbscript:/i.test(v)) return ""
      if (name === "src" && tag === "iframe" && !YOUTUBE_HOSTS.test(v)) return ""
      if (name === "src" && /^data:/i.test(v) && tag !== "img") return ""
    }
    if (name === "style" && /expression\s*\(|url\s*\(|javascript:/i.test(String(value))) return ""
    return String(value)
  },
}

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") return ""
  return xss(html, richOptions)
}
