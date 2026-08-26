import { describe, it, expect } from "vitest"
import {
  GEMINI_MODEL_DEFAULT,
  GEMINI_MODEL_OPTIONS,
  normalizeGeminiModel,
  getGeminiModel,
  isAllowedGeminiModel,
} from "@/lib/gemini-model"

describe("normalizeGeminiModel", () => {
  it("accepts a plain model id", () => {
    expect(normalizeGeminiModel("gemini-2.5-flash")).toBe("gemini-2.5-flash")
  })

  it("trims surrounding whitespace", () => {
    expect(normalizeGeminiModel("  gemini-2.5-pro  ")).toBe("gemini-2.5-pro")
  })

  it("rejects URL/path injection attempts", () => {
    expect(normalizeGeminiModel("https://evil.example")).toBeNull()
    expect(normalizeGeminiModel("../etc/passwd")).toBeNull()
    expect(normalizeGeminiModel("gemini-2.5-flash:generateContent?key=x")).toBeNull()
  })

  it("rejects non-strings", () => {
    expect(normalizeGeminiModel(42)).toBeNull()
    expect(normalizeGeminiModel(null)).toBeNull()
    expect(normalizeGeminiModel(undefined)).toBeNull()
  })

  it("rejects empty and over-long values", () => {
    expect(normalizeGeminiModel("")).toBeNull()
    expect(normalizeGeminiModel("   ")).toBeNull()
    expect(normalizeGeminiModel("a".repeat(65))).toBeNull()
  })
})

describe("getGeminiModel", () => {
  it("uses the env var when valid", () => {
    expect(getGeminiModel({ GEMINI_MODEL: "gemini-2.5-pro" })).toBe("gemini-2.5-pro")
  })

  it("falls back to the default when env is missing or invalid", () => {
    expect(getGeminiModel({})).toBe(GEMINI_MODEL_DEFAULT)
    expect(getGeminiModel({ GEMINI_MODEL: "not a valid id" })).toBe(GEMINI_MODEL_DEFAULT)
  })
})

describe("isAllowedGeminiModel", () => {
  it("allows models in the options list", () => {
    for (const opt of GEMINI_MODEL_OPTIONS) {
      expect(isAllowedGeminiModel(opt.value)).toBe(true)
    }
  })

  it("rejects models not in the options list", () => {
    expect(isAllowedGeminiModel("gemini-2.5-flash")).toBe(false)
    expect(isAllowedGeminiModel("gemini-2.5-pro")).toBe(false)
    expect(isAllowedGeminiModel("gpt-4o")).toBe(false)
  })
})