import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { renderMarkdown } from "@/lib/markdown";
import { getSitePage } from "@/lib/pages";

interface SitePageRow {
  slug: string;
  title: string | null;
  subtitle: string | null;
  content_md: string | null;
  hero_image: string | null;
  is_published: boolean | null;
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
  if (!def) notFound();

  const row = await fetchPageData(slug);
  if (row && !row.is_published) notFound();
  const customized = !!row && !!row.is_published;

  const title = customized && row!.title ? row!.title : def.hero.title;
  const subtitle = customized && row!.subtitle != null && row!.subtitle !== "" ? row!.subtitle : def.hero.subtitle;
  const content = customized && row!.content_md != null && row!.content_md !== "" ? row!.content_md : def.contentMd;
  const heroImage = customized && row!.hero_image != null && row!.hero_image !== "" ? row!.hero_image : def.hero.heroImage;
  const updatedAt = customized ? row!.updated_at : null;

  const html = renderMarkdown(content);

  const breadcrumb = (
    <div className="text-sm mb-4">
      <Link href="/" className="text-white/80 hover:text-white hover:underline">Home</Link>
      <span className="mx-2 text-white/60">→</span>
      <span className="font-medium text-white">{def.label}</span>
    </div>
  );

  return (
    <div className="w-full">
      {heroImage ? (
        <div className="relative overflow-hidden mb-0 min-h-[340px] flex items-center">
          <Image src={heroImage} alt={title} width={1200} height={675} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
          <div className="relative z-10 px-4 md:px-12 lg:px-16 py-16 text-white max-w-4xl">
            {breadcrumb}
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-amber-400/20 border border-amber-300/30 text-3xl mb-5 shadow-lg shadow-black/20 backdrop-blur-sm">
              {def.icon}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 font-[family-name:var(--font-syne)]">{title}</h1>
            <p className="text-lg text-white/80 max-w-2xl leading-relaxed">{subtitle}</p>
            {(def.hero.updatedLine || updatedAt) && (
              <p className="text-sm text-white/60 mt-4">
                {def.hero.updatedLine || `Last updated: ${new Date(updatedAt!).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-slate-950 via-[#0b1035] to-[#1b1b4b]">
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
          <div className="relative px-4 md:px-12 lg:px-16 py-16 md:py-20">
            <div className="max-w-4xl">
              <div className="mb-6">{breadcrumb}</div>
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-amber-400/20 border border-amber-300/30 text-3xl mb-5 shadow-lg shadow-black/20">
                {def.icon}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white font-[family-name:var(--font-syne)]">{title}</h1>
              <p className="text-lg text-white/75 max-w-2xl leading-relaxed">{subtitle}</p>
              {(def.hero.updatedLine || updatedAt) && (
                <p className="text-sm text-white/60 mt-4">
                  {def.hero.updatedLine || `Last updated: ${new Date(updatedAt!).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 md:px-12 lg:px-16 py-10">
        <article
          className="max-w-4xl prose prose-slate dark:prose-invert prose-headings:font-bold prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed prose-p:text-muted-foreground prose-a:text-accent prose-a:font-medium prose-strong:text-foreground prose-li:text-muted-foreground prose-blockquote:border-accent prose-blockquote:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {children}
      </div>
    </div>
  );
}