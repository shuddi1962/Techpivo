"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getToolDef } from "@/lib/tools";
import { getCategoryDetail } from "@/lib/tools-categories";

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
export function ActiveToolGroup({ tools }: { tools: { slug: string; name: string; description: string }[] }) {
  const [activeSlugs, setActiveSlugs] = useState<Set<string> | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchActiveSlugs().then((slugs) => {
      if (mounted) setActiveSlugs(slugs);
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
        return (
          <Link
            key={t.slug}
            href={`/tools/${t.slug}`}
            className="tp-tool-card"
            style={{
              display: "flex", flexDirection: "column", gap: 12, padding: 20, borderRadius: 14,
              border: "1.5px solid var(--border)", background: "var(--card)",
              textDecoration: "none", transition: "all 0.2s",
            }}
          >
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
                Free tool
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
        )
      })}
    </>
  );
}