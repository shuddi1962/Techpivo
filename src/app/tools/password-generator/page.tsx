"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { NewsletterStrip } from "@/components/home/NewsletterStrip"
import { JsonLd } from "@/components/ui/jsonld"
import { SITE_URL } from "@/lib/constants"

export default function PasswordGeneratorPage() {
  const [length, setLength] = useState(16)
  const [useUppercase, setUseUppercase] = useState(true)
  const [useLowercase, setUseLowercase] = useState(true)
  const [useNumbers, setUseNumbers] = useState(true)
  const [useSymbols, setUseSymbols] = useState(true)
  const [password, setPassword] = useState("")
  const [copied, setCopied] = useState(false)

  const generate = useCallback(() => {
    let chars = ""
    if (useUppercase) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    if (useLowercase) chars += "abcdefghijklmnopqrstuvwxyz"
    if (useNumbers) chars += "0123456789"
    if (useSymbols) chars += "!@#$%^&*()_+-=[]{}|;:,.<>?"
    if (!chars) chars = "abcdefghijklmnopqrstuvwxyz"

    let result = ""
    const array = new Uint32Array(length)
    crypto.getRandomValues(array)
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length]
    }
    setPassword(result)
    setCopied(false)
  }, [length, useUppercase, useLowercase, useNumbers, useSymbols])

  const copy = () => {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getStrength = () => {
    if (length < 8) return { label: "Weak", color: "#EF4444", width: "25%" }
    if (length < 12) return { label: "Fair", color: "#F59E0B", width: "50%" }
    if (length < 16) return { label: "Good", color: "#3B82F6", width: "75%" }
    return { label: "Strong", color: "#22C55E", width: "100%" }
  }
  const strength = getStrength()

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Password Generator",
        description: "Generate secure random passwords with customizable options",
        url: `${SITE_URL}/tools/password-generator`,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      }} />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
      <nav style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>
        <Link href="/tools" style={{ color: "var(--accent)", textDecoration: "none" }}>Tools</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span>Password Generator</span>
      </nav>

      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Password Generator</h1>
      <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 32 }}>Generate secure random passwords. All generation happens in your browser — nothing is stored.</p>

      <div style={{ padding: 24, borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
          <input
            value={password}
            readOnly
            placeholder="Click Generate to create a password"
            style={{ flex: 1, padding: "14px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontFamily: "monospace", fontSize: 16, letterSpacing: 1 }}
          />
          <button onClick={copy} disabled={!password} style={{ padding: "14px 20px", borderRadius: 8, background: copied ? "#22C55E" : "var(--card)", color: copied ? "#fff" : "var(--text)", border: "1px solid var(--border)", fontWeight: 600, fontSize: 14, cursor: password ? "pointer" : "not-allowed", transition: "all 0.2s" }}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Length: {length}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: strength.color }}>{strength.label}</span>
          </div>
          <input
            type="range"
            min={4}
            max={64}
            value={length}
            onChange={e => setLength(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--accent)" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)" }}>
            <span>4</span><span>64</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Uppercase (A-Z)", checked: useUppercase, onChange: setUseUppercase },
            { label: "Lowercase (a-z)", checked: useLowercase, onChange: setUseLowercase },
            { label: "Numbers (0-9)", checked: useNumbers, onChange: setUseNumbers },
            { label: "Symbols (!@#$...)", checked: useSymbols, onChange: setUseSymbols },
          ].map(opt => (
            <label key={opt.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text)", cursor: "pointer" }}>
              <input type="checkbox" checked={opt.checked} onChange={e => opt.onChange(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
              {opt.label}
            </label>
          ))}
        </div>

        <button onClick={generate} style={{ width: "100%", padding: "14px 24px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
          Generate Password
        </button>
      </div>
      <NewsletterStrip />
    </div>
    </>
  )
}
