"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getToolDef } from "@/lib/tools";
import { getCategoryDetail } from "@/lib/tools-categories";
import { useToolStats, formatUsageCount } from "@/lib/use-tool-stats";
import { useCompareTools } from "@/lib/compare-tools";
import { Check, Plus } from "lucide-react";

let activeSlugsPromise: Promise<Set<string>> | null = null;

function fetchActiveSlugs(): Promise<Set<string>> {
  if (activeSlugsPromise) return activeSlugsPromise;
  activeSlugsPromise = (async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("tools").select("slug");
      if (error || !data) return new Set<string>();
      return new Set(data.map((t) => t.slug));
    } catch {
      return new Set<string>();
    }
  })().finally(() => { activeSlugsPromise = null });
  return activeSlugsPromise;
}

// Renders children only while the tool is active in the database (public RLS
// only returns active rows, so absence = inactive/missing). Keeps the SSG
// shell for SEO while reflecting live admin toggles.
export function ToolStatusGate({ slug, children, fallback }: { slug: string; children: React.ReactNode; fallback?: React.ReactNode }) {
  const [active, setActive] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchActiveSlugs().then((slugs) => {
      if (mounted) setActive(slugs.has(slug));
    });
    return () => { mounted = false };
  }, [slug]);

  if (active === null) {
    return (
      <div style={{ padding: 32, textAlign: "center", fontSize: 14, color: "var(--muted)" }}>
        Loading tool…
      </div>
    );
  }
  if (!active) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
          This tool is currently unavailable
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
          It may be temporarily disabled for maintenance. Please check back soon.
        </div>
        {fallback}
      </div>
    );
  }
  return <>{children}</>;
}

// Hub grid: hides tool cards that are inactive in the database.
// Fetches usage counts + trending status from the tool-stats API.
export function ActiveToolGroup({ tools }: { tools: { slug: string; name: string; description: string }[] }) {
  const [activeSlugs, setActiveSlugs] = useState<Set<string> | null>(null);
  const slugs = tools.map((t) => t.slug);
  const { stats } = useToolStats(slugs);
  const { has, toggle, isFull } = useCompareTools();

  useEffect(() => {
    let mounted = true;
    fetchActiveSlugs().then((s) => {
      if (mounted) setActiveSlugs(s);
    });
    return () => { mounted = false };
  }, []);

  const shown = activeSlugs === null ? tools : tools.filter((t) => activeSlugs.has(t.slug));
  if (shown.length === 0) return null;
  return (
    <>
      {shown.map((t) => {
        const def = getToolDef(t.slug);
        const Icon = def?.icon;
        const accent = def ? getCategoryDetail(def.category).accent : "#F59E0B";
        const soft = def ? getCategoryDetail(def.category).soft : "#FFFBEB";
        const usageText = formatUsageCount(stats[t.slug]?.usage_count ?? 0);
        const trending = stats[t.slug]?.trending ?? false;
        const compared = has(t.slug);
        return (
          <div
            key={t.slug}
            className="tp-tool-card"
            style={{
              display: "flex", flexDirection: "column", gap: 12, padding: 20, borderRadius: 14,
              border: "1.5px solid var(--border)", background: "var(--card)",
              transition: "all 0.2s", position: "relative",
            }}
          >
            {/* Compare checkbox */}
            <button
              onClick={(e) => {
                e.preventDefault();
                toggle(t.slug);
              }}
              disabled={!compared && isFull}
              title={compared ? "Remove from compare" : isFull ? "Compare is full (max 4)" : "Add to compare"}
              aria-label={compared ? `Remove ${t.name} from compare` : `Add ${t.name} to compare`}
              style={{
                position: "absolute", top: 12, left: 12, zIndex: 10,
                width: 22, height: 22, borderRadius: 6,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                border: compared ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                background: compared ? "var(--accent)" : "var(--card)",
                color: compared ? "#fff" : "var(--muted)",
                cursor: !compared && isFull ? "not-allowed" : "pointer",
                opacity: !compared && isFull ? 0.4 : 1,
                transition: "all 0.15s",
              }}
            >
              {compared ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            </button>

            <Link href={`/tools/${t.slug}`} style={{ textDecoration: "none", display: "contents" }}>
              {trending && (
                <span style={{
                  position: "absolute", top: 12, right: 12, fontSize: 10, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: 0.5,
                  padding: "3px 8px", borderRadius: 999,
                  background: "#FEF3C7", color: "#92400E", lineHeight: 1,
                }}>
                  Trending
                </span>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {Icon && (
                  <span
                    style={{
                      width: 38, height: 38, borderRadius: 10, display: "inline-flex",
                      alignItems: "center", justifyContent: "center", flexShrink: 0,
                      background: soft, color: accent,
                    }}
                  >
                    <Icon size={19} />
                  </span>
                )}
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", lineHeight: 1.25 }}>{t.name}</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.55, flexGrow: 1 }}>{t.description}</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: accent }}>
                  {usageText ? `${usageText} uses` : "Free tool"}
                </span>
                <span
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700,
                    padding: "6px 14px", borderRadius: 999, background: accent, color: "#ffffff",
                  }}
                >
                  Use Tool →
                </span>
              </div>
            </Link>
          </div>
        )
      })}
    </>
  );
}