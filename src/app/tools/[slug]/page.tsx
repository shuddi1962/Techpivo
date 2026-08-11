import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { JsonLd } from "@/components/ui/jsonld"
import { breadcrumbSchema, softwareApplicationSchema, itemListSchema } from "@/lib/jsonld"
import { SITE_URL } from "@/lib/constants"
import { TOOL_SLUGS, TOOL_META, TOOL_CATEGORY_LABEL } from "@/lib/tools-metadata"
import { ToolView } from "@/lib/tools"
import { ToolStatusGate } from "@/components/tools/tool-status"

export const dynamicParams = false

export function generateStaticParams() {
  return TOOL_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const meta = TOOL_META[params.slug]
  if (!meta) return { title: "Tool not found" }
  return {
    title: `${meta.name} — Free Online Tool`,
    description: meta.description,
    keywords: meta.keywords.join(", "),
    openGraph: {
      title: `${meta.name} — Free Online Tool — TechPivo`,
      description: meta.description,
      url: `${SITE_URL}/tools/${meta.slug}`,
      type: "website",
    },
  }
}

function FaqSection({ slug }: { slug: string }) {
  const faqs = TOOL_META[slug]?.faq || []
  if (faqs.length === 0) return null
  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Frequently Asked Questions</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {faqs.map((f) => (
          <details key={f.q} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", background: "var(--card)" }}>
            <summary style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", cursor: "pointer" }}>{f.q}</summary>
            <p style={{ fontSize: 14, color: "var(--muted)", margin: "10px 0 0", lineHeight: 1.6 }}>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export default async function ToolPage({ params }: { params: { slug: string } }) {
  const meta = TOOL_META[params.slug]
  if (!meta) notFound()

  const related = (meta.related || []).filter((s) => TOOL_META[s])
  const sameCategory = TOOL_SLUGS.filter((s) => s !== meta.slug && TOOL_META[s].category === meta.category).slice(0, 6)

  const faqSchema = meta.faq.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: meta.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Free Tech Tools", url: `${SITE_URL}/tools` },
        { name: meta.name },
      ])} />
      <JsonLd data={softwareApplicationSchema({ name: meta.name, description: meta.description, url: `${SITE_URL}/tools/${meta.slug}` })} />
      {faqSchema && <JsonLd data={faqSchema as any} />}
      <JsonLd data={itemListSchema(sameCategory.map((s, i) => ({ url: `${SITE_URL}/tools/${s}`, name: TOOL_META[s].name, position: i + 1 })))} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 28, alignItems: "start" }}>
          <main>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
              <Link href="/tools" style={{ color: "var(--accent)", textDecoration: "none" }}>Tools</Link>
              <span style={{ margin: "0 6px" }}>→</span>
              <span>{TOOL_CATEGORY_LABEL[meta.category]}</span>
            </div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, margin: 0 }}>{meta.name}</h1>
            <p style={{ fontSize: 15, color: "var(--muted)", margin: "8px 0 24px", lineHeight: 1.6 }}>{meta.longDescription || meta.description}</p>

            <div style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--card)", padding: 24 }}>
              <ToolStatusGate slug={meta.slug}>
                <ToolView slug={meta.slug} />
              </ToolStatusGate>
            </div>

            <FaqSection slug={meta.slug} />
          </main>

          <aside style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 24 }}>
<div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)", padding: 18 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12", color: "var(--text)" }}>More {TOOL_CATEGORY_LABEL[meta.category]} Tools</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {sameCategory.map((s) => (
                  <Link key={s} href={`/tools/${s}`} style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    {TOOL_META[s].name}
                  </Link>
                ))}
              </div>
            </div>
            {related.length > 0 && (
              <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)", padding: 18 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12", color: "var(--text)" }}>Related Tools</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {related.map((s) => (
                    <Link key={s} href={`/tools/${s}`} style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      {TOOL_META[s].name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, padding: "0 6px" }}>
              Private by design — no file or text ever leaves your browser.
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}