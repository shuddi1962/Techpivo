import { describe, it, expect } from "vitest"
import { buildSemanticPrompt, parseSemanticAnswer } from "@/lib/ai-rewriter"

describe("buildSemanticPrompt", () => {
  const candidates = [
    { title: "A child's mind, a machine's limits", snippet: "The LittleLearner experiment…" },
    { title: "The child-like mind of AI", snippet: "What happens when an LLM never learns…" },
    { title: "Top 10 laptops 2026", snippet: "Comparing the best notebooks…" },
  ]

  it("includes the new topic", () => {
    const prompt = buildSemanticPrompt("LLM trained like a child", undefined, candidates)
    expect(prompt).toContain("LLM trained like a child")
  })

  it("includes every candidate title and snippet with index numbers", () => {
    const prompt = buildSemanticPrompt("LLM trained like a child", undefined, candidates)
    for (let i = 0; i < candidates.length; i++) {
      expect(prompt).toContain(`${i}: ${candidates[i].title}`)
      expect(prompt).toContain(candidates[i].snippet)
    }
  })

  it("instructs an index-or-NONE answer", () => {
    const prompt = buildSemanticPrompt("LLM trained like a child", undefined, candidates)
    expect(prompt).toContain("NONE")
  })

  it("embeds source content only when it is substantial", () => {
    const long = "x".repeat(300)
    const prompt = buildSemanticPrompt("topic", long, candidates)
    expect(prompt).toContain("Source content (excerpt):")
    const short = "tiny"
    const prompt2 = buildSemanticPrompt("topic", short, candidates)
    expect(prompt2).not.toContain("Source content (excerpt):")
  })
})

describe("parseSemanticAnswer", () => {
  it("parses a valid index", () => {
    expect(parseSemanticAnswer("0", 3)).toBe(0)
    expect(parseSemanticAnswer("12", 20)).toBe(12)
  })

  it("returns null for NONE answers (any casing)", () => {
    expect(parseSemanticAnswer("NONE", 3)).toBeNull()
    expect(parseSemanticAnswer("none", 3)).toBeNull()
  })

  it("rejects non-numeric or decorated answers", () => {
    expect(parseSemanticAnswer("3.", 3)).toBeNull()
    expect(parseSemanticAnswer("index 2", 3)).toBeNull()
    expect(parseSemanticAnswer("", 3)).toBeNull()
    expect(parseSemanticAnswer("  ", 3)).toBeNull()
    expect(parseSemanticAnswer("abc", 3)).toBeNull()
  })

  it("rejects out-of-range indexes", () => {
    expect(parseSemanticAnswer("3", 3)).toBeNull()
    expect(parseSemanticAnswer("99", 3)).toBeNull()
    expect(parseSemanticAnswer("-1", 3)).toBeNull()
  })
})