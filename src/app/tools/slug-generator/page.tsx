"use client"

import { useState } from "react"
import Link from "next/link"
import { NewsletterStrip } from "@/components/home/NewsletterStrip"

export default function SlugGeneratorPage() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [copied, setCopied] = useState(false)

  const toSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  const generate = () => {
    setOutput(toSlug(input))
    setCopied(false)
  }

  const copy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
      <nav style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>
        <Link href="/tools" style={{ color: "var(--accent)", textDecoration: "none" }}>Tools</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span>Slug Generator</span>
      </nav>

      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Slug Generator</h1>
      <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 32 }}>Generate SEO-friendly URL slugs from any text.</p>

      <div style={{ padding: 24, borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--muted)" }}>Enter your title or text</label>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate() } }}
          placeholder='e.g. "Top 10 AI Tools for Developers in 2026"'
          style={{ width: "100%", height: 100, padding: 14, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, resize: "vertical", fontFamily: "inherit", marginBottom: 16 }}
        />

        <button onClick={generate} style={{ width: "100%", padding: "12px 24px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 16 }}>
          Generate Slug
        </button>

        {output && (
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--muted)" }}>Result</label>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, padding: "14px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontFamily: "monospace", fontSize: 14 }}>
                {output}
              </div>
              <button onClick={copy} style={{ padding: "14px 20px", borderRadius: 8, background: copied ? "#22C55E" : "var(--card)", color: copied ? "#fff" : "var(--text)", border: "1px solid var(--border)", fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
              Full URL: <span style={{ fontFamily: "monospace" }}>techpivo.com/{output}</span>
            </div>
          </div>
        )}
      </div>
      <NewsletterStrip />
    </div>
  )
}
