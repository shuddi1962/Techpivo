import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { JsonLd } from "@/components/ui/jsonld"
import { breadcrumbSchema, softwareApplicationSchema, itemListSchema } from "@/lib/jsonld"
import { SITE_URL } from "@/lib/constants"
import { TOOL_SLUGS, TOOL_META, TOOL_CATEGORY_LABEL } from "@/lib/tools-metadata"
import { CATEGORY_ROUTE } from "@/lib/tools-categories"
import { ToolView } from "@/lib/tools"
import { ToolStatusGate } from "@/components/tools/tool-status"
import { AdSlot } from "@/components/ads/AdSlot"

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

      <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-5 md:py-8">
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-7 lg:items-start">
          <main className="min-w-0">
            <div className="mb-2 text-[13px] text-[color:var(--muted)]">
              <Link href="/tools" className="text-[color:hsl(var(--accent))] no-underline">Tools</Link>
              <span className="mx-1.5">→</span>
              <Link href={CATEGORY_ROUTE[meta.category]} className="text-[color:hsl(var(--accent))] no-underline">
                {TOOL_CATEGORY_LABEL[meta.category]}
              </Link>
              <span className="mx-1.5">→</span>
              <span>{meta.name}</span>
            </div>
            <h1 className="font-[family-name:var(--font-syne)] text-[26px] font-extrabold leading-tight m-0 sm:text-[30px]">{meta.name}</h1>
            <p className="mt-2 mb-6 text-[15px] text-[color:var(--muted)]" style={{ lineHeight: 1.6 }}>{meta.longDescription || meta.description}</p>

            <div className="mb-6">
              <AdSlot positionKey="category_top_banner" />
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 sm:p-6">
              <ToolStatusGate slug={meta.slug}>
                <ToolView slug={meta.slug} />
              </ToolStatusGate>
            </div>

            <FaqSection slug={meta.slug} />
          </main>

          <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
            <AdSlot positionKey="post_sidebar_top" />
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-[18px]">
              <h3 className="mb-3 text-[14px] font-bold text-[color:var(--text)]">More {TOOL_CATEGORY_LABEL[meta.category]} Tools</h3>
              <div className="flex flex-col gap-1">
                {sameCategory.map((s) => (
                  <Link key={s} href={`/tools/${s}`} className="border-b border-[color:var(--border)] py-1.5 text-[13px] text-[color:var(--muted)] no-underline last:border-b-0">
                    {TOOL_META[s].name}
                  </Link>
                ))}
              </div>
            </div>
            {related.length > 0 && (
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-[18px]">
                <h3 className="mb-3 text-[14px] font-bold text-[color:var(--text)]">Related Tools</h3>
                <div className="flex flex-col gap-1">
                  {related.map((s) => (
                    <Link key={s} href={`/tools/${s}`} className="border-b border-[color:var(--border)] py-1.5 text-[13px] text-[color:var(--muted)] no-underline last:border-b-0">
                      {TOOL_META[s].name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="px-1.5 text-[12px] text-[color:var(--muted)]" style={{ lineHeight: 1.5 }}>
              Private by design — no file or text ever leaves your browser.
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}