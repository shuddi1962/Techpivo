"use client"

import { useState } from "react"
import Link from "next/link"
import { TopBar } from "@/components/layout/TopBar"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { NewsletterStrip } from "@/components/home/NewsletterStrip"

export default function JsonFormatterPage() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const [indent, setIndent] = useState(2)

  const format = () => {
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed, null, indent))
      setError("")
    } catch (e: any) {
      setError(e.message)
      setOutput("")
    }
  }

  const minify = () => {
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed))
      setError("")
    } catch (e: any) {
      setError(e.message)
      setOutput("")
    }
  }

  const copy = () => {
    navigator.clipboard.writeText(output)
  }

  return (
    <div>
      <TopBar />
      <Header />
      <main style={{ minHeight: "60vh" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }}>
          <nav style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>
            <Link href="/tools" style={{ color: "var(--accent)", textDecoration: "none" }}>Tools</Link>
            <span style={{ margin: "0 8px" }}>/</span>
            <span>JSON Formatter</span>
          </nav>

          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>JSON Formatter</h1>
          <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>Format, validate, and beautify JSON data instantly.</p>

          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={format} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Format</button>
            <button onClick={minify} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Minify</button>
            <button onClick={copy} disabled={!output} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", fontWeight: 600, fontSize: 14, cursor: output ? "pointer" : "not-allowed", opacity: output ? 1 : 0.5 }}>Copy</button>
            <button onClick={() => { setInput(""); setOutput(""); setError("") }} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Clear</button>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
              <label style={{ fontSize: 13, color: "var(--muted)" }}>Indent:</label>
              <select value={indent} onChange={e => setIndent(Number(e.target.value))} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 13 }}>
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
                <option value={8}>8 spaces</option>
              </select>
            </div>
          </div>

          {error && <div style={{ padding: "10px 16px", borderRadius: 8, background: "#FEF2F2", color: "#DC2626", fontSize: 13, marginBottom: 16, border: "1px solid #FECACA" }}>{error}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--muted)" }}>Input</label>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder='Paste JSON here, e.g. {"name": "Techpivo", "version": 1}'
                style={{ width: "100%", height: 400, padding: 16, borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontFamily: "monospace", fontSize: 13, resize: "vertical" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--muted)" }}>Output</label>
              <textarea
                value={output}
                readOnly
                placeholder="Formatted JSON will appear here..."
                style={{ width: "100%", height: 400, padding: 16, borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontFamily: "monospace", fontSize: 13, resize: "vertical" }}
              />
            </div>
          </div>
        </div>
      </main>
      <NewsletterStrip />
      <Footer categories={[]} recentPosts={[]} />
    </div>
  )
}
