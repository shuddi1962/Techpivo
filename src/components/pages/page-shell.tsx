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
  const customized = !!row && !!row.is_published;

  const title = customized && row!.title ? row!.title : def.hero.title;
  const subtitle = customized && row!.subtitle != null && row!.subtitle !== "" ? row!.subtitle : def.hero.subtitle;
  const content = customized && row!.content_md != null && row!.content_md !== "" ? row!.content_md : def.contentMd;
  const heroImage = customized && row!.hero_image != null && row!.hero_image !== "" ? row!.hero_image : def.hero.heroImage;
  const updatedAt = customized ? row!.updated_at : null;

  const html = renderMarkdown(content);

  return (
    <div className="w-full">
      {heroImage ? (
        <div className="relative overflow-hidden mb-0 min-h-[320px] flex items-center">
          <Image src={heroImage} alt={title} width={1200} height={675} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 px-4 md:px-12 lg:px-16 py-16 text-white max-w-4xl">
            <div className="text-sm mb-3">
              <Link href="/" className="text-white/80 hover:text-white hover:underline">Home</Link>
              <span className="mx-2 text-white/60">→</span>
              <span className="font-medium">{def.label}</span>
            </div>
            <div className="text-5xl mb-4">{def.icon}</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
            <p className="text-lg text-white/80 max-w-2xl leading-relaxed">{subtitle}</p>
            {(def.hero.updatedLine || updatedAt) && (
              <p className="text-sm text-white/60 mt-4">
                {def.hero.updatedLine || `Last updated: ${new Date(updatedAt!).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="border-b bg-gradient-to-br from-[#FFF7E6] via-card to-card dark:from-[#1a1606] px-4 md:px-12 lg:px-16 py-14 md:py-16">
          <div className="max-w-4xl">
            <div className="text-sm mb-3 text-muted-foreground">
              <Link href="/" className="text-accent hover:underline">Home</Link>
              <span className="mx-2">→</span>
              <span className="font-medium text-foreground">{def.label}</span>
            </div>
            <div className="text-5xl mb-4">{def.icon}</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">{subtitle}</p>
            {(def.hero.updatedLine || updatedAt) && (
              <p className="text-sm text-muted-foreground/70 mt-4">
                {def.hero.updatedLine || `Last updated: ${new Date(updatedAt!).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`}
              </p>
            )}
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