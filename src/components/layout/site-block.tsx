"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { renderMarkdown } from "@/lib/markdown";
import { getSiteBlock, type SiteBlockDef } from "@/lib/site-blocks";

interface BlockRow {
  block_key: string;
  title: string | null;
  content_md: string | null;
  is_active: boolean | null;
  updated_at: string | null;
}

export default function SiteBlock({ blockKey }: { blockKey: string }) {
  const def: SiteBlockDef | undefined = getSiteBlock(blockKey);
  const supabase = createClient();
  const [row, setRow] = useState<BlockRow | null>(null);
  const [ready, setReady] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!def) return;
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.from("site_blocks").select("*").eq("block_key", blockKey).maybeSingle();
      if (!mounted) return;
      setRow((data as BlockRow | null) || null);
      setReady(true);
    };
    load();
    const channel = supabase
      .channel(`site_block_${blockKey}_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_blocks", filter: `block_key=eq.${blockKey}` }, () => load())
      .subscribe();
    channelRef.current = channel;
    return () => {
      mounted = false;
      supabase.removeChannel(channelRef.current!);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockKey]);

  if (!def || !ready || !row || !row.is_active || !row.content_md || row.content_md.trim() === "") return null;

  const html = renderMarkdown(row.content_md);

  if (def.mode === "banner") {
    return (
      <div className="w-full bg-accent text-white text-center py-2 px-4 text-sm font-medium">
        <span dangerouslySetInnerHTML={{ __html: html }} className="site-block-banner" />
      </div>
    );
  }

  if (def.mode === "links") {
    return (
      <div>
        <h3 className="footer-col-title">{row.title || def.label}</h3>
        <div
          className="site-block-links footer-col-links"
          dangerouslySetInnerHTML={{ __html: html.replace(/<p>/g, "").replace(/<\/p>/g, "") }}
        />
      </div>
    );
  }

  if (def.mode === "intro") {
    return (
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="border border-accent/20 bg-accent/5 rounded-2xl p-8 md:p-10">
          {row.title && <h2 className="text-2xl md:text-3xl font-bold mb-3">{row.title}</h2>}
          <div
            className="site-block-intro text-muted-foreground leading-relaxed prose prose-slate dark:prose-invert max-w-none prose-a:text-accent prose-strong:text-foreground prose-headings:text-foreground overflow-hidden"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </section>
    );
  }

  // text mode
  return (
    <p className="footer-about-block">
      <span className="site-block-text" dangerouslySetInnerHTML={{ __html: html.replace(/<p>/g, "").replace(/<\/p>/g, "") }} />
    </p>
  );
}