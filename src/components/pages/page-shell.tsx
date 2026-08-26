import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { renderMarkdown } from "@/lib/markdown";
import { preserveHtml } from "@/lib/sanitize";
import { getSitePage } from "@/lib/pages";

interface SitePageRow {
  slug: string;
  title: string | null;
  subtitle: string | null;
  content_md: string | null;
  hero_image: string | null;
  is_published: boolean | null;
  placement: string | null;
  design_settings: { hero_bg?: string; text_color?: string; content_width?: string; hero_alignment?: string; hero_height?: string; content_mode?: string; show_breadcrumb?: boolean; show_title?: boolean; show_subtitle?: boolean; show_hero?: boolean; full_width?: boolean; icon?: string; show_icon?: boolean; show_updated?: boolean; hero_temperature?: number; hero_brightness?: number } | null;
  updated_at: string | null;
}

async function fetchPageData(slug: string): Promise<SitePageRow | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase.from("site_pages").select("*").eq("slug", slug).maybeSingle();
    return (data as SitePageRow | null) || null;
  } catch (e) {
    console.error("PageShell fetch failed for", slug, e);
    return null;
  }
}

export default async function PageShell({
  slug,
  children,
}: {
  slug: string;
  children?: React.ReactNode;
}) {
  const def = getSitePage(slug);
  const row = await fetchPageData(slug);

  if (!def && !row) notFound();

  if (row && !row.is_published) notFound();

  const customized = !!row && !!row.is_published;

  const title = customized && row!.title ? row!.title : def?.hero.title || row!.title || slug;
  const subtitle = customized && row!.subtitle != null && row!.subtitle !== "" ? row!.subtitle : def?.hero.subtitle || "";
  const content = customized && row!.content_md != null && row!.content_md !== "" ? row!.content_md : def?.contentMd || "";
  const heroImage = customized && row!.hero_image != null && row!.hero_image !== "" ? row!.hero_image : def?.hero.heroImage || null;
  const updatedAt = customized ? row!.updated_at : null;
  const ds = row?.design_settings || {};
  const pageLabel = def?.label || title;

  const html = ds.content_mode === "html" ? preserveHtml(content) : renderMarkdown(content);

  const heroHeight = ds.hero_height || "340px";
  const heroAlign = ds.hero_alignment === "center" ? "flex flex-col items-center text-center" : ds.hero_alignment === "right" ? "flex flex-col items-end text-right" : "items-start";
  const subtitleAlign = ds.hero_alignment === "center" ? "mx-auto" : ds.hero_alignment === "right" ? "ml-auto" : "";
  const heroMaxW = ds.content_width || "max-w-4xl";
  const pageIcon = ds.show_icon !== false && (ds.icon || def?.icon) ? (ds.icon || def?.icon || "") : "";
  const showUpdated = ds.show_updated !== false;
  const showTitle = ds.show_title !== false;
  const showSubtitle = ds.show_subtitle !== false;
  const showHero = ds.show_hero !== false;
  const temperature = ds.hero_temperature ?? 0;
  const brightness = ds.hero_brightness ?? 100;
  const heroFilter = temperature > 0
    ? `sepia(${Math.min(temperature, 100)}%) hue-rotate(${Math.round(temperature * 1.5)}deg) brightness(${brightness}%)`
    : `brightness(${brightness}%)`;

  function withAlpha(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const tc = ds.text_color;
  const fullWidth = ds.full_width === true;
  const showBc = ds.show_breadcrumb !== false; // default true
  // Hero uses full width when full_width is enabled - otherwise uses heroMaxW
  const heroContainerClass = fullWidth ? "w-full px-4 md:px-12 lg:px-16" : `${heroMaxW} mx-auto w-full px-4 md:px-12 lg:px-16`;
  const breadcrumb = (
    <div className="text-sm mb-4">
      <Link href="/" className="hover:underline text-white/80" style={{ color: tc ? withAlpha(tc, 0.8) : undefined }}>Home</Link>
      <span className="mx-2 text-white/60" style={{ color: tc ? withAlpha(tc, 0.6) : undefined }}>→</span>
      <span className="font-medium text-white" style={{ color: tc || undefined }}>{pageLabel}</span>
    </div>
  );

  return (
    <div className="w-full">
      {showHero && (heroImage ? (
        <div className="relative overflow-hidden mb-0 flex flex-col justify-center" style={{ minHeight: heroHeight }}>
          <img src={heroImage} alt={title} className="absolute inset-0 w-full h-full object-cover" style={{ filter: heroFilter }} loading="lazy" />
          <div className={`relative z-10 py-16 ${heroAlign} ${heroContainerClass}`}>
            {showBc && breadcrumb}
            {pageIcon && (
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-amber-400/20 border border-amber-300/30 text-3xl mb-5 shadow-lg shadow-black/20 backdrop-blur-sm">
                {pageIcon}
              </div>
            )}
            {showTitle && <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white font-[family-name:var(--font-syne)]" style={{ color: ds.text_color || undefined }}>{title}</h1>}
            {showSubtitle && subtitle && <p className={`text-lg max-w-2xl leading-relaxed text-white/75 ${subtitleAlign}`} style={{ color: tc ? withAlpha(tc, 0.8) : undefined }}>{subtitle}</p>}
            {showUpdated && (def?.hero.updatedLine || updatedAt) && (
              <p className="text-sm text-white/60 mt-4" style={{ color: tc ? withAlpha(tc, 0.6) : undefined }}>
                {def?.hero.updatedLine || (updatedAt ? `Last updated: ${new Date(updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}` : "")}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden border-b border-border/60" style={{ background: ds.hero_bg || "linear-gradient(to bottom right, #020617, #0b1035, #1b1b4b)" }}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.16),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.18),transparent_55%)]" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
          <div className={`relative px-4 md:px-12 lg:px-16 py-16 md:py-20 ${heroAlign}`}>
            <div className={fullWidth ? "w-full" : heroMaxW}>
              {showBc && <div className="mb-6">{breadcrumb}</div>}
              {pageIcon && (
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-amber-400/20 border border-amber-300/30 text-3xl mb-5 shadow-lg shadow-black/20">
                  {pageIcon}
                </div>
              )}
              {showTitle && <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white font-[family-name:var(--font-syne)]" style={{ color: ds.text_color || undefined }}>{title}</h1>}
              {showSubtitle && subtitle && <p className={`text-lg text-white/75 max-w-2xl leading-relaxed ${subtitleAlign}`} style={{ color: tc ? withAlpha(tc, 0.8) : undefined }}>{subtitle}</p>}
              {showUpdated && (def?.hero.updatedLine || updatedAt) && (
                <p className="text-sm text-white/60 mt-4" style={{ color: tc ? withAlpha(tc, 0.6) : undefined }}>
                  {def?.hero.updatedLine || (updatedAt ? `Last updated: ${new Date(updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}` : "")}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="w-full py-10">
        {fullWidth ? (
          <article
            className="prose prose-slate dark:prose-invert prose-headings:font-bold prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed prose-p:text-foreground prose-a:text-accent prose-a:font-medium prose-strong:text-foreground prose-li:text-foreground prose-blockquote:border-accent prose-blockquote:text-foreground max-w-none w-full"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <article
            className="prose prose-slate dark:prose-invert prose-headings:font-bold prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed prose-p:text-foreground prose-a:text-accent prose-a:font-medium prose-strong:text-foreground prose-li:text-foreground prose-blockquote:border-accent prose-blockquote:text-foreground max-w-none w-full px-4 md:px-12 lg:px-16"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
        {children}
      </div>
    </div>
  );
}
