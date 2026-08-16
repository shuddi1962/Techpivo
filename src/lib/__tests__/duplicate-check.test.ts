import { describe, it, expect } from "vitest"
import { titleOverlaps } from "@/lib/duplicate-check"

describe("titleOverlaps", () => {
  it("detects an exact match", () => {
    expect(titleOverlaps("best laptops 2026", "Best Laptops 2026")).toBe(true)
  })

  it("detects the topic as a substring of an existing title", () => {
    expect(titleOverlaps("chatgpt vs gemini", "ChatGPT vs Gemini: which AI assistant wins?")).toBe(true)
  })

  it("detects same-topic-different-title via significant word overlap", () => {
    expect(titleOverlaps("top 10 python web frameworks", "10 Best Python Frameworks for Web Development")).toBe(true)
  })

  it("does not flag clearly different topics", () => {
    expect(titleOverlaps("best budget android phones", "how to reset your windows password")).toBe(false)
  })

  it("does not flag on insignificant (short) words alone", () => {
    expect(titleOverlaps("ai", "Everything about technology today")).toBe(false)
    expect(titleOverlaps("how to code", "Tips for designers")).toBe(false)
  })

  it("handles empty or partial input without throwing", () => {
    expect(titleOverlaps("", "Anything")).toBe(false)
    expect(titleOverlaps("   ", "Anything")).toBe(false)
    expect(titleOverlaps("valid topic", "")).toBe(false)
  })

  it("is not fooled by a single shared common word", () => {
    expect(titleOverlaps("best phones under 500", "why phones are great gadgets")).toBe(false)
  })
})