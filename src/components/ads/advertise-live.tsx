"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Eye, MousePointerClick, Radio, LayoutGrid, BadgeCheck, PlayCircle, TrendingUp, Megaphone
} from "lucide-react";
import { formatMoney } from "@/lib/ads";

interface Placement {
  id: string;
  name: string;
  position: string;
  min_bid_cpm: number;
  min_bid_cpc: number;
  supports_video: boolean;
  est_impressions: number | null;
}

interface AdStats {
  live_campaigns: number;
  total_campaigns: number;
  impressions: number;
  clicks: number;
  placements: Placement[];
}

const POSITION_ICONS: Record<string, string> = {
  top: "📰",
  header: "🖼️",
  sidebar: "📌",
  infeed: "🧵",
  bottom: "👇",
  sticky: "📎",
  popup: "🪟",
  native: "💬",
};

export function AdvertiseLive() {
  const [stats, setStats] = useState<AdStats | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ads/stats", { cache: "no-store" });
      if (res.ok) setStats(await res.json());
    } catch {
      // keep previous state
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, 60000);
    return () => clearInterval(poll);
  }, [load]);

  const ctr = stats && stats.impressions > 0 ? ((stats.clicks / stats.impressions) * 100).toFixed(2) : "0.00";

  return (
    <div className="mx-auto max-w-5xl space-y-12 py-10">
      {/* Live stats band */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8">
        <div className="flex items-center gap-2 mb-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
          </span>
          <span className="text-sm text-muted-foreground">Real-time marketplace performance</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Active campaigns", value: stats ? String(stats.live_campaigns) : "—", icon: Radio, cls: "text-blue-600 bg-blue-50 dark:bg-blue-500/10" },
            { label: "Impressions delivered", value: stats ? stats.impressions.toLocaleString() : "—", icon: Eye, cls: "text-purple-600 bg-purple-50 dark:bg-purple-500/10" },
            { label: "Clicks", value: stats ? stats.clicks.toLocaleString() : "—", icon: MousePointerClick, cls: "text-amber-600 bg-amber-50 dark:bg-amber-500/10" },
            { label: "Avg. CTR", value: stats ? `${ctr}%` : "—", icon: TrendingUp, cls: "text-green-600 bg-green-50 dark:bg-green-500/10" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border/60 bg-background p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${k.cls}`}>
                <k.icon className="h-4 w-4" />
              </div>
              <div className="text-xl font-bold">{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: LayoutGrid, title: "1. Pick a placement", desc: "Choose where your ad runs — homepage, article pages, sidebar or category feeds." },
          { icon: BadgeCheck, title: "2. Set your budget", desc: "Pay-per-click or per-impression. You control the bid and daily budget. No hidden fees." },
          { icon: TrendingUp, title: "3. Track results live", desc: "Impressions, clicks and spend update in real time inside your account dashboard." },
        ].map((s) => (
          <div key={s.title} className="rounded-2xl border border-border/60 bg-card p-5">
            <s.icon className="h-6 w-6 text-primary mb-3" />
            <h3 className="font-semibold mb-1">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Placements */}
      <div>
        <h2 className="text-xl font-bold mb-1">Available placements</h2>
        <p className="text-sm text-muted-foreground mb-4">Starting bid floors (CPM / CPC in NGN)</p>
        {stats && stats.placements.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.placements.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border/60 bg-card p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{POSITION_ICONS[p.position] || "📢"}</span>
                  {p.supports_video && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-purple-600 bg-purple-50 dark:bg-purple-500/10 rounded-full px-2 py-0.5">
                      <PlayCircle className="h-3 w-3" /> Video
                    </span>
                  )}
                </div>
                <h3 className="font-semibold">{p.name}</h3>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p>CPM from <span className="font-semibold text-foreground">{formatMoney(p.min_bid_cpm, "NGN")}</span> · CPC from <span className="font-semibold text-foreground">{formatMoney(p.min_bid_cpc, "NGN")}</span></p>
                  {p.est_impressions ? <p>~{Number(p.est_impressions).toLocaleString()} monthly impressions</p> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Placements load live from the marketplace.
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-[#0b1035] to-[#1b1b4b] p-8 md:p-12 text-center text-white">
        <Megaphone className="h-8 w-8 mx-auto mb-4 text-amber-400" />
        <h2 className="text-2xl md:text-3xl font-bold font-[family-name:var(--font-syne)] mb-2">
          Ready to reach tech audiences across Africa &amp; beyond?
        </h2>
        <p className="text-white/70 max-w-xl mx-auto mb-6">
          Create your campaign in minutes — set your own budget and bid, then watch delivery live.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/account/ads/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-all hover:from-amber-300 hover:to-amber-400"
          >
            Start a campaign <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/account/ads"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            Manage my ads
          </Link>
        </div>
      </div>
    </div>
  );
}