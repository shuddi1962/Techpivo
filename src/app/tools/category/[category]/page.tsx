import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { JsonLd } from "@/components/ui/jsonld"
import { breadcrumbSchema, collectionPageSchema, itemListSchema } from "@/lib/jsonld"
import { SITE_URL } from "@/lib/constants"
import { TOOL_META, TOOL_SLUGS, ToolCategory } from "@/lib/tools-metadata"
import { TOOL_CATEGORY_DETAILS, CATEGORY_SLUGS, getCategoryDetail, CATEGORY_ROUTE, categoryRouteSlug } from "@/lib/tools-categories"
import { ActiveToolGroup } from "@/components/tools/tool-status"
import { NewsletterStrip } from "@/components/home/NewsletterStrip"

export const dynamicParams = false

let categorySlugFromValue: Record<string, ToolCategory> | null = null
function slugToCategory(slug: string): ToolCategory | null {
  if (!categorySlugFromValue) {
    categorySlugFromValue = Object.fromEntries(
      CATEGORY_SLUGS.map((v) => [categoryRouteSlug(v), v])
    ) as Record<string, ToolCategory>
  }
  return categorySlugFromValue[slug] || null
}

export function generateStaticParams() {
  return CATEGORY_SLUGS.map((value) => ({ category: CATEGORY_ROUTE[value].split("/").pop() }))
}

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const cat = slugToCategory(params.category)
  if (!cat) return { title: "Category not found" }
  const detail = getCategoryDetail(cat)
  const count = TOOL_SLUGS.filter((s) => TOOL_META[s].category === cat).length
  return {
    title: `${detail.label} Tools — ${count} Free Online Utilities`,
    description: `${detail.hero} Free, fast and private — ${count} ${detail.label.toLowerCase()} tools that run entirely in your browser.`,
    keywords: detail.keywords.join(", "),
    openGraph: {
      title: `${detail.label} Tools — TechPivo`,
      description: detail.hero,
      url: `${SITE_URL}${CATEGORY_ROUTE[cat]}`,
      type: "website",
    },
  }
}

function CategoryFaq({ cat }: { cat: ToolCategory }) {
  const detail = getCategoryDetail(cat)
  if (detail.faq.length === 0) return null
  return (
    <section style={{ marginTop: 48 }}>
      <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 14 }}>
        {detail.label} Tools — FAQ
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {detail.faq.map((f) => (
          <details key={f.q} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", background: "var(--card)" }}>
            <summary style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", cursor: "pointer" }}>{f.q}</summary>
            <p style={{ fontSize: 14, color: "var(--muted)", margin: "10px 0 0", lineHeight: 1.6 }}>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export default async function ToolCategoryPage({ params }: { params: { category: string } }) {
  const cat = slugToCategory(params.category)
  if (!cat) notFound()

  const detail = getCategoryDetail(cat)
  const tools = TOOL_SLUGS.filter((slug) => TOOL_META[slug].category === cat)
  const Icon = detail.icon
  const url = `${SITE_URL}${CATEGORY_ROUTE[cat]}`

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: detail.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Free Tech Tools", url: `${SITE_URL}/tools` },
        { name: detail.label + " Tools" },
      ])} />
      <JsonLd data={collectionPageSchema(`${detail.label} Tools — Free Online Utilities`, detail.hero, url)} />
      <JsonLd data={itemListSchema(tools.map((slug, i) => ({ url: `${SITE_URL}/tools/${slug}`, name: TOOL_META[slug].name, position: i + 1 })))} />
      <JsonLd data={faqSchema as any} />

      <style>{`.tp-tool-card:hover { border-color: ${detail.accent} !important; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.10); }`}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
          <Link href="/tools" style={{ color: "hsl(var(--accent))", textDecoration: "none" }}>Tools</Link>
          <span style={{ margin: "0 6px" }}>→</span>
          <span>{detail.label}</span>
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${detail.soft} 0%, var(--card) 70%)`,
          border: `1.5px solid ${detail.accent}22`,
          borderRadius: 20, padding: "36px 32px", marginBottom: 36,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16, background: detail.accent, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              boxShadow: `0 8px 20px ${detail.accent}55`,
            }}>
              <Icon size={30} />
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 34, fontWeight: 800, margin: 0 }}>
                {detail.label} Tools
              </h1>
              <p style={{ fontSize: 14, fontWeight: 700, color: detail.accent, margin: "4px 0 10px", letterSpacing: 0.3 }}>
                {detail.tagline}
              </p>
              <p style={{ fontSize: 15, color: "var(--muted)", margin: 0, lineHeight: 1.65, maxWidth: 720 }}>
                {detail.hero}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
                {detail.keywords.map((k) => (
                  <span key={k} style={{
                    fontSize: 12, padding: "4px 12px", borderRadius: 999,
                    background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)",
                  }}>
                    {k}
                  </span>
                ))}
              </div>
            </div>
            <div style={{
              textAlign: "center", padding: "14px 20px", borderRadius: 14,
              background: "var(--card)", border: "1px solid var(--border)", flexShrink: 0,
            }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: detail.accent }}>{tools.length}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>free tools</div>
            </div>
          </div>
        </div>

        <section>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, margin: "0 0 4" }}>All {detail.label} Tools</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 20" }}>
            Every tool below is free, runs instantly in your browser, and never uploads your data.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            <ActiveToolGroup tools={tools.map((slug) => ({ slug, name: TOOL_META[slug].name, description: TOOL_META[slug].description }))} />
          </div>
        </section>

        <CategoryFaq cat={cat} />

        <section style={{ marginTop: 44, padding: "24px 28px", borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)" }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, margin: "0 0 12" }}>Explore other tool categories</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {CATEGORY_SLUGS.filter((v) => v !== cat).map((v) => {
              const d = getCategoryDetail(v)
              const C = d.icon
              const count = TOOL_SLUGS.filter((slug) => TOOL_META[slug].category === v).length
              return (
                <Link
                  key={v}
                  href={CATEGORY_ROUTE[v]}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px",
                    borderRadius: 999, border: "1px solid var(--border)", background: "var(--card)",
                    fontSize: 13, fontWeight: 600, color: "var(--text)", textDecoration: "none",
                  }}
                >
                  <C size={14} style={{ color: d.accent }} /> {d.label}
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>({count})</span>
                </Link>
              )
            })}
          </div>
        </section>

        <section style={{ marginTop: 48 }}>
          <NewsletterStrip />
        </section>
      </div>
    </>
  )
}