"use client";

import React, { useEffect } from "react";
import {
  Activity, Banknote, Binary, Bot, BookOpen, Braces, Calculator, CalendarDays, Cake,
  CaseSensitive, Clock, Code2, Coins, CreditCard, Dices, FileArchive, FileImage, FileSpreadsheet, FileStack,
  FileText, Fingerprint, GitFork, Globe, Hash, HelpCircle, Image, ImageMinus, ImagePlus,
  KeyRound, KeySquare, Languages, Link, Link2, Mail, Map, Monitor, Network, PenTool,
  Percent, Pipette, Regex, Ruler, Scissors, Search, Shield, ShieldCheck, Shuffle,
  Sparkles, Table, Table2, Tags, Timer, TrendingUp, Type, Wand2, ZoomIn,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ErrorBox } from "./tools-ui";
import { ToolCategory } from "./tools-metadata";

import { JsonFormatterTool, CsvJsonTool, RegexTesterTool, Base64Tool, UrlEncodeTool, HashTool, UuidTool, JwtTool, TimestampTool, CronTool, LoremTool, MarkdownTool, CaseTool, SlugTool } from "./tools-dev";
import { PasswordGenTool, PasswordStrengthTool, RandomStringTool, RandomNumberTool, EmailValidatorTool, CreditCardTool, IpLookupTool, DnsTool } from "./tools-sec";
import { MetaTagTool, SchemaTool, RobotsTool, SitemapTool, KeywordDensityTool, ReadabilityTool, SerpPreviewTool, WordCounterTool } from "./tools-seo";
import { ImageCompressorTool, ImageResizerTool, WebpConverterTool, ColorTool, MergePdfTool, SplitPdfTool, CompressPdfTool, ExcelToPdfTool, PdfToExcelTool, ImageUpscalerTool } from "./tools-media";
import { PercentageCalculatorTool, LoanCalculatorTool, UnitConverterTool, AgeCalculatorTool, DateCalculatorTool, BaseConverterTool, BmiCalculatorTool, CurrencyConverterTool, AiHeadlineGeneratorTool, AiMetaDescriptionTool, AiFaqGeneratorTool, AiPromptGeneratorTool, AiTextHumanizerTool } from "./tools-calc";

export interface ToolDef {
  slug: string;
  category: ToolCategory;
  name: string;
  description: string;
  icon: React.ElementType;
  component: () => React.ReactNode;
}

const Comp = (fn: () => React.ReactNode) => fn;

export const TOOL_LIST: ToolDef[] = [
  /* Developer */
  { slug: "json-formatter", category: "developer", name: "JSON Formatter", description: "Format, validate, and minify JSON with error detection", icon: Braces, component: Comp(() => <JsonFormatterTool />) },
  { slug: "csv-json", category: "developer", name: "CSV ↔ JSON", description: "Convert CSV to JSON and back, with delimiter options", icon: Table, component: Comp(() => <CsvJsonTool />) },
  { slug: "regex-tester", category: "developer", name: "Regex Tester", description: "Test regular expressions live against your text with match highlighting", icon: Regex, component: Comp(() => <RegexTesterTool />) },
  { slug: "base64-encoder", category: "developer", name: "Base64 Encoder", description: "Encode text or files to Base64 instantly", icon: Binary, component: Comp(() => <Base64Tool mode="encode" />) },
  { slug: "base64-decoder", category: "developer", name: "Base64 Decoder", description: "Decode Base64 strings back to readable text", icon: Binary, component: Comp(() => <Base64Tool mode="decode" />) },
  { slug: "url-encoder", category: "developer", name: "URL Encoder", description: "Percent-encode URLs and query strings", icon: Link2, component: Comp(() => <UrlEncodeTool mode="encode" />) },
  { slug: "url-decoder", category: "developer", name: "URL Decoder", description: "Decode percent-encoded URLs and query strings", icon: Link2, component: Comp(() => <UrlEncodeTool mode="decode" />) },
  { slug: "hash-generator", category: "developer", name: "Hash Generator", description: "Generate SHA-1, SHA-256, SHA-384, and SHA-512 hashes", icon: Hash, component: Comp(() => <HashTool />) },
  { slug: "uuid-generator", category: "developer", name: "UUID Generator", description: "Generate v4 UUIDs individually or in bulk", icon: Fingerprint, component: Comp(() => <UuidTool />) },
  { slug: "jwt-decoder", category: "developer", name: "JWT Decoder", description: "Decode JWT header and payload without sending data anywhere", icon: KeyRound, component: Comp(() => <JwtTool />) },
  { slug: "unix-timestamp", category: "developer", name: "Unix Timestamp", description: "Convert between Unix time and human-readable dates", icon: Clock, component: Comp(() => <TimestampTool />) },
  { slug: "cron-generator", category: "developer", name: "Cron Generator", description: "Build cron expressions with visual presets and descriptions", icon: Timer, component: Comp(() => <CronTool />) },
  { slug: "lorem-ipsum", category: "developer", name: "Lorem Ipsum", description: "Generate placeholder text with configurable length", icon: FileText, component: Comp(() => <LoremTool />) },
  { slug: "markdown-preview", category: "developer", name: "Markdown Preview", description: "Write Markdown and preview rendered HTML side by side", icon: Bot, component: Comp(() => <MarkdownTool />) },
  { slug: "text-case", category: "developer", name: "Text Case Converter", description: "Convert text to title case, camelCase, snake_case, and more", icon: CaseSensitive, component: Comp(() => <CaseTool />) },
  { slug: "slug-generator", category: "developer", name: "Slug Generator", description: "Turn any title into a URL-friendly slug", icon: Link, component: Comp(() => <SlugTool />) },

  /* Security */
  { slug: "password-generator", category: "security", name: "Password Generator", description: "Generate strong, random passwords with custom options", icon: KeySquare, component: Comp(() => <PasswordGenTool />) },
  { slug: "password-strength", category: "security", name: "Password Strength", description: "Check password entropy and get improvement tips", icon: ShieldCheck, component: Comp(() => <PasswordStrengthTool />) },
  { slug: "random-string", category: "security", name: "Random String", description: "Generate random strings with custom charsets", icon: Shuffle, component: Comp(() => <RandomStringTool />) },
  { slug: "random-number", category: "security", name: "Random Number", description: "Generate random numbers in any range, one or many", icon: Dices, component: Comp(() => <RandomNumberTool />) },
  { slug: "email-validator", category: "security", name: "Email Validator", description: "Validate email format and flag disposable domains", icon: Mail, component: Comp(() => <EmailValidatorTool />) },
  { slug: "credit-card-validator", category: "security", name: "Credit Card Validator", description: "Validate card numbers with the Luhn algorithm (format only)", icon: CreditCard, component: Comp(() => <CreditCardTool />) },
  { slug: "ip-lookup", category: "network", name: "IP Lookup", description: "Inspect IPv4 and IPv6 addresses — class, range, and details", icon: Globe, component: Comp(() => <IpLookupTool />) },
  { slug: "dns-checker", category: "network", name: "DNS Checker", description: "Look up A, AAAA, MX, TXT, and more records (Cloudflare DNS)", icon: Network, component: Comp(() => <DnsTool />) },

  /* SEO */
  { slug: "meta-tag-generator", category: "seo", name: "Meta Tag Generator", description: "Generate title, description, and Open Graph meta tags", icon: Tags, component: Comp(() => <MetaTagTool />) },
  { slug: "schema-generator", category: "seo", name: "Schema Generator", description: "Generate JSON-LD structured data for common content types", icon: Code2, component: Comp(() => <SchemaTool />) },
  { slug: "robots-txt-generator", category: "seo", name: "Robots.txt Generator", description: "Build a robots.txt with rules and sitemap reference", icon: Bot, component: Comp(() => <RobotsTool />) },
  { slug: "sitemap-generator", category: "seo", name: "Sitemap Generator", description: "Generate an XML sitemap from your URLs", icon: GitFork, component: Comp(() => <SitemapTool />) },
  { slug: "keyword-density", category: "seo", name: "Keyword Density", description: "Check keyword frequency and density in any text", icon: Search, component: Comp(() => <KeywordDensityTool />) },
  { slug: "readability-checker", category: "seo", name: "Readability Checker", description: "Score readability with the Flesch tests and grade level", icon: BookOpen, component: Comp(() => <ReadabilityTool />) },
  { slug: "serp-preview", category: "seo", name: "SERP Preview", description: "Preview how your title and description appear in Google", icon: Monitor, component: Comp(() => <SerpPreviewTool />) },
  { slug: "word-counter", category: "seo", name: "Word Counter", description: "Count words, characters, sentences, and reading time", icon: Type, component: Comp(() => <WordCounterTool />) },

  /* Image */
  { slug: "image-compressor", category: "image", name: "Image Compressor", description: "Compress images in your browser — nothing is uploaded", icon: ImageMinus, component: Comp(() => <ImageCompressorTool />) },
  { slug: "image-resizer", category: "image", name: "Image Resizer", description: "Resize images by percentage or exact dimensions", icon: ImagePlus, component: Comp(() => <ImageResizerTool />) },
  { slug: "webp-converter", category: "image", name: "WebP Converter", description: "Convert PNG/JPG to WebP with quality control", icon: FileImage, component: Comp(() => <WebpConverterTool />) },
  { slug: "image-upscaler", category: "image", name: "Image Upscaler", description: "Upscale images 2-8x in your browser — no upload", icon: ZoomIn, component: Comp(() => <ImageUpscalerTool />) },
  { slug: "color-picker", category: "image", name: "Color Picker", description: "Pick colors and get HEX, RGB, HSL, and shades", icon: Pipette, component: Comp(() => <ColorTool />) },

  /* PDF */
  { slug: "merge-pdf", category: "pdf", name: "Merge PDF", description: "Combine multiple PDFs into one, in your order", icon: FileStack, component: Comp(() => <MergePdfTool />) },
  { slug: "split-pdf", category: "pdf", name: "Split PDF", description: "Extract page ranges from a PDF into a new file", icon: Scissors, component: Comp(() => <SplitPdfTool />) },
  { slug: "compress-pdf", category: "pdf", name: "Compress PDF", description: "Reduce PDF file size locally with pdf-lib", icon: FileArchive, component: Comp(() => <CompressPdfTool />) },
  { slug: "excel-to-pdf", category: "pdf", name: "Excel to PDF", description: "Convert .xlsx/.csv spreadsheets to a formatted PDF", icon: FileSpreadsheet, component: Comp(() => <ExcelToPdfTool />) },
  { slug: "pdf-to-excel", category: "pdf", name: "PDF to Excel", description: "Extract PDF text into rows and export as .xlsx", icon: Table2, component: Comp(() => <PdfToExcelTool />) },

  /* Calculators */
  { slug: "percentage-calculator", category: "calculator", name: "Percentage Calculator", description: "Percentage of, percent change, and ratio calculations", icon: Percent, component: Comp(() => <PercentageCalculatorTool />) },
  { slug: "loan-calculator", category: "calculator", name: "Loan Calculator", description: "Monthly payments, interest, and amortization schedule", icon: Banknote, component: Comp(() => <LoanCalculatorTool />) },
  { slug: "unit-converter", category: "calculator", name: "Unit Converter", description: "Convert length, mass, volume, speed, and data units", icon: Ruler, component: Comp(() => <UnitConverterTool />) },
  { slug: "age-calculator", category: "calculator", name: "Age Calculator", description: "Exact age in years, months, days, and days until next birthday", icon: Cake, component: Comp(() => <AgeCalculatorTool />) },
  { slug: "date-calculator", category: "calculator", name: "Date Calculator", description: "Add or subtract time, or count days between dates", icon: CalendarDays, component: Comp(() => <DateCalculatorTool />) },
  { slug: "base-converter", category: "calculator", name: "Base Converter", description: "Convert numbers between bases 2-36", icon: Calculator, component: Comp(() => <BaseConverterTool />) },
  { slug: "bmi-calculator", category: "calculator", name: "BMI Calculator", description: "Body Mass Index with category and healthy range", icon: Activity, component: Comp(() => <BmiCalculatorTool />) },
  { slug: "currency-converter", category: "calculator", name: "Currency Converter", description: "Live exchange rates for 160+ world currencies", icon: Coins, component: Comp(() => <CurrencyConverterTool />) },

  /* AI */
  { slug: "ai-headline-generator", category: "ai", name: "AI Headline Generator", description: "Instant headline ideas built from proven formulas", icon: Sparkles, component: Comp(() => <AiHeadlineGeneratorTool />) },
  { slug: "ai-meta-description", category: "ai", name: "AI Meta Description", description: "Generate clickable meta descriptions at the right length", icon: PenTool, component: Comp(() => <AiMetaDescriptionTool />) },
  { slug: "ai-faq-generator", category: "ai", name: "AI FAQ Generator", description: "Generate FAQ pairs ready for FAQPage schema", icon: HelpCircle, component: Comp(() => <AiFaqGeneratorTool />) },
  { slug: "ai-prompt-generator", category: "ai", name: "AI Prompt Generator", description: "Build structured prompts with role, format, and rules", icon: Wand2, component: Comp(() => <AiPromptGeneratorTool />) },
  { slug: "ai-text-humanizer", category: "ai", name: "AI Text Humanizer", description: "Replace AI clichés and robotic phrasing in your text", icon: Languages, component: Comp(() => <AiTextHumanizerTool />) },
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

export function getToolDef(slug: string): ToolDef | undefined {
  return TOOL_LIST.find((t) => t.slug === slug);
}

export function ToolView({ slug }: { slug: string }) {
  const def = getToolDef(slug);

  useEffect(() => {
    if (!def) return;
    const supabase = createClient();
    supabase
      .rpc("bump_tool_usage", { p_slug: def.slug })
      .then(({ error }) => {
        if (error) console.warn("tool usage", error.message);
      })
      .then(undefined, () => {});
  }, [def?.slug]);

  if (!def) return <ErrorBox>Tool not found.</ErrorBox>;

  const Component = def.component;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Component />
    </div>
  );
}