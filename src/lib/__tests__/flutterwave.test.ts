import { describe, expect, it } from "vitest"
import { isFlutterwaveConfigured, isFlutterwaveTestMode, verifyFlutterwaveSignature } from "@/lib/flutterwave"

describe("flutterwave helpers", () => {
  it("detects configured keys (test + live)", () => {
    expect(isFlutterwaveConfigured("FLWSECK_TEST-abc123-X")).toBe(true)
    expect(isFlutterwaveConfigured("FLWSECK-abc123-X")).toBe(true)
    expect(isFlutterwaveConfigured("sk_test_abc")).toBe(false)
    expect(isFlutterwaveConfigured("")).toBe(false)
    expect(isFlutterwaveConfigured(null)).toBe(false)
    expect(isFlutterwaveConfigured(undefined)).toBe(false)
  })

  it("detects test mode vs live", () => {
    expect(isFlutterwaveTestMode("FLWSECK_TEST-abc-X")).toBe(true)
    expect(isFlutterwaveTestMode("FLWSECK-abc-X")).toBe(false)
    expect(isFlutterwaveTestMode(null)).toBe(false)
  })

  it("verifies webhook signatures (constant-time compare)", () => {
    const secret = "flutterwave-secret-hash"
    expect(verifyFlutterwaveSignature(secret, secret)).toBe(true)
    expect(verifyFlutterwaveSignature(secret, secret + "00")).toBe(false)
    expect(verifyFlutterwaveSignature("other", secret)).toBe(false)
    expect(verifyFlutterwaveSignature(null, secret)).toBe(false)
    expect(verifyFlutterwaveSignature(secret, "")).toBe(false)
  })
})
