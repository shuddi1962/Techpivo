import { Code2, ShieldCheck, Globe, Search, Image as ImageIcon, FileText, Calculator, Sparkles, type LucideIcon } from "lucide-react";
import { ToolCategory } from "./tools-metadata";

export interface ToolCategoryDetail {
  value: ToolCategory;
  label: string;
  tagline: string;
  description: string;
  hero: string;
  icon: LucideIcon;
  accent: string;
  soft: string;
  keywords: string[];
  faq: { q: string; a: string }[];
  related: ToolCategory[];
}

export const TOOL_CATEGORY_DETAILS: Record<ToolCategory, ToolCategoryDetail> = {
  developer: {
    value: "developer",
    label: "Developer",
    tagline: "Coding utilities for your daily workflow",
    description: "Formatting, conversion, and coding utilities used every day.",
    hero: "From JSON beautifying to regex testing, cron building and JWT inspection — every everyday developer utility you need, running privately in your browser.",
    icon: Code2,
    accent: "#2563EB",
    soft: "#EFF6FF",
    keywords: ["json formatter", "regex tester", "base64", "cron generator", "jwt decoder", "hash generator", "uuid", "markdown"],
    faq: [
      { q: "Are developer tools safe for sensitive data?", a: "Yes — every tool in this category runs 100% in your browser. Paste tokens, JSON payloads and code freely; nothing is ever uploaded." },
      { q: "Do these tools need an account?", a: "No. All 16 developer tools are free, instant, and require no signup or API keys." },
      { q: "Can I use them on mobile?", a: "Yes — all tools are fully responsive and work in any modern browser on desktop, tablet, or phone." },
    ],
    related: ["security", "seo", "calculator"],
  },
  security: {
    value: "security",
    label: "Security",
    tagline: "Passwords, validation, and hardening helpers",
    description: "Passwords, validation, and network inspection tools.",
    hero: "Generate strong passwords, check their real strength, validate emails and card numbers, and inspect IP addresses — with cryptography-grade randomness, all offline.",
    icon: ShieldCheck,
    accent: "#DC2626",
    soft: "#FEF2F2",
    keywords: ["password generator", "password strength", "email validator", "luhn", "random string", "credit card validator"],
    faq: [
      { q: "Are passwords generated here stored?", a: "Never. Everything runs locally with no storage, no logs, and no network calls." },
      { q: "Is the random number generator cryptographically secure?", a: "Yes — all randomness uses crypto.getRandomValues(), the same secure source browsers use for TLS." },
      { q: "Do you verify cards or mailboxes?", a: "Card numbers are checked with the Luhn algorithm and mailbox checks are format/typo/disposable-domain based — no real transactions or lookups are performed." },
    ],
    related: ["developer", "network", "calculator"],
  },
  network: {
    value: "network",
    label: "Network",
    tagline: "DNS lookups and IP analysis",
    description: "DNS lookups through Cloudflare's public resolver.",
    hero: "Query real DNS records for any domain through Cloudflare's 1.1.1.1 resolver, and analyze IPv4/IPv6 addresses down to their class, range, and network details.",
    icon: Globe,
    accent: "#0EA5E9",
    soft: "#F0F9FF",
    keywords: ["dns lookup", "mx lookup", "dns records", "ipv4 ipv6", "ip analyzer", "cloudflare dns"],
    faq: [
      { q: "How fresh are DNS results?", a: "Queries hit Cloudflare's live DNS-over-HTTPS endpoint in real time, so results reflect current authoritative data." },
      { q: "Does IP analysis geolocate me?", a: "No — IP analysis here is purely mathematical (class, range, public/private). Geolocation is never performed." },
    ],
    related: ["security", "developer"],
  },
  seo: {
    value: "seo",
    label: "SEO",
    tagline: "Meta tags, schema, and content intelligence",
    description: "Meta tags, schema, and content optimization utilities.",
    hero: "Generate meta tags and JSON-LD schema, build robots.txt and sitemaps, and audit your content with density, readability, and live SERP previews.",
    icon: Search,
    accent: "#F59E0B",
    soft: "#FFFBEB",
    keywords: ["meta tag generator", "schema generator", "serp preview", "keyword density", "readability", "sitemap", "robots.txt"],
    faq: [
      { q: "Is generated schema valid?", a: "Yes — schema output is strict JSON-LD you can drop into a <script> tag or verify at validator.schema.org." },
      { q: "What title and description lengths should I use?", a: "Keep titles under 60 characters and descriptions under 160 so search engines don't truncate them." },
      { q: "Do SEO tools work offline?", a: "Every SEO utility runs locally in your browser — no data is sent anywhere." },
    ],
    related: ["ai", "developer", "calculator"],
  },
  image: {
    value: "image",
    label: "Image",
    tagline: "Compress, resize, convert — privately",
    description: "Compress, resize, and convert images privately in your browser.",
    hero: "Compress, resize, upscale, convert to WebP, and build color palettes — every operation uses the Canvas API on your device, so images never leave your computer.",
    icon: ImageIcon,
    accent: "#8B5CF6",
    soft: "#F5F3FF",
    keywords: ["image compressor", "webp converter", "image resizer", "image upscaler", "color picker", "palette generator"],
    faq: [
      { q: "Where do my images go?", a: "Nowhere. All processing happens locally with the Canvas API — nothing is uploaded, even at scale." },
      { q: "What quality should I use?", a: "80-85% is the sweet spot for photos. Use 90%+ for graphics that need crisp text." },
      { q: "Why convert to WebP?", a: "WebP is typically 25-35% smaller than JPG at equal quality and supported by every modern browser — a fast Core Web Vitals win." },
    ],
    related: ["pdf", "seo", "developer"],
  },
  pdf: {
    value: "pdf",
    label: "PDF",
    tagline: "Merge, split, compress, and convert PDFs",
    description: "Merge, split, and compress PDFs locally — nothing is uploaded.",
    hero: "Merge, split, compress, and convert PDFs — plus Excel-to-PDF and PDF-to-Excel — all processed locally with pdf-lib and pdf.js on your device.",
    icon: FileText,
    accent: "#DC2626",
    soft: "#FEF2F2",
    keywords: ["merge pdf", "split pdf", "compress pdf", "excel to pdf", "pdf to excel", "pdf tools"],
    faq: [
      { q: "Are my documents uploaded?", a: "Never. PDF tools run entirely in your browser using pdf-lib and pdf.js — documents stay on your device." },
      { q: "How much can compression save?", a: "Scan-heavy PDFs can shrink 40-70%. Text-only PDFs barely shrink because their streams are already compact." },
      { q: "Can I convert spreadsheets to PDF?", a: "Yes — the Excel to PDF tool supports .xlsx, .xls, .csv and .tsv with automatic pagination and multi-sheet support." },
    ],
    related: ["image", "developer", "calculator"],
  },
  calculator: {
    value: "calculator",
    label: "Calculators",
    tagline: "Loans, percentages, units, dates, currency",
    description: "Quick calculators for loans, percentages, units, and more.",
    hero: "8 practical calculators: percentages, loans with full amortization, units, age, dates, base conversion, BMI, and live multi-currency exchange rates.",
    icon: Calculator,
    accent: "#059669",
    soft: "#ECFDF5",
    keywords: ["percentage calculator", "loan calculator", "unit converter", "currency converter", "bmi calculator", "age calculator"],
    faq: [
      { q: "Where do currency rates come from?", a: "Live market rates updated daily from open exchange-rate providers, cached so the converter works even offline." },
      { q: "How is loan amortization calculated?", a: "Using the standard PMT formula, with a full month-by-month principal vs interest table." },
      { q: "Are your calculators mobile-friendly?", a: "Yes — every calculator is fully responsive with big touch-friendly inputs." },
    ],
    related: ["developer", "seo", "pdf"],
  },
  ai: {
    value: "ai",
    label: "AI Writers",
    tagline: "Instant writing helpers — no API needed",
    description: "Instant AI-style writing generators and helpers. No API needed.",
    hero: "Generate headlines, meta descriptions, FAQs, structured prompts, and humanize AI text — instantly, free, and with zero external API calls or accounts.",
    icon: Sparkles,
    accent: "#7C3AED",
    soft: "#FAF5FF",
    keywords: ["headline generator", "meta description generator", "faq generator", "prompt generator", "text humanizer"],
    faq: [
      { q: "Does this need an AI subscription?", a: "No — all five AI writers use instant formula-based generation engines that run in your browser. No API keys, no limits." },
      { q: "Can I use outputs commercially?", a: "Yes — outputs are generated locally on your device and are yours to use freely." },
      { q: "Are outputs unique?", a: "Headlines, prompts, FAQs and descriptions are assembled from your input plus a large template library, so results are tailored to your topic." },
    ],
    related: ["seo", "developer"],
  },
};

export const CATEGORY_SLUGS = Object.keys(TOOL_CATEGORY_DETAILS) as ToolCategory[];

export const CATEGORY_ROUTE: Record<ToolCategory, string> = {
  developer: "/tools/category/developer",
  security: "/tools/category/security",
  network: "/tools/category/network",
  seo: "/tools/category/seo",
  image: "/tools/category/image",
  pdf: "/tools/category/pdf",
  calculator: "/tools/category/calculators",
  ai: "/tools/category/ai-writers",
};

export const categoryRouteSlug = (cat: ToolCategory): string => CATEGORY_ROUTE[cat].split("/").pop()!;

export function getCategoryDetail(cat: ToolCategory): ToolCategoryDetail {
  return TOOL_CATEGORY_DETAILS[cat];
}