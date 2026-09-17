import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/ui/jsonld";
import { breadcrumbSchema, softwareApplicationSchema, faqPageSchema, itemListSchema, howToSchema } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/constants";
import { TOOL_SLUGS, TOOL_META, TOOL_CATEGORY_LABEL } from "@/lib/tools-metadata";
import type { ToolMeta } from "@/lib/tools-metadata";
import { CATEGORY_ROUTE, TOOL_CATEGORY_DETAILS } from "@/lib/tools-categories";
import { ToolView } from "@/lib/tools";
import { ToolStatusGate } from "@/components/tools/tool-status";
import { AdSlot } from "@/components/ads/AdSlot";
import { ShareMenu } from "@/components/community/share-menu";
import { AddToCompareButton } from "@/components/tools/compare-button";

export const dynamicParams = false;

export function generateStaticParams() {
  return TOOL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const meta = TOOL_META[params.slug];
  if (!meta) return { title: "Tool not found" };

  // Enhanced SEO metadata for better search visibility
  return {
    title: `${meta.name} — Free Online Tool — TechPivo`,
    description: `${meta.description} — No uploads, 100% client-side, secure and private.`,
    keywords: [...meta.keywords, "free online tool", "browser-based", "no upload", "techpivo tools"],
    openGraph: {
      title: `${meta.name} — Free Online Tool — TechPivo`,
      description: `${meta.description} Use instantly in your browser — no upload required.`,
      url: `${SITE_URL}/tools/${meta.slug}`,
      type: "website",
      siteName: "TechPivo Tools",
    },
    twitter: {
      card: "summary_large_image",
      title: `${meta.name} — Free Online Tool`,
      description: `${meta.description} — 100% client-side, secure, no uploads.`,
    },
    // Additional meta tags for better SEO
    alternates: {
      canonical: `${SITE_URL}/tools/${meta.slug}`,
    },
  };
}

function HowItWorksSection({ meta }: { meta: any }) {
  if (!meta.longDescription) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-[color:var(--heading)] font-[family-name:var(--font-syne)] text-[22px] font-bold">
        How It Works
      </h2>
      <div className="prose prose-slate text-[color:var(--text)] leading-relaxed">
        <p>{meta.longDescription}</p>
        {/* Add structured steps for how-to schema */}
        <ol className="list-decimal pl-6 space-y-3 mt-4">
          <li>
            Open the tool in your browser — nothing to install
          </li>
          <li>
            Enter your data or upload your file directly
          </li>
          <li>
            Get instant results — all processing happens locally
          </li>
          <li>
            Copy or download your output — your data never leaves your device
          </li>
        </ol>
      </div>
    </section>
  );
}

function FeaturesSection({ meta }: { meta: any }) {
  // Extract features from description or use a default set
  const features = [
    "100% client-side — zero uploads, maximum privacy",
    "Instant results — no waiting for server processing",
    "Works offline — once loaded, no internet needed",
    "Secure — your data never leaves your browser",
    "Free to use — no hidden costs or premium locks",
  ];

  // Try to extract specific features from longDescription if available
  if (meta.longDescription) {
    // You could parse specific features from longDescription here
    // For now, we'll use the enhanced default features
  }

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-[color:var(--heading)] font-[family-name:var(--font-syne)] text-[22px] font-bold">
        Key Features
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <span className="text-[color:var(--accent)] font-bold">•</span>
            </div>
            <div className="flex-1">
              <p className="text-[color:var(--text)] text-[14px] leading-relaxed">{feature}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function UseCasesSection({ meta }: { meta: any }) {
  // Define common use cases based on tool category
  const useCasesByCategory: Record<string, string[]> = {
    developer: [
      "Debug and validate API responses",
      "Format configuration files (JSON, YAML, XML)",
      "Test and debug regular expressions",
      "Encode/decode data for transmission",
      "Generate unique identifiers and tokens",
    ],
    security: [
      "Generate strong passwords for accounts",
      "Validate password strength before use",
      "Check IP addresses for security analysis",
      "Verify email addresses for form validation",
      "Encode sensitive data for safe transfer",
    ],
    network: [
      "Analyze IP addresses for troubleshooting",
      "Lookup DNS records for domain issues",
      "Check if IP is public or private",
      "Troubleshoot network connectivity",
      "Validate subnet masks and CIDR notation",
    ],
    seo: [
      "Generate meta tags for better search visibility",
      "Create structured data for rich snippets",
      "Preview how pages appear in search results",
      "Check keyword density for content optimization",
      "Test readability scores for audience targeting",
    ],
    image: [
      "Compress images for faster web loading",
      "Resize images for social media posts",
      "Convert images to modern WebP format",
      "Pick colors for design consistency",
      "Create color palettes for branding",
    ],
    pdf: [
      "Merge multiple PDF documents",
      "Split large PDFs into smaller files",
      "Compress PDFs for email attachment",
      "Convert Excel/CSV to PDF for sharing",
      "Extract text from PDFs for reuse",
    ],
    calculator: [
      "Calculate loan payments and interest",
      "Convert between different units",
      "Calculate body mass index (BMI)",
      "Determine age from birth date",
      "Convert between number bases (hex, binary, etc.)",
    ],
    ai: [
      "Generate SEO-optimized headlines",
      "Write meta descriptions for better CTR",
      "Create FAQ sections from content",
      "Build structured prompts for LLMs",
      "Humanize AI-generated text for natural flow",
    ],
  };

  const useCases = useCasesByCategory[meta.category] || [
    "Solve common daily tasks efficiently",
    "Save time with instant browser-based tools",
    "Maintain privacy with zero-upload processing",
    "Get professional results without cost",
    "Work offline once the tool is loaded",
  ];

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-[color:var(--heading)] font-[family-name:var(--font-syne)] text-[22px] font-bold">
        Common Use Cases
      </h2>
      <div className="space-y-3">
        {useCases.map((useCase, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1 text-[color:var(--muted)]">
              {index + 1}.
            </div>
            <div className="flex-1">
              <p className="text-[color:var(--text)] text-[14px] leading-relaxed">{useCase}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FAQSection({ meta }: { meta: any }) {
  const faqs = meta.faq || [];
  if (faqs.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-[color:var(--heading)] font-[family-name:var(--font-syne)] text-[22px] font-bold">
        Frequently Asked Questions
      </h2>
      <div className="space-y-4">
        {faqs.map((faq: { q: string; a: string }, index: number) => (
          <div key={index} className="border border-[color:var(--border)] rounded-lg p-5">
            <div className="flex items-start space-x-3 mb-3">
              <div className="flex-shrink-0">
                <span className="text-[color:var(--accent)] font-bold text-[18px]">
                  Q{index + 1}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="mb-1 text-[color:var(--heading)] font-semibold text-[16px]">{faq.q}</h3>
              </div>
            </div>
            <p className="text-[color:var(--text)] text-[14px] leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const CATEGORY_TO_APP_CATEGORY: Record<string, string> = {
  developer: "DeveloperApplication",
  security: "SecurityApplication",
  network: "UtilitiesApplication",
  seo: "DeveloperApplication",
  image: "MultimediaApplication",
  pdf: "DocumentDescriptionApplication",
  calculator: "UtilitiesApplication",
  ai: "DeveloperApplication",
};

function SchemaJsonLd({ meta }: { meta: ToolMeta }) {
  const sameCategory = TOOL_SLUGS
    .filter((s) => s !== meta.slug && TOOL_META[s].category === meta.category)
    .slice(0, 8)
    .map((s, i) => ({
      url: `${SITE_URL}/tools/${s}`,
      name: TOOL_META[s].name,
      position: i + 1,
    }));

  const howToSteps = [
    { name: "Open the tool", text: `Open ${meta.name} in your browser. No installation or sign-up required.` },
    { name: "Enter your data", text: "Input your data or upload a file directly in the browser." },
    { name: "Get instant results", text: "All processing happens locally in your browser — no waiting for a server." },
    { name: "Copy or download", text: "Copy your output to the clipboard or download it as a file." },
  ];

  return (
    <>
{/* Breadcrumb */}
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Free Tech Tools", url: `${SITE_URL}/tools` },
        { name: TOOL_CATEGORY_LABEL[meta.category], url: `${SITE_URL}/tools/category/${meta.category}` },
        { name: meta.name },
      ])} />

      {/* SoftwareApplication */}
      <JsonLd data={softwareApplicationSchema({
        name: meta.name,
        description: meta.description,
        url: `${SITE_URL}/tools/${meta.slug}`,
        applicationCategory: CATEGORY_TO_APP_CATEGORY[meta.category] || "UtilitiesApplication",
      })} />

      {/* HowTo */}
      <JsonLd data={howToSchema({
        name: `How to Use ${meta.name}`,
        description: `Step-by-step guide to using ${meta.name} — a free browser-based ${TOOL_CATEGORY_LABEL[meta.category]?.toLowerCase() || "utility"} tool.`,
        url: `${SITE_URL}/tools/${meta.slug}`,
        totalTime: "PT2M",
        estimatedCost: { currency: "USD", value: "0" },
        steps: howToSteps,
      })} />

      {/* FAQ */}
      {meta.faq.length > 0 && (
        <JsonLd data={faqPageSchema(meta.faq.map((f: { q: string; a: string }) => ({
          question: f.q,
          answer: f.a,
        })))} />
      )}

      {/* ItemList for related tools */}
      {sameCategory.length > 0 && (
        <JsonLd data={itemListSchema(sameCategory)} />
      )}
    </>
  );
}

export default async function ToolPage({ params }: { params: { slug: string } }) {
  const meta = TOOL_META[params.slug];
  if (!meta) notFound();

  const related = (meta.related || []).filter((s) => TOOL_META[s]);
  const sameCategory = TOOL_SLUGS
    .filter((s) => s !== meta.slug && TOOL_META[s].category === meta.category)
    .slice(0, 6);

  // Cross-category recommendations: find tools from other categories that share keywords
  const relatedSlugs = new Set(related);
  const sameCategorySlugs = new Set(sameCategory);
  const myKeywords = (meta.keywords || []).map((k) => k.toLowerCase());
  const crossCategory = myKeywords.length > 0
    ? TOOL_SLUGS
        .filter((s) => {
          if (s === meta.slug) return false;
          if (relatedSlugs.has(s)) return false;
          if (sameCategorySlugs.has(s)) return false;
          const otherMeta = TOOL_META[s];
          if (!otherMeta?.keywords) return false;
          const otherKeywords = otherMeta.keywords.map((k) => k.toLowerCase());
          const shared = myKeywords.filter((k) => otherKeywords.includes(k));
          return shared.length >= 1;
        })
        .slice(0, 3)
    : [];

  return (
    <>
      <SchemaJsonLd meta={meta} />

      <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-5 md:py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_300px] lg:gap-8 lg:items-start">
          <main className="min-w-0">
            {/* Enhanced header with better breadcrumbs and stats */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center space-x-3 mb-3 sm:mb-0">
                <Link href="/tools" className="text-[color:hsl(var(--accent))] hover:underline">
                  Tools
                </Link>
                <span className="mx-2 text-[color:var(--muted)]">→</span>
                <Link
                  href={CATEGORY_ROUTE[meta.category]}
                  className="text-[color:hsl(var(--accent))] hover:underline"
                >
                  {TOOL_CATEGORY_LABEL[meta.category]}
                </Link>
                <span className="mx-2 text-[color:var(--muted)]">→</span>
                <span className="text-[color:var(--heading)] font-medium">{meta.name}</span>
              </div>
              
              {/* Share + compare + privacy badge */}
              <div className="flex items-center space-x-4 text-sm">
                <AddToCompareButton slug={meta.slug} name={meta.name} />
                <ShareMenu
                  url={`${SITE_URL}/tools/${meta.slug}`}
                  title={`${meta.name} — Free Online Tool on TechPivo`}
                  buttonClassName="text-xs"
                />
                <span className="flex items-center space-x-2 text-[color:var(--muted)]">
                  <span className="w-3 h-3 flex-shrink-0 bg-[color:var(--accent)]/20 rounded"></span>
                  <span>100% Client-Side</span>
                </span>
              </div>
            </div>

            {/* Main title and description */}
            <h1 className="mb-4 text-[color:var(--heading)] font-[family-name:var(--font-syne)] text-[32px] font-extrabold leading-none sm:text-[36px]">
              {meta.name}
            </h1>
            
            <p className="mb-6 text-[color:var(--text)] text-[16px] leading-relaxed">
              {meta.description}
            </p>

            {/* Enhanced badges and tags */}
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[color:var(--muted)] bg-[color:var(--muted)]/20 text-[12px]">
                #techpivo-tools
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[color:var(--muted)] bg-[color:var(--muted)]/20 text-[12px]">
                ##{meta.category}
              </span>
              {meta.keywords.slice(0, 3).map((keyword, index) => (
                <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-[color:var(--muted)] bg-[color:var(--muted)]/20 text-[12px]">
                  #{keyword}
                </span>
              ))}
            </div>

            {/* How it works section */}
            <HowItWorksSection meta={meta} />

            {/* Key features section */}
            <FeaturesSection meta={meta} />

            {/* Use cases section */}
            <UseCasesSection meta={meta} />

            {/* Main tool interface */}
            <div className="mb-8">
              <AdSlot positionKey="category_top_banner" className="mb-6" />
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6">
                <ToolStatusGate slug={meta.slug}>
                  <ToolView slug={meta.slug} />
                </ToolStatusGate>
              </div>
            </div>

            {/* FAQ section */}
            <FAQSection meta={meta} />

            {/* Related tools section */}
            {sameCategory.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-4 text-[color:var(--heading)] font-[family-name:var(--font-syne)] text-[22px] font-bold">
                  More {TOOL_CATEGORY_LABEL[meta.category]} Tools
                </h2>
                <div className="space-y-3">
                  {sameCategory.map((s) => {
                    const relatedMeta = TOOL_META[s];
                    if (!relatedMeta) return null;
                    return (
                      <Link
                        key={s}
                        href={`/tools/${s}`}
                        className="group block border border-[color:var(--border)] rounded-lg p-5 hover:bg-[color:var(--accent)]/5 transition-colors hover:border-[color:var(--accent)]"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 flex-shrink-0 bg-[color:var(--muted)]/10 rounded-lg flex items-center justify-center">
                              <span className="text-[color:var(--accent)] text-[16px]">★</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="mb-1 text-[color:var(--heading)] font-semibold text-[16px] group-hover:text-[color:var(--accent)]">
                              {relatedMeta.name}
                            </h3>
                            <p className="mb-2 text-[color:var(--muted)] text-[14px] line-clamp-2">
                              {relatedMeta.description}
                            </p>
                            <div className="flex items-center space-x-2 text-[color:var(--muted)] text-[12px]">
                              <span className="w-3 h-3 flex-shrink-0 bg-[color:var(--accent)]/20 rounded"></span>
                              <span>Related Tool</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Specific related tools based on meta.related */}
            {related.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-4 text-[color:var(--heading)] font-[family-name:var(--font-syne)] text-[22px] font-bold">
                  You Might Also Like
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {related.map((s) => {
                    const relatedMeta = TOOL_META[s];
                    if (!relatedMeta) return null;
                    return (
                      <Link
                        key={s}
                        href={`/tools/${s}`}
                        className="group block border border-[color:var(--border)] rounded-lg p-5 hover:bg-[color:var(--accent)]/5 transition-colors hover:border-[color:var(--accent)]"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            <span className="text-[color:var(--accent)] font-bold">★</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="mb-1 text-[color:var(--heading)] font-semibold text-[15px] group-hover:text-[color:var(--accent)]">
                              {relatedMeta.name}
                            </h3>
                            <p className="text-[color:var(--muted)] text-[13px] line-clamp-2">
                              {relatedMeta.description}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Cross-category keyword-matched tools */}
            {crossCategory.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-4 text-[color:var(--heading)] font-[family-name:var(--font-syne)] text-[22px] font-bold">
                  Also Useful
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {crossCategory.map((s) => {
                    const cm = TOOL_META[s];
                    if (!cm) return null;
                    const catLabel = TOOL_CATEGORY_LABEL[cm.category] || cm.category;
                    return (
                      <Link
                        key={s}
                        href={`/tools/${s}`}
                        className="group block border border-[color:var(--border)] rounded-lg p-5 hover:bg-[color:var(--accent)]/5 transition-colors hover:border-[color:var(--accent)]"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            <span className="text-[color:var(--accent)] font-bold">→</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="mb-1 text-[color:var(--heading)] font-semibold text-[15px] group-hover:text-[color:var(--accent)]">
                              {cm.name}
                            </h3>
                            <p className="text-[color:var(--muted)] text-[13px] line-clamp-2">
                              {cm.description}
                            </p>
                            <span className="mt-2 inline-block text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-[color:var(--muted)]/10 text-[color:var(--muted)]">
                              {catLabel}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </main>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
            {/* Sidebar ads */}
            <AdSlot positionKey="post_sidebar_top" className="mb-5" />

            {/* Tool stats and info card */}
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
              <h3 className="mb-3 text-[color:var(--heading)] font-semibold text-[15px]">
                Tool Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-[color:var(--text)] text-[14px]">
                  <span>Category:</span>
                  <span className="text-[color:var(--muted)] font-medium">{TOOL_CATEGORY_LABEL[meta.category]}</span>
                </div>
                <div className="flex justify-between text-[color:var(--text)] text-[14px]">
                  <span>Privacy:</span>
                  <span className="text-[color:var(--accent)] font-medium">100% Client-Side</span>
                </div>
                <div className="flex justify-between text-[color:var(--text)] text-[14px]">
                  <span>Cost:</span>
                  <span className="text-[color:var(--accent)] font-medium">Free Forever</span>
                </div>
                <div className="flex justify-between text-[color:var(--text)] text-[14px]">
                  <span>Updates:</span>
                  <span className="text-[color:var(--muted)] font-medium">Regularly Maintained</span>
                </div>
              </div>
            </div>

            {/* Related tools in sidebar */}
            {sameCategory.length > 0 && (
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
                <h3 className="mb-3 text-[color:var(--heading)] font-semibold text-[15px]">
                  Similar Tools
                </h3>
                <div className="space-y-3">
                  {sameCategory.slice(0, 4).map((s) => {
                    const relatedMeta = TOOL_META[s];
                    if (!relatedMeta) return null;
                    return (
                      <div key={s} className="flex items-start space-x-3 py-2">
                        <div className="flex-shrink-0">
                          <span className="w-3 h-3 flex-shrink-0 bg-[color:var(--accent)]/20 rounded"></span>
                        </div>
                        <div className="flex-1">
                          <Link
                            href={`/tools/${s}`}
                            className="text-[color:var(--text)] hover:text-[color:var(--accent)] font-medium"
                          >
                            {relatedMeta.name}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
              <h3 className="mb-3 text-[color:var(--heading)] font-semibold text-[15px]">
                Quick Links
              </h3>
              <div className="space-y-3">
                <Link
                  href="/tools"
                  className="block py-2 text-[color:var(--text)] hover:text-[color:var(--accent)]"
                >
                  All Tools ({TOOL_SLUGS.length}+)
                </Link>
                <Link
                  href={`/tools/category/${meta.category}`}
                  className="block py-2 text-[color:var(--text)] hover:text-[color:var(--accent)]"
                >
                  {TOOL_CATEGORY_LABEL[meta.category]} Tools
                </Link>
                <Link
                  href="/"
                  className="block py-2 text-[color:var(--text)] hover:text-[color:var(--accent)]"
                >
                  TechPivo Home
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}