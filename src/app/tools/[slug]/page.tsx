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

function HowItWorksSection({ meta }: { meta: ToolMeta }) {
  if (!meta.longDescription) return null;

  const stepsByCategory: Record<string, string[]> = {
    developer: [
      `Open ${meta.name} in any modern browser — no installation required.`,
      "Paste your input data, text, or code into the editor.",
      "Click the action button to process, convert, or validate instantly.",
      "Copy the output to your clipboard or download the result file.",
    ],
    security: [
      `Launch ${meta.name} directly in your browser.`,
      "Enter the data you want to check, generate, or validate.",
      "Review the results — strength scores, validation outcomes, or generated values.",
      "Copy or save your output. No data is ever sent to a server.",
    ],
    network: [
      `Open ${meta.name} and enter a domain name or IP address.`,
      "Choose the record type or analysis mode you need.",
      "View live results queried directly from Cloudflare's DNS resolver.",
      "Copy the output for troubleshooting or documentation.",
    ],
    seo: [
      `Navigate to ${meta.name} and enter your page details or content.`,
      "Adjust settings like title length, description, or schema type.",
      "Preview the output in real time — see exactly how search engines will interpret it.",
      "Copy the generated tags, schema JSON-LD, or analysis results.",
    ],
    image: [
      `Open ${meta.name} and drag-and-drop or select your image.`,
      "Choose quality, dimensions, or conversion format settings.",
      "Watch the preview update instantly as changes apply.",
      "Download the optimized image — it was processed entirely on your device.",
    ],
    pdf: [
      `Open ${meta.name} and upload one or more PDF files.`,
      "Select the pages, merge order, or compression settings you want.",
      "Process the document — everything runs locally using pdf-lib.",
      "Download your new PDF. Original files are never uploaded.",
    ],
    calculator: [
      `Open ${meta.name} and enter your values in the input fields.`,
      "See results update in real time as you type.",
      "Review detailed breakdowns — amortization tables, unit conversions, or health metrics.",
      "Copy or bookmark your results for later reference.",
    ],
    ai: [
      `Open ${meta.name} and enter your topic, keywords, or draft text.`,
      "Select a tone, format, or template that fits your needs.",
      "Get instant AI-generated output — headlines, descriptions, FAQs, or humanized text.",
      "Copy the result to use in your content, blog, or social posts.",
    ],
  };

  const steps = stepsByCategory[meta.category] || stepsByCategory.developer;

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-[color:var(--heading)] font-[family-name:var(--font-syne)] text-[22px] font-bold">
        How to Use {meta.name}
      </h2>
      <div className="prose prose-slate text-[color:var(--text)] leading-relaxed">
        <p className="mb-4">{meta.longDescription}</p>
        <ol className="list-decimal pl-6 space-y-3 mt-4">
          {steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FeaturesSection({ meta }: { meta: ToolMeta }) {
  const privacyFeatures = [
    "100% client-side — zero uploads, maximum privacy",
    "Instant results — no waiting for server processing",
    "Secure — your data never leaves your browser",
    "Free to use — no sign-up required",
  ];

  const categoryFeatures: Record<string, string[]> = {
    developer: [
      "Handles real-world edge cases — malformed input, nested structures, large payloads",
      "Syntax highlighting for easier reading and debugging",
      "Copy-to-clipboard in one click — paste directly into your editor or terminal",
      "Works with JSON, YAML, XML, CSV, Base64, JWT, and more",
      "No file size limits for text processing",
    ],
    security: [
      "Cryptographically secure random generation using Web Crypto API",
      "Real-time strength analysis with entropy scoring",
      "Checks against known breached-password databases",
      "Luhn algorithm validation for credit card format checks",
      "Disposable email domain detection for signup validation",
    ],
    network: [
      "Queries Cloudflare's 1.1.1.1 resolver for fast, reliable results",
      "Supports A, AAAA, MX, CNAME, TXT, NS, SOA, and SRV record types",
      "IP geolocation with city-level accuracy",
      "Subnet and CIDR calculation for network planning",
      "MX record lookup for email server verification",
    ],
    seo: [
      "Real-time SERP preview — see exactly how your page will appear in Google",
      "Schema.org JSON-LD generator for rich snippets",
      "Readability scoring using Flesch-Kincaid and Coleman-Liau indices",
      "Keyword density analysis with word-boundary matching",
      "Generates robots.txt and XML sitemaps with proper directives",
    ],
    image: [
      "Supports JPEG, PNG, WebP, AVIF, and GIF formats",
      "Canvas-based processing — no server uploads needed",
      "Batch conversion for multiple files at once",
      "Configurable quality, dimensions, and output format",
      "EXIF metadata viewer for image inspection",
    ],
    pdf: [
      "Merge, split, and compress PDFs without uploading to any server",
      "Page-level granularity — select exact pages to keep or remove",
      "Works with password-protected files where permitted",
      "Pagination support for large documents",
      "Built on pdf-lib for reliable, standards-compliant processing",
    ],
    calculator: [
      "Real-time calculation as you type — no submit button needed",
      "Step-by-step breakdowns for full transparency",
      "Amortization schedules, unit conversions, and health formulas",
      "Bookmarkable results for quick reference",
      "Works offline after initial page load",
    ],
    ai: [
      "Generate headlines, meta descriptions, FAQs, and outlines",
      "Tone controls: professional, casual, educational, or breaking news",
      "Humanizer mode to improve readability and natural flow",
      "Prompt templates for common content workflows",
      "Copy output in Markdown, HTML, or plain text",
    ],
  };

  const categorySpecific = categoryFeatures[meta.category] || categoryFeatures.developer;
  const allFeatures = [...privacyFeatures, ...categorySpecific];

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-[color:var(--heading)] font-[family-name:var(--font-syne)] text-[22px] font-bold">
        Key Features
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {allFeatures.map((feature, index) => (
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

function UseCasesSection({ meta }: { meta: ToolMeta }) {
  const toolUseCases: Record<string, string[]> = {
    "json-formatter": [
      "Format minified API responses for debugging and code review",
      "Pretty-print JSON configuration files before committing",
      "Validate JSON syntax when building API integrations",
      "Convert between JSON and CSV for spreadsheet analysis",
      "Inspect deeply nested JSON objects in a readable tree view",
    ],
    "csv-json": [
      "Convert exported CSV data into structured JSON for web apps",
      "Transform spreadsheet exports into API-ready JSON payloads",
      "Parse CSV logs into JSON for analysis tools",
      "Migrate tabular data into NoSQL document stores",
      "Generate JSON datasets from CSV for data visualization",
    ],
    "regex-tester": [
      "Test and debug regular expressions before adding them to code",
      "Validate user input patterns like emails, phones, and URLs",
      "Build complex regex for log parsing and data extraction",
      "Learn regex with real-time match highlighting",
      "Find and replace patterns across large text blocks",
    ],
    "base64-encode": [
      "Encode binary data for embedding in JSON or XML payloads",
      "Decode Base64 strings from API responses or email attachments",
      "Encode file content for data URI schemes in HTML and CSS",
      "Decode JWT token payloads for debugging authentication flows",
      "Transfer binary data safely through text-only channels",
    ],
    "url-encoder": [
      "Encode query parameters for valid API requests",
      "Decode percent-encoded URLs for readability",
      "Encode special characters in redirect URLs",
      "Test URL encoding before deploying web applications",
      "Process batch-encoded URLs for migration scripts",
    ],
    "hash-generator": [
      "Generate SHA-256 checksums to verify file integrity",
      "Create hashes for password storage implementations",
      "Compare hash outputs across different algorithms",
      "Verify downloaded file hashes against official sources",
      "Generate consistent hashes for cache keys and deduplication",
    ],
    "uuid-generator": [
      "Generate unique IDs for database records and API resources",
      "Create UUIDs for distributed system event tracking",
      "Generate test fixtures with realistic UUID values",
      "Create collision-free identifiers for session tokens",
      "Batch-generate UUIDs for data migration scripts",
    ],
    "jwt-decoder": [
      "Inspect JWT token claims during authentication debugging",
      "Verify token expiration and audience claims",
      "Debug OAuth2 and SSO token exchange flows",
      "Read encoded user data from access tokens",
      "Validate JWT structure before sending in API requests",
    ],
    "password-generator": [
      "Create strong, unique passwords for new online accounts",
      "Generate passphrases for password manager master keys",
      "Build API keys with specific character requirements",
      "Create test passwords for security auditing workflows",
      "Generate bulk passwords for team credential provisioning",
    ],
    "password-strength": [
      "Evaluate existing passwords before reuse across services",
      "Test password policies for organizational security standards",
      "Check passphrase strength with entropy analysis",
      "Demonstrate password cracking resistance to stakeholders",
      "Validate custom password generation rules",
    ],
    "random-string": [
      "Generate API keys and secret tokens for application setup",
      "Create one-time verification codes for email or SMS flows",
      "Build unique session identifiers for web applications",
      "Generate random test data for QA and staging environments",
      "Create nonce values for CSRF protection implementations",
    ],
    "credit-card-validator": [
      "Validate credit card format before submitting payment forms",
      "Test payment form validation logic during development",
      "Verify card number structure using the Luhn algorithm",
      "Identify card type (Visa, Mastercard, Amex) from number prefix",
      "Debug payment integration checkout flows",
    ],
    "email-validator": [
      "Verify email addresses before adding to mailing lists",
      "Validate user input on signup and contact forms",
      "Check for disposable email domains in registration flows",
      "Batch-validate exported email lists for deliverability",
      "Test email validation regex patterns in applications",
    ],
    "ip-lookup": [
      "Trace the geographic origin of incoming network requests",
      "Investigate suspicious IP addresses from server access logs",
      "Verify VPN or proxy configuration by checking exit IP",
      "Look up ISP and ASN details for network troubleshooting",
      "Check IP reputation during security incident analysis",
    ],
    "dns-checker": [
      "Verify DNS propagation after changing nameservers",
      "Debug MX records when email delivery fails",
      "Check CNAME and A records during domain migrations",
      "Validate SPF, DKIM, and DMARC DNS entries for email authentication",
      "Inspect TXT records for domain verification processes",
    ],
    "subnet-calculator": [
      "Calculate subnet masks for new network segments",
      "Determine host ranges within CIDR blocks for DHCP planning",
      "Plan IP address allocation for office or cloud deployments",
      "Verify CIDR notation in infrastructure-as-code configurations",
      "Identify overlapping subnets in network architecture diagrams",
    ],
    "meta-tag-generator": [
      "Create optimized title and description tags for blog posts",
      "Generate meta tags for product landing pages",
      "Build Open Graph tags for social media sharing previews",
      "Produce Twitter Card metadata for X/Twitter link unfurls",
      "Audit and update meta tags across multiple pages",
    ],
    "schema-generator": [
      "Generate Article JSON-LD for blog posts and news coverage",
      "Create FAQ schema for help center and support pages",
      "Build Product schema for e-commerce listing rich snippets",
      "Produce Organization schema for company knowledge panels",
      "Generate Event schema for conference and meetup listings",
    ],
    "robots-txt": [
      "Generate a robots.txt file with proper crawl directives",
      "Block AI crawlers and scrapers from indexing content",
      "Allow search engine bots to access specific directories",
      "Create rules for different bot user agents",
      "Preview and test robots.txt before deploying to production",
    ],
    "keyword-density": [
      "Check keyword density in draft articles before publication",
      "Ensure focus keyword appears at an optimal 0.5–2% density",
      "Analyze keyword distribution across headings and body text",
      "Avoid keyword stuffing penalties from search engines",
      "Compare density across multiple competing articles",
    ],
    "readability-checker": [
      "Test article readability for a general tech audience",
      "Score content using Flesch-Kincaid, Coleman-Liau, and Gunning Fog",
      "Identify overly complex sentences that need simplification",
      "Ensure content meets grade-level targets for education material",
      "Compare readability scores across drafts for improvement tracking",
    ],
    "word-counter": [
      "Count words and characters for article length requirements",
      "Verify meta description stays within 160-character limits",
      "Check social media post length for platform constraints",
      "Track content length during editing and revision",
      "Count code block contents separately from prose",
    ],
    "serp-preview": [
      "Preview how a page title and description appear in Google search",
      "Optimize title length to avoid truncation in search results",
      "Test different title and description combinations for CTR",
      "Visualize search snippets before publishing new content",
      "Ensure brand name fits within the title tag character limit",
    ],
    "slug-generator": [
      "Generate SEO-friendly URL slugs from article titles",
      "Create consistent slugs for product and category pages",
      "Remove special characters and Unicode from URL paths",
      "Test slug output for different title formats and languages",
      "Batch-generate slugs for content migration projects",
    ],
    "image-compressor": [
      "Reduce image file sizes for faster page load times",
      "Compress product photos for e-commerce listings",
      "Optimize images before uploading to content management systems",
      "Shrink social media graphics without visible quality loss",
      "Prepare images for email campaigns with attachment size limits",
    ],
    "image-resizer": [
      "Resize photos to standard social media dimensions",
      "Create thumbnail versions of product images",
      "Adjust image dimensions for blog featured images",
      "Scale down high-resolution photos for web display",
      "Crop images to specific aspect ratios for responsive layouts",
    ],
    "webp-converter": [
      "Convert PNG screenshots to WebP for faster documentation sites",
      "Convert JPEG photos to WebP for blog post optimization",
      "Prepare images in modern formats for Core Web Vitals",
      "Batch-convert legacy image formats for site migration",
      "Generate WebP variants for responsive image srcset attributes",
    ],
    "color-picker": [
      "Extract exact hex codes from brand logo images",
      "Match colors across design mockups and live implementations",
      "Identify accessible color contrast pairs for UI components",
      "Build consistent color tokens for design systems",
      "Pick colors from uploaded screenshots for design reproduction",
    ],
    "merge-pdf": [
      "Combine chapter files into a single document for distribution",
      "Merge invoice PDFs into a consolidated monthly report",
      "Assemble multi-part legal documents into one filing",
      "Combine presentation slides exported as separate PDFs",
      "Create a single PDF portfolio from scattered document files",
    ],
    "split-pdf": [
      "Extract specific pages from a large PDF for sharing",
      "Split a multi-chapter document into individual files",
      "Separate invoice pages from a bulk PDF export",
      "Divide a lengthy contract into review sections",
      "Remove unwanted pages from a scanned document",
    ],
    "compress-pdf": [
      "Reduce PDF file size for email attachment limits",
      "Optimize PDF uploads for government and legal portals",
      "Compress presentation PDFs for faster downloads",
      "Shrink scanned document PDFs for archival storage",
      "Prepare PDFs for web embedding with reduced bandwidth",
    ],
    "excel-to-pdf": [
      "Export spreadsheet reports to PDF for client delivery",
      "Convert budget worksheets to print-ready PDF format",
      "Generate PDF invoices from Excel accounting templates",
      "Create PDF archives of financial data for compliance",
      "Share spreadsheet dashboards as non-editable PDF documents",
    ],
    "pdf-to-excel": [
      "Extract tabular data from PDF financial reports",
      "Convert PDF invoices into editable spreadsheet records",
      "Import PDF survey results into Excel for analysis",
      "Extract data tables from research papers and whitepapers",
      "Migrate PDF-based records into spreadsheet databases",
    ],
    "image-upscaler": [
      "Enlarge product photos for high-resolution displays",
      "Upscale thumbnails for hero banners and featured images",
      "Enhance low-resolution screenshots for documentation",
      "Scale up AI-generated images for print or large-format use",
      "Improve image quality for legacy content with small originals",
    ],
    "percentage-calculator": [
      "Calculate discount percentages during shopping comparisons",
      "Compute tip amounts for restaurant bills",
      "Determine percentage change between two values",
      "Calculate markup and margin for product pricing",
      "Find what percentage one number is of another",
    ],
    "loan-calculator": [
      "Compare monthly payments across different loan offers",
      "Calculate total interest paid over a mortgage lifetime",
      "Model amortization schedules for auto financing",
      "Evaluate refinancing options with new rate scenarios",
      "Plan debt payoff timelines with extra payment inputs",
    ],
    "unit-converter": [
      "Convert metric measurements to imperial for international projects",
      "Convert data sizes between bytes, KB, MB, GB, and TB",
      "Translate speed units for travel and logistics planning",
      "Convert cooking measurements between metric and US units",
      "Switch between temperature scales for scientific data",
    ],
    "age-calculator": [
      "Calculate exact age in years, months, and days",
      "Determine eligibility dates for age-restricted services",
      "Compute age differences between two dates",
      "Verify date-of-birth entries in registration forms",
      "Generate age-based reports for demographic analysis",
    ],
    "date-calculator": [
      "Calculate the number of days between two project milestones",
      "Add or subtract days, weeks, or months from a date",
      "Determine business days between two dates excluding weekends",
      "Calculate deadlines for payment terms and contract durations",
      "Find the day of the week for any historical or future date",
    ],
    "bmi-calculator": [
      "Track body mass index for personal fitness goals",
      "Calculate BMI from weight and height measurements",
      "Compare BMI across metric and imperial input units",
      "Monitor health trends over time with regular calculations",
      "Use as a screening tool alongside other health metrics",
    ],
    "binary-calculator": [
      "Convert decimal numbers to binary for computer science coursework",
      "Translate between binary, octal, decimal, and hexadecimal",
      "Debug bitwise operations in low-level programming",
      "Verify binary representations for hardware interfacing",
      "Teach number system concepts with interactive conversion",
    ],
    "headline-generator": [
      "Generate click-worthy headlines for new blog articles",
      "Create multiple headline variations for A/B testing",
      "Produce SEO-optimized titles that include target keywords",
      "Draft headlines for social media promotion of new content",
      "Brainstorm angles for covering trending tech topics",
    ],
    "meta-description-generator": [
      "Write compelling meta descriptions that drive search clicks",
      "Generate descriptions within the 155-character Google snippet limit",
      "Create unique descriptions for product and category pages",
      "Draft descriptions for new blog posts before publication",
      "Produce descriptions optimized for featured snippet selection",
    ],
    "faq-generator": [
      "Generate FAQ sections for product and landing pages",
      "Create FAQ content for knowledge base and help documentation",
      "Build FAQ schema markup for search engine rich results",
      "Draft support FAQs from common customer questions",
      "Produce FAQ sections for onboarding and tutorial content",
    ],
    "prompt-generator": [
      "Build structured prompts for ChatGPT, Claude, and Gemini",
      "Generate role-specific prompts for coding, writing, and analysis",
      "Create system prompts for custom GPT and AI agent configurations",
      "Draft few-shot prompts with example input-output pairs",
      "Generate prompt templates for recurring content workflows",
    ],
    "humanizer": [
      "Rewrite AI-generated drafts for a natural, conversational tone",
      "Remove robotic phrasing and repetitive sentence patterns",
      "Improve readability scores while preserving technical accuracy",
      "Adapt formal AI output into casual blog-friendly prose",
      "Refine AI drafts before editorial review and publication",
    ],
    "net": [
      "Query DNS records during domain migration troubleshooting",
      "Check MX records to diagnose email delivery failures",
      "Verify A and AAAA records after hosting provider changes",
      "Look up TXT records for domain verification with third-party services",
      "Inspect CNAME chains for CDN and load balancer configuration",
    ],
  };

  const useCases = toolUseCases[meta.slug] || [
    `Perform ${meta.name.toLowerCase()} tasks directly in your browser`,
    "Save time with instant, server-free processing",
    "Maintain full privacy — your data never leaves your device",
    "Get reliable results powered by well-tested algorithms",
    "Use it anywhere — no installation or account required",
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
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6">
                <ToolStatusGate slug={meta.slug}>
                  <ToolView slug={meta.slug} />
                </ToolStatusGate>
              </div>
            </div>

            {/* Ad below tool interface (user has engaged with content first) */}
            <AdSlot positionKey="category_top_banner" className="mb-8" />

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