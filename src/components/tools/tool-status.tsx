"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
      {shown.map((t) => (
        <Link
          key={t.slug}
          href={`/tools/${t.slug}`}
          className="tp-tool-card"
          style={{
            display: "block", padding: 20, borderRadius: 12,
            border: "1px solid var(--border)", background: "var(--card)",
            textDecoration: "none", transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{t.name}</div>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>{t.description}</p>
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>Use Tool →</div>
        </Link>
      ))}
    </>
  );
}