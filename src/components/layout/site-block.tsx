"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { renderMarkdown } from "@/lib/markdown";
import { getSiteBlock, type SiteBlockDef } from "@/lib/site-blocks";
import { Megaphone, X } from "lucide-react";

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
  const [bannerDismissed, setBannerDismissed] = useState(false);
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

  useEffect(() => {
    if (!def || def.mode !== "banner" || !row) {
      setBannerDismissed(false);
      return;
    }
    try {
      const sig = `${row.updated_at}|${row.content_md}`;
      setBannerDismissed(localStorage.getItem(`tp_banner_dismiss_${blockKey}`) === sig);
    } catch {
      setBannerDismissed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockKey, def, row]);

  if (!def || !ready || !row || !row.is_active || !row.content_md || row.content_md.trim() === "") return null;

  const html = renderMarkdown(row.content_md);

  if (def.mode === "banner") {
    if (bannerDismissed) return null;
    return (
      <div className="w-full bg-gradient-to-r from-accent via-accent to-accent/70 text-white">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <Megaphone className="w-4 h-4 shrink-0 hidden sm:block opacity-90" />
          <div
            className="site-block-banner flex-1 text-center text-sm md:text-[15px] font-medium leading-relaxed"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <button
            onClick={() => {
              try {
                localStorage.setItem(`tp_banner_dismiss_${blockKey}`, `${row.updated_at}|${row.content_md}`);
              } catch {}
              setBannerDismissed(true);
            }}
            aria-label="Dismiss announcement"
            className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/15 hover:bg-white/30 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
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