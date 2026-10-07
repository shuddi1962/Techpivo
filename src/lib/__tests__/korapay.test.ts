import { describe, expect, it } from "vitest"
import { createHmac } from "crypto"
import { isKorapayConfigured, verifyKorapaySignature } from "@/lib/korapay"

describe("korapay helpers", () => {
  it("treats only sk_ secrets as configured", () => {
    expect(isKorapayConfigured("sk_test_abc")).toBe(true)
    expect(isKorapayConfigured("sk_live_abc")).toBe(true)
    expect(isKorapayConfigured("pk_test_abc")).toBe(false)
    expect(isKorapayConfigured("")).toBe(false)
    expect(isKorapayConfigured(null)).toBe(false)
    expect(isKorapayConfigured(undefined)).toBe(false)
  })

  it("accepts a genuine webhook signature and rejects forgeries", () => {
    const secret = "sk_test_signing_secret"
    const data = { reference: "TPM-ABC123", amount: 5000, status: "success", currency: "NGN" }
    const good = createHmac("sha256", secret).update(JSON.stringify(data)).digest("hex")
    expect(verifyKorapaySignature(data, good, secret)).toBe(true)
    expect(verifyKorapaySignature(data, good + "00", secret)).toBe(false)
    expect(verifyKorapaySignature({ ...data, amount: 9999 }, good, secret)).toBe(false)
    expect(verifyKorapaySignature(data, null, secret)).toBe(false)
  })
})
