import type { EditorPostState, SeoChecklistItem } from "@/types/editor"

function countInText(keyword: string, text: string): number {
  if (!keyword || !text) return 0
  const re = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")
  return (text.match(re) || []).length
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
}

export function getSeoChecklist(keyword: string, state: EditorPostState): SeoChecklistItem[] {
  const plainContent = stripHtml(state.content)
  const wordCount = plainContent.split(/\s+/).filter(Boolean).length
  const keywordDensity = wordCount > 0 ? ((countInText(keyword, plainContent) / wordCount) * 100) : 0
  const titleLength = state.seo_title?.length || state.title.length
  const descLength = state.seo_description?.length || state.excerpt?.length || 0
  const firstParagraph = plainContent.split("\n").find(p => p.trim().length > 50) || ""
  const h2Count = (state.content.match(/<h2[\s>]/gi) || []).length
  const imageCount = (state.content.match(/<img[\s>]/gi) || []).length
  const linkCount = (state.content.match(/<a[\s>]/gi) || []).length
  const paragraphs = plainContent.split("\n").filter(p => p.trim().length > 0)
  const longParagraphs = paragraphs.filter(p => p.split(/\s+/).length > 150).length

  return [
    {
      id: "keyword_in_title",
      label: "Focus keyword appears in SEO title",
      weight: 10,
      check: () => countInText(keyword, state.seo_title || state.title) > 0,
    },
    {
      id: "keyword_in_first_para",
      label: "Focus keyword appears in first paragraph",
      weight: 10,
      check: () => countInText(keyword, firstParagraph) > 0,
    },
    {
      id: "keyword_in_headings",
      label: "Focus keyword appears in H2 headings",
      weight: 5,
      check: () => {
        const headings = state.content.match(/<h2[^>]*>([^<]+)<\/h2>/gi) || []
        return headings.some(h => countInText(keyword, h) > 0)
      },
    },
    {
      id: "title_length",
      label: "Title length between 40-60 characters",
      weight: 10,
      check: () => titleLength >= 40 && titleLength <= 60,
    },
    {
      id: "meta_desc_length",
      label: "Meta description between 120-160 characters",
      weight: 10,
      check: () => descLength >= 120 && descLength <= 160,
    },
    {
      id: "content_length",
      label: "Content length > 600 words",
      weight: 10,
      check: () => wordCount > 600,
    },
    {
      id: "images",
      label: "Content has at least one image",
      weight: 5,
      check: () => imageCount > 0,
    },
    {
      id: "internal_links",
      label: "Content has internal links",
      weight: 5,
      check: () => linkCount > 0,
    },
    {
      id: "keyword_in_slug",
      label: "Focus keyword appears in slug",
      weight: 5,
      check: () => countInText(keyword, state.slug) > 0,
    },
    {
      id: "h2_headings",
      label: "Content has H2 subheadings",
      weight: 5,
      check: () => h2Count >= 2,
    },
    {
      id: "paragraph_length",
      label: "No paragraphs over 150 words",
      weight: 5,
      check: () => longParagraphs === 0,
    },
    {
      id: "keyword_density",
      label: "Keyword density between 0.5-3%",
      weight: 5,
      check: () => keywordDensity >= 0.5 && keywordDensity <= 3,
    },
    {
      id: "featured_image_set",
      label: "Featured image is set",
      weight: 5,
      check: () => !!state.featured_image,
    },
    {
      id: "excerpt_set",
      label: "Excerpt / meta description is set",
      weight: 5,
      check: () => (state.seo_description || state.excerpt)?.length > 50,
    },
    {
      id: "schema_markup",
      label: "Schema markup type selected",
      weight: 5,
      check: () => !!state.schema_type,
    },
  ]
}

export function calculateSeoScore(keyword: string, state: EditorPostState): { score: number; items: SeoChecklistItem[] } {
  const items = getSeoChecklist(keyword, state)
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  const earnedWeight = items.filter(item => item.check(state)).reduce((sum, item) => sum + item.weight, 0)
  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0
  return { score, items }
}

export function calculateReadability(content: string): { score: number; flesch: number } {
  const plain = stripHtml(content)
  const words = plain.split(/\s+/).filter(Boolean)
  const sentences = plain.split(/[.!?]+/).filter(Boolean)
  const syllables = words.reduce((count, word) => {
    const w = word.toLowerCase().replace(/[^a-z]/g, "")
    if (w.length <= 3) return count + 1
    let s = 0
    const vowels = "aeiouy"
    let prevVowel = false
    for (let i = 0; i < w.length; i++) {
      const isVowel = vowels.includes(w[i])
      if (isVowel && !prevVowel) s++
      prevVowel = isVowel
    }
    if (w.endsWith("e")) s--
    if (s === 0) s = 1
    return count + s
  }, 0)

  const wordCount = words.length
  const sentenceCount = Math.max(sentences.length, 1)
  const syllableCount = Math.max(syllables, 1)

  const avgWordsPerSentence = wordCount / sentenceCount
  const avgSyllablesPerWord = syllableCount / wordCount

  const flesch = Math.max(0, Math.min(100, 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord))
  let score = 0
  if (flesch >= 90) score = 100
  else if (flesch >= 80) score = 90
  else if (flesch >= 70) score = 75
  else if (flesch >= 60) score = 60
  else if (flesch >= 50) score = 45
  else if (flesch >= 30) score = 25
  else score = 10

  return { score: Math.round(score), flesch: Math.round(flesch * 10) / 10 }
}

export function generateSerpPreview(state: EditorPostState) {
  const title = state.seo_title || state.title
  const desc = state.seo_description || state.excerpt || ""
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.techpivo.com"
  return {
    title: title.slice(0, 70),
    url: `${siteUrl}/${state.slug}`,
    description: desc.slice(0, 160),
  }
}
