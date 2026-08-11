import Link from "next/link"
import { NewsletterStrip } from "@/components/home/NewsletterStrip"
import { JsonLd } from "@/components/ui/jsonld"
import { breadcrumbSchema, collectionPageSchema, itemListSchema } from "@/lib/jsonld"
import { SITE_URL } from "@/lib/constants"
import { TOOL_SLUGS, TOOL_META, TOOL_CATEGORY_LABEL, ToolCategory } from "@/lib/tools-metadata"

const CATEGORY_ORDER: ToolCategory[] = ["developer", "security", "network", "seo", "image", "pdf", "calculator", "ai"]

const CATEGORY_DESC: Record<ToolCategory, string> = {
  developer: "Formatting, conversion, and coding utilities used every day.",
  security: "Passwords, validation, and network inspection tools.",
  network: "DNS lookups through Cloudflare's public resolver.",
  seo: "Meta tags, schema, and content optimization utilities.",
  image: "Compress, resize, and convert images privately in your browser.",
  pdf: "Merge, split, and compress PDFs locally — nothing is uploaded.",
  calculator: "Quick calculators for loans, percentages, units, and more.",
  ai: "Instant AI-style writing generators and helpers. No API needed.",
}

const toolSchemas = TOOL_SLUGS.map(slug => {
  const t = TOOL_META[slug]
  return {
    "@context": "https://schema.org" as const,
    "@type": "SoftwareApplication" as const,
    name: t.name,
    description: t.description,
    url: `${SITE_URL}/tools/${slug}`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  }
})

export default function PublicToolsPage() {
  const grouped = CATEGORY_ORDER
    .map(cat => ({ cat, tools: TOOL_SLUGS.filter(slug => TOOL_META[slug].category === cat) }))
    .filter(g => g.tools.length > 0)

  const itemList = TOOL_SLUGS.map((slug, i) => ({ url: `${SITE_URL}/tools/${slug}`, name: TOOL_META[slug].name, position: i + 1 }))

  return (
    <>
      <style>{`.tp-tool-card:hover { border-color: var(--accent) !important; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,.08); }`}</style>
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Free Tech Tools" },
      ])} />
      <JsonLd data={collectionPageSchema("Free Tech Tools", "50+ free online tools that run directly in your browser.", `${SITE_URL}/tools`)} />
      <JsonLd data={itemListSchema(itemList)} />
      {toolSchemas.map((s, i) => <JsonLd key={i} data={s as any} />)}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 800, marginBottom: 12 }}>Free Tech Tools &amp; Utilities</h1>
          <p style={{ fontSize: 16, color: "var(--muted)", maxWidth: 640, margin: "0 auto" }}>
            {TOOL_SLUGS.length} tools for developers, SEO professionals, and everyday users.
            Fast, free, and private — everything runs in your browser.
          </p>
        </div>

        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 44 }}>
          {grouped.map(g => (
            <a
              key={g.cat}
              href={`#${g.cat}`}
              style={{
                padding: "8px 16px", borderRadius: 999, border: "1px solid var(--border)",
                fontSize: 13, fontWeight: 600, color: "var(--text)", textDecoration: "none",
                background: "var(--card)",
              }}
            >
              {TOOL_CATEGORY_LABEL[g.cat]} ({g.tools.length})
            </a>
          ))}
        </nav>

        {grouped.map(g => (
          <section key={g.cat} id={g.cat} style={{ marginBottom: 40 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, margin: 0 }}>{TOOL_CATEGORY_LABEL[g.cat]}</h2>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>{CATEGORY_DESC[g.cat]}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {g.tools.map(slug => {
                const t = TOOL_META[slug]
                return (
                  <Link
                    key={slug}
                    href={`/tools/${slug}`}
                    className="tp-tool-card"
                    style={{
                      display: "block", padding: 20, borderRadius: 12,
                      border: "1px solid var(--border)", background: "var(--card)",
                      textDecoration: "none", transition: "all 0.2s",
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{t.name}</div>
                    <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>{t.description}</p>
                    <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>Use Tool →</div>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}

        <section style={{ marginTop: 48 }}>
          <NewsletterStrip />
        </section>
      </div>
    </>
  )
}