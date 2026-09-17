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
import { AdSlot } from "@/components/ads/AdSlot"

const CATEGORY_INTROS: Record<ToolCategory, string> = {
  developer: "Developer tools help you format code, validate data, encode and decode strings, test patterns, and inspect tokens — all without installing anything. Whether you are debugging a JSON payload, checking a JWT expiry, or building a cron expression, these utilities give you instant answers in the browser. Every tool processes your input locally, so credentials, API keys and proprietary code never leave your machine. Developers use them during code reviews, CI/CD debugging, API testing, and daily scripting tasks.",
  security: "Security tools let you generate strong passwords, measure their real strength, validate email addresses and credit card numbers, and look up IP addresses — all offline. Every password is built with cryptographically secure randomness via the browser's crypto.getRandomValues() API, the same source that powers TLS connections. You can check whether an email format is valid, detect disposable domains, or verify a card number against the Luhn algorithm without any network call. These tools are essential for security audits, penetration testing, and everyday account hygiene.",
  network: "Network tools query real DNS records through Cloudflare's 1.1.1.1 resolver and analyze IP addresses at the protocol level. You can look up A, AAAA, MX, CNAME, TXT, and NS records for any domain, verify mail-server configuration, or check whether an IP address is public, private, or reserved. All queries run server-side through Cloudflare's DNS-over-HTTPS endpoint, so results are live and authoritative. Network engineers, sysadmins, and DevOps teams use these tools for troubleshooting, migration planning, and security verification.",
  seo: "SEO tools help you generate meta tags, build JSON-LD structured data, create robots.txt files, audit keyword density, check readability, and preview exactly how your page will appear in Google search results. Each tool runs entirely in your browser — your content is never uploaded or stored. Search-engine optimizers, content marketers, and bloggers use them daily to ensure every published page meets on-page SEO best practices before going live.",
  image: "Image tools compress, resize, convert, upscale, and analyze images directly in your browser using the Canvas API. You can shrink a photo for faster page loads, convert PNG to WebP for better compression, resize a banner to exact dimensions, or extract a color palette from any image. No upload is required — every pixel stays on your device. Web designers, photographers, and content creators use these tools to optimize images for the web without sacrificing quality.",
  pdf: "PDF tools merge multiple documents into one, split large files into manageable parts, compress file sizes for email, and convert between Excel and PDF formats. All processing uses pdf-lib and pdf.js running locally, so confidential contracts, financial reports, and legal documents never leave your computer. These tools are ideal for office workers, students, legal professionals, and anyone who handles PDF documents regularly.",
  calculator: "Calculators cover everyday math: percentages, loans with full amortization tables, unit conversions across length, mass, volume, speed and data, age computation, date arithmetic, base-2/36 conversion, BMI, and live multi-currency exchange rates. Each calculator shows step-by-step formulas and works instantly on any device. Students, professionals, shoppers, and analysts use them for quick accurate calculations without downloading an app.",
  ai: "AI writing tools generate headlines, meta descriptions, FAQs, structured prompts, and humanize AI-generated text — all using template-based engines that run entirely in your browser. No API key, no subscription, no data sent to a server. Content creators, marketers, and students use them to overcome writer's blank-page paralysis, craft SEO-friendly descriptions, and produce polished drafts in seconds.",
}

const CATEGORY_BENEFITS: Record<ToolCategory, string[]> = {
  developer: [
    "Zero installation — every tool runs in your browser tab",
    "Your code and tokens never leave your device",
    "Instant results with no API keys or rate limits",
    "Works on desktop, tablet and mobile browsers",
  ],
  security: [
    "Cryptographically secure randomness from the browser's crypto API",
    "No passwords or sensitive data are transmitted or stored",
    "Luhn algorithm and disposable-domain checks for email and card validation",
    "Instant feedback — no account or signup required",
  ],
  network: [
    "Live DNS results from Cloudflare's global 1.1.1.1 resolver",
    "Supports A, AAAA, MX, CNAME, TXT, NS and other record types",
    "IPv4 and IPv6 analysis with class, range and public/private detection",
    "No logs, no tracking, no data collection",
  ],
  seo: [
    "Preview exactly how Google will display your page",
    "Generate valid JSON-LD structured data in one click",
    "Audit keyword density and readability before publishing",
    "Everything runs offline — your drafts stay private",
  ],
  image: [
    "Canvas API processing — images never leave your computer",
    "Supports JPG, PNG, WebP, AVIF and GIF formats",
    "Batch compression and resize for bulk optimization",
    "Color palette extraction for design consistency",
  ],
  pdf: [
    "Merge, split and compress without uploading documents",
    "Excel-to-PDF conversion with multi-sheet support",
    "Confidential files stay on your device at all times",
    "Works with large documents up to hundreds of pages",
  ],
  calculator: [
    "Step-by-step formulas shown for full transparency",
    "Live currency rates updated daily from market data",
    "Responsive design with large touch-friendly inputs",
    "No ads, no popups, no tracking inside any calculator",
  ],
  ai: [
    "Template-based generation — no AI subscription needed",
    "Headlines, meta descriptions, FAQs and prompts in seconds",
    "Text humanizer improves readability without changing meaning",
    "All processing is local with zero data sent externally",
  ],
}

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

        <div style={{ marginBottom: 36 }}>
          <AdSlot positionKey="category_top_banner" />
        </div>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 14 }}>
            What Are {detail.label} Tools?
          </h2>
          <p style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.75, maxWidth: 820 }}>
            {CATEGORY_INTROS[cat]}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 20 }}>
            {CATEGORY_BENEFITS[cat].map((b) => (
              <div key={b} style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px",
                borderRadius: 10, background: detail.soft, border: `1px solid ${detail.accent}18`,
              }}>
                <span style={{ color: detail.accent, fontSize: 16, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>✓</span>
                <span style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.5 }}>{b}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, margin: "0 0 4" }}>All {detail.label} Tools</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 20" }}>
            Every tool below is free, runs instantly in your browser, and never uploads your data.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            <ActiveToolGroup tools={tools.map((slug) => ({ slug, name: TOOL_META[slug].name, description: TOOL_META[slug].description }))} />
          </div>
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 14 }}>
            When Should You Use {detail.label} Tools?
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {tools.slice(0, 6).map((slug) => {
              const m = TOOL_META[slug]
              return (
                <Link key={slug} href={`/tools/${slug}`} style={{
                  display: "block", padding: "16px 18px", borderRadius: 12,
                  border: "1px solid var(--border)", background: "var(--card)",
                  textDecoration: "none", transition: "border-color .2s",
                }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 6 }}>{m.name}</div>
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.55 }}>{m.description}</p>
                </Link>
              )
            })}
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