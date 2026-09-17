"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, X, Plus, Check } from "lucide-react";
import { TOOL_META, type ToolMeta } from "@/lib/tools-metadata";
import { TOOL_CATEGORY_LABEL } from "@/lib/tools-metadata";
import { CompareFloatingBar } from "@/lib/compare-tools";

type QueryTool = { slug: string; meta: ToolMeta };

function parseToolsFromQuery(query: string | undefined): QueryTool[] {
  if (!query) return [];
  return query
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && TOOL_META[s])
    .slice(0, 4)
    .map((slug) => ({ slug, meta: TOOL_META[slug] }));
}

function FeatureRow({
  label,
  values,
  slugOrder,
}: {
  label: string;
  values: (string | React.ReactNode)[];
  slugOrder: string[];
}) {
  return (
    <tr className="border-b border-border/50 last:border-b-0">
      <td className="px-4 py-3 text-sm font-medium text-foreground bg-surface-2 whitespace-nowrap">
        {label}
      </td>
      {values.map((val, i) => (
        <td
          key={slugOrder[i]}
          className="px-4 py-3 text-sm text-foreground text-center max-w-[260px]"
        >
          {val}
        </td>
      ))}
    </tr>
  );
}

export default function ToolComparePage() {
  const [queryTools, setQueryTools] = useState<QueryTool[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQueryTools(parseToolsFromQuery(params.get("tools") ?? undefined));
    setLoaded(true);
  }, []);

  const slugs = useMemo(() => queryTools.map((t) => t.slug), [queryTools]);

  if (!loaded) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-muted-foreground">Loading comparison...</div>
      </div>
    );
  }

  if (queryTools.length < 2) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold text-foreground">Compare Tools</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Select at least 2 tools to compare them side by side. You can add
          tools to compare from any tool card or the tool detail page.
        </p>
        <Link
          href="/tools"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Browse All Tools
        </Link>
      </div>
    );
  }

  const maxLen = Math.max(...queryTools.map((t) => t.meta.keywords?.length ?? 0));

  return (
    <div className="min-h-[70vh]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-950 via-[#0b1035] to-[#1b1b4b] py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            All Tools
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white font-[family-name:var(--font-display)]">
            Compare Tools
          </h1>
          <p className="text-white/70 mt-2">
            Comparing {queryTools.length} tools side by side
          </p>
        </div>
      </div>

      {/* Tool headers */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-[180px] md:w-[220px]" />
                {queryTools.map((t) => (
                  <th key={t.slug} className="px-4 pb-4 text-center min-w-[200px]">
                    <div className="relative inline-flex flex-col items-center gap-2 bg-card border border-border rounded-xl p-4 shadow-sm w-full">
                      <button
                        onClick={() => {
                          const remaining = slugs.filter((s) => s !== t.slug);
                          window.location.href = `/tools/compare?tools=${remaining.join(",")}`;
                        }}
                        className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50 transition"
                        aria-label={`Remove ${t.meta.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        href={`/tools/${t.slug}`}
                        className="text-lg font-semibold text-foreground hover:text-accent transition"
                      >
                        {t.meta.name}
                      </Link>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-muted-foreground">
                        {TOOL_CATEGORY_LABEL[t.meta.category]}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <FeatureRow
                label="Description"
                values={queryTools.map((t) => (
                  <span className="text-xs leading-relaxed" key={t.slug}>
                    {t.meta.description}
                  </span>
                ))}
                slugOrder={slugs}
              />

              <FeatureRow
                label="Long Description"
                values={queryTools.map((t) => (
                  <span className="text-xs leading-relaxed line-clamp-4" key={t.slug}>
                    {t.meta.longDescription}
                  </span>
                ))}
                slugOrder={slugs}
              />

              <FeatureRow
                label="Category"
                values={queryTools.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/tools/category/${t.meta.category === "calculator" ? "calculators" : t.meta.category === "ai" ? "ai-writers" : t.meta.category}`}
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    {TOOL_CATEGORY_LABEL[t.meta.category]}
                  </Link>
                ))}
                slugOrder={slugs}
              />

              <FeatureRow
                label="Keywords"
                values={queryTools.map((t) => (
                  <div key={t.slug} className="flex flex-wrap gap-1 justify-center">
                    {(t.meta.keywords ?? []).map((kw) => (
                      <span
                        key={kw}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-muted-foreground"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                ))}
                slugOrder={slugs}
              />

              <FeatureRow
                label="Related Tools"
                values={queryTools.map((t) => (
                  <div key={t.slug} className="flex flex-wrap gap-1 justify-center">
                    {(t.meta.related ?? []).map((r) => {
                      const rMeta = TOOL_META[r];
                      return (
                        <Link
                          key={r}
                          href={`/tools/${r}`}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-accent hover:underline"
                        >
                          {rMeta?.name ?? r}
                        </Link>
                      );
                    })}
                  </div>
                ))}
                slugOrder={slugs}
              />

              <FeatureRow
                label="FAQ Count"
                values={queryTools.map((t) => (
                  <span key={t.slug} className="text-sm font-medium">
                    {t.meta.faq?.length ?? 0}
                  </span>
                ))}
                slugOrder={slugs}
              />

              {/* FAQ rows */}
              {Array.from({ length: maxLen }).map((_, i) => {
                return (
                  <FeatureRow
                    key={`faq-${i}`}
                    label={`FAQ ${i + 1}`}
                    values={queryTools.map((t) => {
                      const faq = t.meta.faq?.[i];
                      if (!faq) return <span key={t.slug} className="text-muted-foreground text-xs">--</span>;
                      return (
                        <div key={t.slug} className="text-left">
                          <div className="text-xs font-medium text-foreground">{faq.q}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-3">{faq.a}</div>
                        </div>
                      );
                    })}
                    slugOrder={slugs}
                  />
                );
              })}

              {/* Add to compare row */}
              <tr>
                <td className="px-4 py-4 bg-surface-2 text-sm font-medium text-foreground whitespace-nowrap">
                  Quick Actions
                </td>
                {queryTools.map((t) => (
                  <td key={t.slug} className="px-4 py-4 text-center">
                    <Link
                      href={`/tools/${t.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent text-white hover:opacity-90 transition"
                    >
                      Use {t.meta.name}
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating compare bar */}
      <CompareFloatingBar />
    </div>
  );
}
