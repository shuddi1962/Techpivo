import { describe, it, expect } from "vitest"
import {
  keywordSlug,
  keywordTitle,
  insertKeywordSentence,
  keywordFirstHeading,
  addInternalLinks,
  splitLongSentences,
  ensureKeywordDensity,
  improveReadability,
} from "@/lib/editor-autofix"
import { calculateReadability } from "@/lib/seo-utils"

describe("keywordSlug", () => {
  it("prepends the keyword when missing", () => {
    expect(keywordSlug("openai gpt", "gpt-releases-new-model-2026")).toBe(
      "openai-gpt-gpt-releases-new-model-2026"
    )
  })
  it("keeps a slug that already contains the keyword", () => {
    expect(keywordSlug("openai gpt", "openai-gpt-guide")).toBe("openai-gpt-guide")
  })
  it("caps at 120 chars", () => {
    const out = keywordSlug("very long keyword phrase", "a".repeat(200))
    expect(out.length).toBeLessThanOrEqual(120)
  })
  it("handles empty keyword", () => {
    expect(keywordSlug("", "some-slug")).toBe("some-slug")
  })
})

describe("keywordTitle", () => {
  it("prepends the keyword", () => {
    expect(keywordTitle("ai tools", "Best Free Software in 2026")).toBe("ai tools | Best Free Software in 2026…")
  })
  it("keeps titles that already contain the keyword", () => {
    expect(keywordTitle("ai tools", "Best AI Tools for Developers")).toBe("Best AI Tools for Developers")
  })
  it("never exceeds 60 chars", () => {
    const long = "A very long SEO title that keeps going on and on and on and on and on"
    expect(keywordTitle("focus word", long).length).toBeLessThanOrEqual(60)
  })
})

describe("insertKeywordSentence", () => {
  it("adds a keyword mention to the first long paragraph", () => {
    const html = "<h2>Heading</h2><p>Some reasonably long paragraph text here.</p><p>Short.</p>"
    const out = insertKeywordSentence(html, "ai tools")
    expect(out).toContain("This guide covers ai tools in detail.")
    expect(out).not.toContain("<p>Short.</p>This")
  })
  it("does not duplicate when the keyword is already there", () => {
    const html = "<p>This guide covers ai tools in detail right here.</p>"
    expect(insertKeywordSentence(html, "ai tools")).toBe(html)
  })
})

describe("keywordFirstHeading", () => {
  it("prepends the keyword to the first H2", () => {
    expect(keywordFirstHeading("<h2>What Is This Thing</h2>", "automation")).toBe(
      "<h2>automation: What Is This Thing</h2>"
    )
  })
  it("leaves headings that already contain the keyword", () => {
    expect(keywordFirstHeading("<h2>Automation Basics</h2>", "automation")).toBe("<h2>Automation Basics</h2>")
  })
})

describe("addInternalLinks", () => {
  it("wraps the first occurrence of a related title phrase", () => {
    const html = "<p>This article explains prompt engineering and how to use it.</p>"
    const { html: out, added } = addInternalLinks(html, [{ title: "Prompt Engineering Guide", slug: "prompt-guide" }])
    expect(added).toBe(1)
    expect(out).toContain('<a href="/prompt-guide">Prompt Engineering Guide</a>')
  })
  it("falls back to a natural sentence when the phrase never appears", () => {
    const html = "<p>Completely unrelated paragraph text that is long enough here.</p>"
    const { html: out, added } = addInternalLinks(html, [{ title: "Python Basics", slug: "python-basics" }])
    expect(added).toBe(1)
    expect(out).toContain('You can also read <a href="/python-basics">Python Basics</a>')
  })
  it("never nests a link inside an existing link", () => {
    const html = '<p>See <a href="/old">Prompt Engineering Guide</a> for everything you need to know about prompt writing and much more.</p>'
    const { html: out, added } = addInternalLinks(html, [{ title: "Prompt Engineering Guide", slug: "prompt-guide" }])
    expect(added).toBe(1)
    expect(out).toContain('<a href="/old">Prompt Engineering Guide</a>')
    expect(out).toContain('You can also read <a href="/prompt-guide">Prompt Engineering Guide</a>')
  })
})

describe("splitLongSentences", () => {
  it("splits a long sentence at a clause boundary", () => {
    const long = "Artificial intelligence is transforming the way we build software, and it changes how developers approach problem solving every single day across every single industry in the entire world."
    const out = splitLongSentences(`<p>${long}</p>`)
    const sentences = out.replace(/<[^>]*>/g, "").split(/[.!?]+/).filter(Boolean)
    expect(sentences.length).toBeGreaterThan(1)
  })
  it("leaves short sentences untouched", () => {
    const html = "<p>This is short. So is this one!</p>"
    expect(splitLongSentences(html)).toBe(html)
  })
  it("does not touch markdown-ish runs (links, bold, headings)", () => {
    const md = "## A Heading\n\nSome **bold** text and a [link](https://example.com) inside."
    expect(splitLongSentences(md)).toBe(md)
  })
  it("preserves HTML tags exactly", () => {
    const html = "<p>Artificial intelligence is transforming the way we build software and it changes how developers approach problem solving every single day.</p>"
    const out = splitLongSentences(html)
    expect(out.startsWith("<p>")).toBe(true)
    expect(out.endsWith("</p>")).toBe(true)
  })
  it("honors a custom maxWords cap", () => {
    const html = "<p>The quick brown fox jumps over the lazy dog near the riverbank while the sun sets slowly behind the mountains in the distance today.</p>"
    const loose = splitLongSentences(html, 24)
    const tight = splitLongSentences(html, 12)
    expect(tight.replace(/<[^>]*>/g, "").split(/[.!?]+/).filter(Boolean).length)
      .toBeGreaterThanOrEqual(loose.replace(/<[^>]*>/g, "").split(/[.!?]+/).filter(Boolean).length)
  })
})

describe("ensureKeywordDensity", () => {
  it("adds keyword mentions until the density threshold is reached", () => {
    const html = "<p>This article talks about ai writing tools for editors and publishers around the world who create content every day online.</p>"
    const out = ensureKeywordDensity(html, "ai writing tools", 0.5)
    const text = out.replace(/<[^>]*>/g, " ")
    const words = text.split(/\s+/).filter(Boolean).length
    const mentions = (text.match(/ai writing tools/gi) || []).length
    expect(mentions / words * 100).toBeGreaterThanOrEqual(0.5)
  })
  it("leaves content alone when density is already met", () => {
    const html = "<p>ai writing tools are great. ai writing tools save time. ai writing tools help editors. ai writing tools work well for everyone using them online today.</p>"
    expect(ensureKeywordDensity(html, "ai writing tools")).toBe(html)
  })
  it("preserves HTML structure", () => {
    const html = "<h2>Heading</h2><p>Body paragraph about ai writing tools and how they help publishers write faster with better results every day.</p>"
    const out = ensureKeywordDensity(html, "ai writing tools")
    expect(out.startsWith("<h2>")).toBe(true)
    expect(out.includes("</p>")).toBe(true)
  })
})

describe("improveReadability", () => {
  it("raises the Flesch score by splitting long sentences", () => {
    const html = "<p>" +
      "Artificial intelligence is transforming the way we build software products, and it fundamentally changes how developers approach problem solving every single day across every single industry in the entire world." +
      " Machine learning models are becoming increasingly sophisticated and they require enormous amounts of computing power to train effectively." +
      " Companies around the globe are investing heavily in these technologies because they believe the potential returns are truly enormous." +
      "</p>"
    const before = calculateReadability(html).flesch
    const out = improveReadability(html)
    const after = calculateReadability(out).flesch
    expect(after).toBeGreaterThanOrEqual(before)
  })
  it("returns content unchanged when it is already readable", () => {
    const html = "<p>This is fine. It reads well. Short sentences work.</p>"
    expect(improveReadability(html)).toBe(html)
  })
})