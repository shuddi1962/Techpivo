"use client"

import Link from "next/link"
import { useState } from "react"
import { TopBar } from "@/components/layout/TopBar"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { NewsletterStrip } from "@/components/home/NewsletterStrip"
import { Braces, Key, Globe, Type, Calculator, Shield, Search, Image, Lock, Hash, Binary, Link2, FileText, Palette, Minimize2, FileJson, Clock } from "lucide-react"

interface Tool {
  name: string
  slug: string
  description: string
  icon: any
  category: string
  color: string
}

const tools: Tool[] = [
  { name: "JSON Formatter", slug: "json-formatter", description: "Format, validate, and beautify JSON data instantly", icon: Braces, category: "Developer", color: "bg-blue-500/10 text-blue-500" },
  { name: "Password Generator", slug: "password-generator", description: "Generate secure random passwords with customizable options", icon: Key, category: "Security", color: "bg-amber-500/10 text-amber-500" },
  { name: "Slug Generator", slug: "slug-generator", description: "Generate SEO-friendly URL slugs from any text", icon: Globe, category: "SEO", color: "bg-green-500/10 text-green-500" },
  { name: "Word Counter", slug: "word-counter", description: "Count words, characters, sentences, and paragraphs", icon: Type, category: "SEO", color: "bg-orange-500/10 text-orange-500" },
]

const comingSoon: Tool[] = [
  { name: "Base64 Encoder", slug: "#", description: "Encode and decode Base64 strings", icon: Binary, category: "Developer", color: "bg-purple-500/10 text-purple-500" },
  { name: "URL Encoder", slug: "#", description: "Encode and decode URLs", icon: Link2, category: "Developer", color: "bg-cyan-500/10 text-cyan-500" },
  { name: "Hash Generator", slug: "#", description: "Generate MD5, SHA-1, SHA-256 hashes", icon: Hash, category: "Security", color: "bg-red-500/10 text-red-500" },
  { name: "Password Strength", slug: "#", description: "Check password strength and security", icon: Shield, category: "Security", color: "bg-green-500/10 text-green-500" },
  { name: "Email Validator", slug: "#", description: "Validate email address format", icon: Lock, category: "Security", color: "bg-pink-500/10 text-pink-500" },
  { name: "Meta Tag Generator", slug: "#", description: "Generate meta tags for SEO", icon: Search, category: "SEO", color: "bg-green-500/10 text-green-500" },
  { name: "Readability Checker", slug: "#", description: "Check content readability score", icon: FileText, category: "SEO", color: "bg-purple-500/10 text-purple-500" },
  { name: "Image Compressor", slug: "#", description: "Compress images without quality loss", icon: Image, category: "Image", color: "bg-cyan-500/10 text-cyan-500" },
  { name: "Image Resizer", slug: "#", description: "Resize images to any dimension", icon: Minimize2, category: "Image", color: "bg-pink-500/10 text-pink-500" },
  { name: "Color Picker", slug: "#", description: "Pick and convert color codes", icon: Palette, category: "Image", color: "bg-amber-500/10 text-amber-500" },
  { name: "Unit Converter", slug: "#", description: "Convert between measurement units", icon: Calculator, category: "Calculator", color: "bg-green-500/10 text-green-500" },
  { name: "Percentage Calculator", slug: "#", description: "Calculate percentages quickly", icon: Calculator, category: "Calculator", color: "bg-blue-500/10 text-blue-500" },
  { name: "Date Calculator", slug: "#", description: "Calculate date differences", icon: Clock, category: "Calculator", color: "bg-purple-500/10 text-purple-500" },
]

const categories = ["All", "Developer", "Security", "SEO", "Image", "Calculator"]

export default function PublicToolsPage() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")

  const filtered = comingSoon.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === "All" || t.category === category
    return matchSearch && matchCat
  })

  return (
    <div>
      <TopBar />
      <Header />
      <main style={{ minHeight: "60vh" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 800, marginBottom: 12 }}>Free Tech Tools</h1>
            <p style={{ fontSize: 16, color: "var(--muted)", maxWidth: 600, margin: "0 auto" }}>
              Developer utilities, SEO tools, security checkers, and more. Fast, free, and private — everything runs in your browser.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, marginBottom: 48 }}>
            {tools.map((tool) => {
              const Icon = tool.icon
              return (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  style={{
                    display: "block",
                    padding: 24,
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    textDecoration: "none",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div className={tool.color} style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text)" }}>{tool.name}</h3>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{tool.category}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>{tool.description}</p>
                  <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>Use Tool →</div>
                </Link>
              )
            })}
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>More Tools Coming Soon</h2>
            <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>We&apos;re building more free tools for developers, marketers, and tech enthusiasts.</p>

            <div className="flex gap-1 flex-wrap" style={{ marginBottom: 20 }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: "8px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: category === cat ? "var(--accent)" : "transparent",
                    color: category === cat ? "#fff" : "var(--muted)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {filtered.map((tool) => {
                const Icon = tool.icon
                return (
                  <div
                    key={tool.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 16,
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      opacity: 0.7,
                    }}
                  >
                    <div className={tool.color} style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{tool.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Coming Soon</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>
      <NewsletterStrip />
      <Footer categories={[]} recentPosts={[]} />
    </div>
  )
}
