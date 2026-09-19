"use client";

import React, { Suspense, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ErrorBox } from "./tools-ui";

import {
  TOOL_REGISTRY, CATEGORY_ICONS, getToolMeta,
  type ToolMeta,
} from "./tools-registry";

export { CATEGORY_ICONS };
export type ToolDef = ToolMeta;

export function getToolDef(slug: string): ToolMeta | undefined {
  return getToolMeta(slug);
}

const TOOL_COMPONENTS: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  /* Developer */
  "json-formatter": () => import("./tools-dev").then(m => ({ default: m.JsonFormatterTool })),
  "csv-json": () => import("./tools-dev").then(m => ({ default: m.CsvJsonTool })),
  "regex-tester": () => import("./tools-dev").then(m => ({ default: m.RegexTesterTool })),
  "base64-encoder": () => import("./tools-dev").then(m => ({ default: () => m.Base64Tool({ mode: "encode" }) })),
  "base64-decoder": () => import("./tools-dev").then(m => ({ default: () => m.Base64Tool({ mode: "decode" }) })),
  "url-encoder": () => import("./tools-dev").then(m => ({ default: () => m.UrlEncodeTool({ mode: "encode" }) })),
  "url-decoder": () => import("./tools-dev").then(m => ({ default: () => m.UrlEncodeTool({ mode: "decode" }) })),
  "hash-generator": () => import("./tools-dev").then(m => ({ default: m.HashTool })),
  "uuid-generator": () => import("./tools-dev").then(m => ({ default: m.UuidTool })),
  "jwt-decoder": () => import("./tools-dev").then(m => ({ default: m.JwtTool })),
  "unix-timestamp": () => import("./tools-dev").then(m => ({ default: m.TimestampTool })),
  "cron-generator": () => import("./tools-dev").then(m => ({ default: m.CronTool })),
  "lorem-ipsum": () => import("./tools-dev").then(m => ({ default: m.LoremTool })),
  "markdown-preview": () => import("./tools-dev").then(m => ({ default: m.MarkdownTool })),
  "text-case": () => import("./tools-dev").then(m => ({ default: m.CaseTool })),
  "slug-generator": () => import("./tools-dev").then(m => ({ default: m.SlugTool })),

  /* Security / Network */
  "password-generator": () => import("./tools-sec").then(m => ({ default: m.PasswordGenTool })),
  "password-strength": () => import("./tools-sec").then(m => ({ default: m.PasswordStrengthTool })),
  "random-string": () => import("./tools-sec").then(m => ({ default: m.RandomStringTool })),
  "random-number": () => import("./tools-sec").then(m => ({ default: m.RandomNumberTool })),
  "email-validator": () => import("./tools-sec").then(m => ({ default: m.EmailValidatorTool })),
  "credit-card-validator": () => import("./tools-sec").then(m => ({ default: m.CreditCardTool })),
  "ip-lookup": () => import("./tools-sec").then(m => ({ default: m.IpLookupTool })),
  "dns-checker": () => import("./tools-sec").then(m => ({ default: m.DnsTool })),

  /* SEO */
  "meta-tag-generator": () => import("./tools-seo").then(m => ({ default: m.MetaTagTool })),
  "schema-generator": () => import("./tools-seo").then(m => ({ default: m.SchemaTool })),
  "robots-txt-generator": () => import("./tools-seo").then(m => ({ default: m.RobotsTool })),
  "sitemap-generator": () => import("./tools-seo").then(m => ({ default: m.SitemapTool })),
  "keyword-density": () => import("./tools-seo").then(m => ({ default: m.KeywordDensityTool })),
  "readability-checker": () => import("./tools-seo").then(m => ({ default: m.ReadabilityTool })),
  "serp-preview": () => import("./tools-seo").then(m => ({ default: m.SerpPreviewTool })),
  "word-counter": () => import("./tools-seo").then(m => ({ default: m.WordCounterTool })),

  /* Image & PDF */
  "image-compressor": () => import("./tools-media").then(m => ({ default: m.ImageCompressorTool })),
  "image-resizer": () => import("./tools-media").then(m => ({ default: m.ImageResizerTool })),
  "webp-converter": () => import("./tools-media").then(m => ({ default: m.WebpConverterTool })),
  "image-upscaler": () => import("./tools-media").then(m => ({ default: m.ImageUpscalerTool })),
  "color-picker": () => import("./tools-media").then(m => ({ default: m.ColorTool })),
  "merge-pdf": () => import("./tools-media").then(m => ({ default: m.MergePdfTool })),
  "split-pdf": () => import("./tools-media").then(m => ({ default: m.SplitPdfTool })),
  "compress-pdf": () => import("./tools-media").then(m => ({ default: m.CompressPdfTool })),
  "excel-to-pdf": () => import("./tools-media").then(m => ({ default: m.ExcelToPdfTool })),
  "pdf-to-excel": () => import("./tools-media").then(m => ({ default: m.PdfToExcelTool })),

  /* Calculators */
  "percentage-calculator": () => import("./tools-calc").then(m => ({ default: m.PercentageCalculatorTool })),
  "loan-calculator": () => import("./tools-calc").then(m => ({ default: m.LoanCalculatorTool })),
  "unit-converter": () => import("./tools-calc").then(m => ({ default: m.UnitConverterTool })),
  "age-calculator": () => import("./tools-calc").then(m => ({ default: m.AgeCalculatorTool })),
  "date-calculator": () => import("./tools-calc").then(m => ({ default: m.DateCalculatorTool })),
  "base-converter": () => import("./tools-calc").then(m => ({ default: m.BaseConverterTool })),
  "bmi-calculator": () => import("./tools-calc").then(m => ({ default: m.BmiCalculatorTool })),
  "currency-converter": () => import("./tools-calc").then(m => ({ default: m.CurrencyConverterTool })),

  /* AI */
  "ai-headline-generator": () => import("./tools-calc").then(m => ({ default: m.AiHeadlineGeneratorTool })),
  "ai-meta-description": () => import("./tools-calc").then(m => ({ default: m.AiMetaDescriptionTool })),
  "ai-faq-generator": () => import("./tools-calc").then(m => ({ default: m.AiFaqGeneratorTool })),
  "ai-prompt-generator": () => import("./tools-calc").then(m => ({ default: m.AiPromptGeneratorTool })),
  "ai-text-humanizer": () => import("./tools-calc").then(m => ({ default: m.AiTextHumanizerTool })),
};

const lazyCache = new Map<string, React.LazyExoticComponent<React.ComponentType>>();

function getLazyComponent(slug: string): React.LazyExoticComponent<React.ComponentType> | null {
  if (lazyCache.has(slug)) return lazyCache.get(slug)!;
  const loader = TOOL_COMPONENTS[slug];
  if (!loader) return null;
  const lazy = React.lazy(loader);
  lazyCache.set(slug, lazy);
  return lazy;
}

export function ToolView({ slug }: { slug: string }) {
  const def = getToolMeta(slug);

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

  const LazyComponent = getLazyComponent(slug);
  if (!LazyComponent) return <ErrorBox>Tool component not found.</ErrorBox>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Suspense fallback={<div className="animate-pulse rounded-2xl bg-muted h-64" />}>
        <LazyComponent />
      </Suspense>
    </div>
  );
}
