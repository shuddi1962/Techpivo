import { describe, it, expect } from "vitest"
import { escapeInnerQuotes, repairJson } from "@/lib/ai-rewriter"

describe("escapeInnerQuotes", () => {
  it("escapes unescaped HTML attribute quotes inside string values", () => {
    const input = '{"content":"<p><img src=\"x.jpg\" alt=\"chart\">hello</p>"}'
    const fixed = escapeInnerQuotes(input)
    expect(() => JSON.parse(fixed)).not.toThrow()
    const parsed = JSON.parse(fixed)
    expect(parsed.content).toBe('<p><img src="x.jpg" alt="chart">hello</p>')
  })

  it("escapes mid-sentence quotes inside a value", () => {
    const input = '{"content":"He said "hello" to me"}'
    const fixed = escapeInnerQuotes(input)
    const parsed = JSON.parse(fixed)
    expect(parsed.content).toBe('He said "hello" to me')
  })

  it("leaves well-formed JSON completely untouched", () => {
    const input = '{"headline":"A \\"quoted\\" title","content":"<p>Body</p>","tags":["a","b"]}'
    expect(escapeInnerQuotes(input)).toBe(input)
    expect(JSON.parse(escapeInnerQuotes(input)).headline).toBe('A "quoted" title')
  })

  it("does not close a string early when a quote is followed by content", () => {
    const input = '{"content":"<a href=\"/x\">link</a>"}'
    const fixed = escapeInnerQuotes(input)
    const parsed = JSON.parse(fixed)
    expect(parsed.content).toBe('<a href="/x">link</a>')
  })
})

describe("repairJson", () => {
  it("strips comments without touching URLs inside strings", () => {
    const input = '{"content":"see https://example.com/x // keep",// comment\n"trailing": true,}'
    const fixed = repairJson(input)
    expect(fixed).toContain('https://example.com/x // keep')
    expect(() => JSON.parse(fixed)).not.toThrow()
    expect(JSON.parse(fixed).trailing).toBe(true)
  })

  it("removes trailing commas and converts single-quoted keys", () => {
    const input = "{'headline':'Test', 'content':'Body',}"
    const fixed = repairJson(input)
    const parsed = JSON.parse(fixed)
    expect(parsed.headline).toBe("Test")
    expect(parsed.content).toBe("Body")
  })

  it("escapes raw newlines and tabs inside strings", () => {
    const input = '{"content":"line1\nline2\tend"}'
    const fixed = repairJson(input)
    const parsed = JSON.parse(fixed)
    expect(parsed.content).toBe("line1\nline2\tend")
  })
})

describe("full repair pipeline", () => {
  it("recovers a Gemini-style blob with raw newlines, unescaped quotes and a trailing comma", () => {
    const broken = `{
  "headline": "AI chips boom",
  "content": "<p>Nvidia's <img src="chip.jpg" alt="chip"> is hot</p>",
  "faq": [{"question": "Why?", "answer": "Because chips."}],
  "keyPoints": ["Point one here", "Point two here"],
  "quickBrief": ["Brief"],
  "tags": ["ai"],
  "suggestedCategory": "tech-news",
  "qualityScore": 80,
}`
    const repaired = repairJson(broken)
    const fixed = escapeInnerQuotes(repaired)
    expect(() => JSON.parse(fixed)).not.toThrow()
    const parsed = JSON.parse(fixed)
    expect(parsed.headline).toBe("AI chips boom")
    expect(parsed.content).toContain('<img src="chip.jpg"')
  })
})