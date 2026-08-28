import { describe, it, expect } from "vitest"
import { escapeInnerQuotes, repairJson, validate } from "@/lib/ai-rewriter"

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

  it("keeps prose quote-followed-by-comma intact (the \"AI\", model)", () => {
    const input = '{"content":"the "AI", model is great"}'
    const fixed = escapeInnerQuotes(input)
    expect(() => JSON.parse(fixed)).not.toThrow()
    expect(JSON.parse(fixed).content).toBe('the "AI", model is great')
  })

  it("keeps prose quote-followed-by-colon intact (the \"term\": is used)", () => {
    const input = '{"content":"the "term": is used"}'
    const fixed = escapeInnerQuotes(input)
    expect(() => JSON.parse(fixed)).not.toThrow()
    expect(JSON.parse(fixed).content).toBe('the "term": is used')
  })

  it("keeps a top-level JSON array untouched (spaces preserved)", () => {
    const input = '["hi", "bye"]'
    expect(escapeInnerQuotes(input)).toBe(input)
    expect(JSON.parse(escapeInnerQuotes(input))).toEqual(["hi", "bye"])
  })

  it("escapes raw control characters inside strings (newlines, tabs, low bytes)", () => {
    const input = '{"content":"line1\nline2\tend\u0001"}'
    const fixed = escapeInnerQuotes(input)
    expect(() => JSON.parse(fixed)).not.toThrow()
    expect(JSON.parse(fixed).content).toBe("line1\nline2\tend\u0001")
  })
})

describe("validate", () => {
  it("recovers a full article blob whose prose contains unescaped quotes (the \"AI\", model / the \"term\": is used)", () => {
    const content = `<p>When I tested the "AI", model the results surprised me. The "term": is used loosely, and the "AI" kept hallucinating, so I switched it off.</p><h2>How it works</h2><p>This section explains the model. The "AI", model is great, and the "term": is used often.</p>`
    const raw = `{"headline":"Gemini JSON repair regression test","content":"${content}","answerCapsule":"A regression test article.","seoTitle":"Gemini JSON Repair Regression Test","seoDescription":"Testing the JSON repair pipeline end to end.","seoKeywords":["gemini","json"],"secondaryKeywords":["repair"],"tags":["ai"],"keyPoints":["This is a longer key point about the repair pipeline","This is another key point that must exceed ten characters"],"quickBrief":["The pipeline repairs broken JSON"],"namedEntities":["Gemini"],"faq":[{"question":"Why does this matter?","answer":"Because unescaped quotes used to break article generation."}],"sources":[{"url":"https://example.com/doc","title":"Example","type":"official"}],"qualityScore":85,"isBreaking":false,"suggestedCategory":"tech-news"}`
    const result = validate(raw, "openrouter")
    expect(result.reason).toBe("ok")
    expect(result.article?.content).toContain('the "AI", model')
    expect(result.article?.content).toContain('the "term": is used')
  })

  it("reports the enriched reason when even quote-escape cannot repair the blob", () => {
    const raw = '{"content":"' + "x".repeat(150) + '" broken}'
    const result = validate(raw, "openrouter")
    expect(result.article).toBeNull()
    expect(result.reason.startsWith("json_parse_fail_after_object_extract:")).toBe(true)
  })

  it("enriches the parse-fail reason with the underlying JSON error message", () => {
    const raw = '{"content":"' + "z".repeat(150) + '" broken}'
    const result = validate(raw, "openrouter")
    expect(result.article).toBeNull()
    expect(result.reason).toMatch(/^json_parse_fail_after_object_extract:\d+:.+:.+$/)
    expect(result.reason).toContain("JSON at position")
  })

  it("returns no_json_object_found when the blob never closes", () => {
    const raw = '{"content":"' + "w".repeat(150)
    const result = validate(raw, "openrouter")
    expect(result.reason).toBe("no_json_object_found")
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