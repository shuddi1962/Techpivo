"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { NewsletterStrip } from "@/components/home/NewsletterStrip"
import { JsonLd } from "@/components/ui/jsonld"
import { SITE_URL } from "@/lib/constants"

export default function WordCounterPage() {
  const [text, setText] = useState("")

  const stats = useMemo(() => {
    const trimmed = text.trim()
    if (!trimmed) return { words: 0, characters: 0, sentences: 0, paragraphs: 0, readingTime: "0 min" }

    const words = trimmed.split(/\s+/).filter(Boolean).length
    const characters = trimmed.length
    const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0).length
    const paragraphs = trimmed.split(/\n\n+/).filter(p => p.trim().length > 0).length
    const minutes = Math.ceil(words / 200)
    const readingTime = minutes < 1 ? "Less than 1 min" : `${minutes} min read`

    return { words, characters, sentences, paragraphs, readingTime }
  }, [text])

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Word Counter",
        description: "Count words, characters, sentences, and paragraphs",
        url: `${SITE_URL}/tools/word-counter`,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      }} />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
      <nav style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>
        <Link href="/tools" style={{ color: "var(--accent)", textDecoration: "none" }}>Tools</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span>Word Counter</span>
      </nav>

      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Word Counter</h1>
      <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 32 }}>Count words, characters, sentences, paragraphs, and estimated reading time.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Words", value: stats.words },
          { label: "Characters", value: stats.characters },
          { label: "Sentences", value: stats.sentences },
          { label: "Paragraphs", value: stats.paragraphs },
          { label: "Reading Time", value: stats.readingTime },
        ].map(stat => (
          <div key={stat.label} style={{ padding: 20, borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent)", marginBottom: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Start typing or paste your text here..."
        style={{
          width: "100%",
          height: 350,
          padding: 20,
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--text)",
          fontSize: 15,
          lineHeight: 1.7,
          resize: "vertical",
          fontFamily: "inherit",
        }}
      />
      <NewsletterStrip />
    </div>
    </>
  )
}
