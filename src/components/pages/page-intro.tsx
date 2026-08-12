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
}

export default function PageIntro({ slug }: { slug: string }) {
  const def = getSitePage(slug);
  const supabase = createClient();
  const [row, setRow] = useState<IntroRow | null>(null);
  const [show, setShow] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.from("site_pages").select("*").eq("slug", slug).maybeSingle();
      if (!mounted) return;
      const r = (data as IntroRow | null) || null;
      setRow(r);
      setShow(
        !!r &&
          !!r.is_published &&
          (!!(r.content_md && r.content_md.trim() !== "") || !!(r.title && r.title.trim() !== "") || !!(r.hero_image && r.hero_image.trim() !== ""))
      );
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

  if (!def || !show || !row) return null;

  const html = renderMarkdown(row.content_md || "");

  return (
    <div className="mb-10">
      <div className="relative overflow-hidden rounded-2xl border min-h-[160px]">
        {row.hero_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.hero_image} alt={row.title || def.label} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 px-6 py-8 text-white">
          {row.title && <h1 className="text-3xl font-bold mb-2">{row.title}</h1>}
          {row.subtitle && <p className="text-white/85 text-base max-w-2xl">{row.subtitle}</p>}
        </div>
      </div>
      {row.content_md && row.content_md.trim() !== "" && (
        <article
          className="page-intro-body px-6 py-6 prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-p:leading-relaxed prose-p:text-muted-foreground prose-a:text-accent prose-strong:text-foreground prose-blockquote:border-accent prose-li:text-muted-foreground prose-h2:text-2xl"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}