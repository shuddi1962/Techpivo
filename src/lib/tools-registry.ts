import React from "react";
import {
  Activity, Banknote, Binary, Bot, BookOpen, Braces, Calculator, CalendarDays, Cake,
  CaseSensitive, Clock, Code2, Coins, CreditCard, Dices, FileArchive, FileImage, FileSpreadsheet, FileStack,
  FileText, Fingerprint, GitFork, Globe, Hash, HelpCircle, Image, ImageMinus, ImagePlus,
  KeyRound, KeySquare, Languages, Link, Link2, Mail, Map, Monitor, Network, PenTool,
  Percent, Pipette, Regex, Ruler, Scissors, Search, Shield, ShieldCheck, Shuffle,
  Sparkles, Table, Table2, Tags, Timer, TrendingUp, Type, Wand2, ZoomIn,
} from "lucide-react";
import { ToolCategory } from "./tools-metadata";

export interface ToolMeta {
  slug: string;
  category: ToolCategory;
  name: string;
  description: string;
  icon: React.ElementType;
}

export const TOOL_REGISTRY: ToolMeta[] = [
  /* Developer */
  { slug: "json-formatter", category: "developer", name: "JSON Formatter", description: "Format, validate, and minify JSON with error detection", icon: Braces },
  { slug: "csv-json", category: "developer", name: "CSV ↔ JSON", description: "Convert CSV to JSON and back, with delimiter options", icon: Table },
  { slug: "regex-tester", category: "developer", name: "Regex Tester", description: "Test regular expressions live against your text with match highlighting", icon: Regex },
  { slug: "base64-encoder", category: "developer", name: "Base64 Encoder", description: "Encode text or files to Base64 instantly", icon: Binary },
  { slug: "base64-decoder", category: "developer", name: "Base64 Decoder", description: "Decode Base64 strings back to readable text", icon: Binary },
  { slug: "url-encoder", category: "developer", name: "URL Encoder", description: "Percent-encode URLs and query strings", icon: Link2 },
  { slug: "url-decoder", category: "developer", name: "URL Decoder", description: "Decode percent-encoded URLs and query strings", icon: Link2 },
  { slug: "hash-generator", category: "developer", name: "Hash Generator", description: "Generate SHA-1, SHA-256, SHA-384, and SHA-512 hashes", icon: Hash },
  { slug: "uuid-generator", category: "developer", name: "UUID Generator", description: "Generate v4 UUIDs individually or in bulk", icon: Fingerprint },
  { slug: "jwt-decoder", category: "developer", name: "JWT Decoder", description: "Decode JWT header and payload without sending data anywhere", icon: KeyRound },
  { slug: "unix-timestamp", category: "developer", name: "Unix Timestamp", description: "Convert between Unix time and human-readable dates", icon: Clock },
  { slug: "cron-generator", category: "developer", name: "Cron Generator", description: "Build cron expressions with visual presets and descriptions", icon: Timer },
  { slug: "lorem-ipsum", category: "developer", name: "Lorem Ipsum", description: "Generate placeholder text with configurable length", icon: FileText },
  { slug: "markdown-preview", category: "developer", name: "Markdown Preview", description: "Write Markdown and preview rendered HTML side by side", icon: Bot },
  { slug: "text-case", category: "developer", name: "Text Case Converter", description: "Convert text to title case, camelCase, snake_case, and more", icon: CaseSensitive },
  { slug: "slug-generator", category: "developer", name: "Slug Generator", description: "Turn any title into a URL-friendly slug", icon: Link },

  /* Security */
  { slug: "password-generator", category: "security", name: "Password Generator", description: "Generate strong, random passwords with custom options", icon: KeySquare },
  { slug: "password-strength", category: "security", name: "Password Strength", description: "Check password entropy and get improvement tips", icon: ShieldCheck },
  { slug: "random-string", category: "security", name: "Random String", description: "Generate random strings with custom charsets", icon: Shuffle },
  { slug: "random-number", category: "security", name: "Random Number", description: "Generate random numbers in any range, one or many", icon: Dices },
  { slug: "email-validator", category: "security", name: "Email Validator", description: "Validate email format and flag disposable domains", icon: Mail },
  { slug: "credit-card-validator", category: "security", name: "Credit Card Validator", description: "Validate card numbers with the Luhn algorithm (format only)", icon: CreditCard },
  { slug: "ip-lookup", category: "network", name: "IP Lookup", description: "Inspect IPv4 and IPv6 addresses — class, range, and details", icon: Globe },
  { slug: "dns-checker", category: "network", name: "DNS Checker", description: "Look up A, AAAA, MX, TXT, and more records (Cloudflare DNS)", icon: Network },

  /* SEO */
  { slug: "meta-tag-generator", category: "seo", name: "Meta Tag Generator", description: "Generate title, description, and Open Graph meta tags", icon: Tags },
  { slug: "schema-generator", category: "seo", name: "Schema Generator", description: "Generate JSON-LD structured data for common content types", icon: Code2 },
  { slug: "robots-txt-generator", category: "seo", name: "Robots.txt Generator", description: "Build a robots.txt with rules and sitemap reference", icon: Bot },
  { slug: "sitemap-generator", category: "seo", name: "Sitemap Generator", description: "Generate an XML sitemap from your URLs", icon: GitFork },
  { slug: "keyword-density", category: "seo", name: "Keyword Density", description: "Check keyword frequency and density in any text", icon: Search },
  { slug: "readability-checker", category: "seo", name: "Readability Checker", description: "Score readability with the Flesch tests and grade level", icon: BookOpen },
  { slug: "serp-preview", category: "seo", name: "SERP Preview", description: "Preview how your title and description appear in Google", icon: Monitor },
  { slug: "word-counter", category: "seo", name: "Word Counter", description: "Count words, characters, sentences, and reading time", icon: Type },

  /* Image */
  { slug: "image-compressor", category: "image", name: "Image Compressor", description: "Compress images in your browser — nothing is uploaded", icon: ImageMinus },
  { slug: "image-resizer", category: "image", name: "Image Resizer", description: "Resize images by percentage or exact dimensions", icon: ImagePlus },
  { slug: "webp-converter", category: "image", name: "WebP Converter", description: "Convert PNG/JPG to WebP with quality control", icon: FileImage },
  { slug: "image-upscaler", category: "image", name: "Image Upscaler", description: "Upscale images 2-8x in your browser — no upload", icon: ZoomIn },
  { slug: "color-picker", category: "image", name: "Color Picker", description: "Pick colors and get HEX, RGB, HSL, and shades", icon: Pipette },

  /* PDF */
  { slug: "merge-pdf", category: "pdf", name: "Merge PDF", description: "Combine multiple PDFs into one, in your order", icon: FileStack },
  { slug: "split-pdf", category: "pdf", name: "Split PDF", description: "Extract page ranges from a PDF into a new file", icon: Scissors },
  { slug: "compress-pdf", category: "pdf", name: "Compress PDF", description: "Reduce PDF file size locally with pdf-lib", icon: FileArchive },
  { slug: "excel-to-pdf", category: "pdf", name: "Excel to PDF", description: "Convert .xlsx/.csv spreadsheets to a formatted PDF", icon: FileSpreadsheet },
  { slug: "pdf-to-excel", category: "pdf", name: "PDF to Excel", description: "Extract PDF text into rows and export as .xlsx", icon: Table2 },

  /* Calculators */
  { slug: "percentage-calculator", category: "calculator", name: "Percentage Calculator", description: "Percentage of, percent change, and ratio calculations", icon: Percent },
  { slug: "loan-calculator", category: "calculator", name: "Loan Calculator", description: "Monthly payments, interest, and amortization schedule", icon: Banknote },
  { slug: "unit-converter", category: "calculator", name: "Unit Converter", description: "Convert length, mass, volume, speed, and data units", icon: Ruler },
  { slug: "age-calculator", category: "calculator", name: "Age Calculator", description: "Exact age in years, months, days, and days until next birthday", icon: Cake },
  { slug: "date-calculator", category: "calculator", name: "Date Calculator", description: "Add or subtract time, or count days between dates", icon: CalendarDays },
  { slug: "base-converter", category: "calculator", name: "Base Converter", description: "Convert numbers between bases 2-36", icon: Calculator },
  { slug: "bmi-calculator", category: "calculator", name: "BMI Calculator", description: "Body Mass Index with category and healthy range", icon: Activity },
  { slug: "currency-converter", category: "calculator", name: "Currency Converter", description: "Live exchange rates for 160+ world currencies", icon: Coins },

  /* AI */
  { slug: "ai-headline-generator", category: "ai", name: "AI Headline Generator", description: "Instant headline ideas built from proven formulas", icon: Sparkles },
  { slug: "ai-meta-description", category: "ai", name: "AI Meta Description", description: "Generate clickable meta descriptions at the right length", icon: PenTool },
  { slug: "ai-faq-generator", category: "ai", name: "AI FAQ Generator", description: "Generate FAQ pairs ready for FAQPage schema", icon: HelpCircle },
  { slug: "ai-prompt-generator", category: "ai", name: "AI Prompt Generator", description: "Build structured prompts with role, format, and rules", icon: Wand2 },
  { slug: "ai-text-humanizer", category: "ai", name: "AI Text Humanizer", description: "Replace AI clichés and robotic phrasing in your text", icon: Languages },
];

export const CATEGORY_ICONS: Record<ToolCategory, React.ElementType> = {
  developer: Code2,
  security: Shield,
  network: Network,
  seo: TrendingUp,
  image: Image,
  pdf: FileText,
  calculator: Calculator,
  ai: Sparkles,
};

export function getToolMeta(slug: string): ToolMeta | undefined {
  return TOOL_REGISTRY.find((t) => t.slug === slug);
}
