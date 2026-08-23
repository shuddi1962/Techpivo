"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { renderMarkdown } from "@/lib/markdown";
import { getSitePage } from "@/lib/pages";

interface IntroRow {
  slug: string;
  title: string | null;
  subtitle: string | null;
  content_md: string | null;
  hero_image: string | null;
  is_published: boolean | null;
  updated_at: string | null;
  design_settings: { hero_bg?: string; text_color?: string; content_width?: string; hero_alignment?: string; hero_height?: string } | null;
}

export default function PageIntro({ slug }: { slug: string }) {
  const def = getSitePage(slug);
  const supabase = createClient();
  const [row, setRow] = useState<IntroRow | null>(null);
  const [loaded, setLoaded] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.from("site_pages").select("*").eq("slug", slug).maybeSingle();
      if (!mounted) return;
      setRow((data as IntroRow | null) || null);
      setLoaded(true);
    };
    load();
    const channel = supabase
      .channel(`page_intro_${slug}_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_pages", filter: `slug=eq.${slug}` }, () => load())
      .subscribe();
    channelRef.current = channel;
    return () => {
      mounted = false;
      supabase.removeChannel(channelRef.current!);
    };
  }, [supabase, slug]);

  if (!def || !loaded) return null;

  const published = !!row && !!row.is_published;
  const hasCustom =
    published &&
    (!!(row.content_md && row.content_md.trim() !== "") ||
      !!(row.title && row.title.trim() !== "") ||
      !!(row.subtitle && row.subtitle.trim() !== "") ||
      !!(row.hero_image && row.hero_image.trim() !== ""));
  if (!hasCustom && !def.hero.heroImage) return null;

  const title = (published && row.title) || def.hero.title;
  const subtitle = (published && row.subtitle) || def.hero.subtitle;
  const heroImage = (published && row.hero_image) || def.hero.heroImage;
  const body = hasCustom && row.content_md && row.content_md.trim() !== "" ? row.content_md : def.contentMd;
  const html = renderMarkdown(body);
  const ds = row?.design_settings || {};
  const heroHeight = ds.hero_height || "220px";
  const heroAlign = ds.hero_alignment === "center" ? "items-center text-center" : ds.hero_alignment === "right" ? "items-end text-right" : "items-start";

  return (
    <div className="mb-10">
      <div className="relative overflow-hidden rounded-2xl border" style={{ minHeight: heroHeight }}>
        {heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImage} alt={title || def.label} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className={`relative z-10 px-6 py-8 text-white flex flex-col justify-end ${heroAlign}`}>
          {title && <h1 className="text-3xl font-bold mb-2" style={{ color: ds.text_color || undefined }}>{title}</h1>}
          {subtitle && <p className="text-white/85 text-base max-w-2xl" style={{ color: ds.text_color ? "rgba(255,255,255,0.85)" : undefined }}>{subtitle}</p>}
        </div>
      </div>
      {body.trim() !== "" && (
        <article
          className="page-intro-body px-6 py-6 prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-p:leading-relaxed prose-p:text-muted-foreground prose-a:text-accent prose-strong:text-foreground prose-blockquote:border-accent prose-li:text-muted-foreground prose-h2:text-2xl"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
