import Link from "next/link"
import { NewsletterStrip } from "@/components/home/NewsletterStrip"
import { JsonLd } from "@/components/ui/jsonld"
import { breadcrumbSchema, collectionPageSchema, itemListSchema } from "@/lib/jsonld"
import { SITE_URL } from "@/lib/constants"
import { TOOL_SLUGS, TOOL_META, TOOL_CATEGORY_LABEL, ToolCategory } from "@/lib/tools-metadata"
import { TOOL_CATEGORY_DETAILS, CATEGORY_SLUGS, getCategoryDetail, CATEGORY_ROUTE } from "@/lib/tools-categories"
import { ActiveToolGroup } from "@/components/tools/tool-status"

const CATEGORY_ORDER: ToolCategory[] = ["developer", "security", "network", "seo", "image", "pdf", "calculator", "ai"]

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
      <style>{`.tp-tool-card:hover { border-color: hsl(var(--accent)) !important; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,.08); }`}</style>
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Free Tech Tools" },
      ])} />
      <JsonLd data={collectionPageSchema("Free Tech Tools", "50+ free online tools that run directly in your browser.", `${SITE_URL}/tools`)} />
      <JsonLd data={itemListSchema(itemList)} />
      {toolSchemas.map((s, i) => <JsonLd key={i} data={s as any} />)}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 800, marginBottom: 12 }}>Free Tech Tools &amp; Utilities</h1>
          <p style={{ fontSize: 16, color: "var(--muted)", maxWidth: 640, margin: "0 auto" }}>
            {TOOL_SLUGS.length} tools for developers, SEO professionals, and everyday users.
            Fast, free, and private — everything runs in your browser.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 36 }}>
          {grouped.map(g => {
            const d = getCategoryDetail(g.cat)
            return (
              <Link
                key={g.cat}
                href={CATEGORY_ROUTE[g.cat]}
                style={{
                  padding: "8px 16px", borderRadius: 999, border: "1px solid var(--border)",
                  fontSize: 13, fontWeight: 600, color: "hsl(var(--accent))", textDecoration: "none",
                  background: "var(--card)",
                }}
              >
                {d.label} ({g.tools.length}) →
              </Link>
            )
          })}
        </div>

        <section style={{ marginBottom: 44 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, margin: "0 0 14" }}>Browse by category</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {CATEGORY_ORDER.map(cat => {
              const d = getCategoryDetail(cat)
              const Icon = d.icon
              const count = TOOL_SLUGS.filter(slug => TOOL_META[slug].category === cat).length
              return (
                <Link
                  key={cat}
                  href={CATEGORY_ROUTE[cat]}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, padding: 18,
                    borderRadius: 14, border: "1.5px solid var(--border)", background: "var(--card)",
                    textDecoration: "none", transition: "all 0.2s",
                  }}
                  className="tp-cat-card"
                >
                  <div style={{
                    width: 46, height: 46, borderRadius: 12, background: d.soft, color: d.accent,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Icon size={22} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{d.label}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      {count} tools · {d.tagline}
                    </div>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 18, color: d.accent, flexShrink: 0 }}>→</span>
                </Link>
              )
            })}
          </div>
        </section>

        {grouped.map(g => {
          const d = getCategoryDetail(g.cat)
          const Icon = d.icon
          return (
            <section key={g.cat} id={g.cat} style={{ marginBottom: 40 }}>
              <div style={{ marginBottom: 16, display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon size={20} style={{ color: d.accent, verticalAlign: -3 }} /> {TOOL_CATEGORY_LABEL[g.cat]}
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>({g.tools.length})</span>
                </h2>
                <Link
                  href={CATEGORY_ROUTE[g.cat]}
                  style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "hsl(var(--accent))", textDecoration: "none" }}
                >
                  View all {TOOL_CATEGORY_LABEL[g.cat].toLowerCase()} tools →
                </Link>
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>{d.description}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, marginTop: 14 }}>
                <ActiveToolGroup tools={g.tools.map(slug => ({ slug, name: TOOL_META[slug].name, description: TOOL_META[slug].description }))} />
              </div>
            </section>
          )
        })}

        <section style={{ marginTop: 48 }}>
          <NewsletterStrip />
        </section>
      </div>
    </>
  )
}