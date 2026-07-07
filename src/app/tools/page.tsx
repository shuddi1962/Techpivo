"use client"

import Link from "next/link"
import { NewsletterStrip } from "@/components/home/NewsletterStrip"
import { Braces, Key, Globe, Type } from "lucide-react"
import { JsonLd } from "@/components/ui/jsonld"
import { breadcrumbSchema } from "@/lib/jsonld"
import { SITE_URL } from "@/lib/constants"

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

const toolSchemas = tools.map(t => ({
  "@context": "https://schema.org" as const,
  "@type": "SoftwareApplication" as const,
  name: t.name,
  description: t.description,
  url: `${SITE_URL}/tools/${t.slug}`,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
}))

export default function PublicToolsPage() {

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Free Tech Tools" },
      ])} />
      {toolSchemas.map((s, i) => <JsonLd key={i} data={s as any} />)}
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
      <NewsletterStrip />
    </div>
    </>
  )
}
