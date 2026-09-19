"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { getToolMeta } from "@/lib/tools-registry";
import { getCategoryDetail } from "@/lib/tools-categories";

interface TrendingTool {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  icon: string;
  usage_count: number;
}

export function TrendingTools({ initialTools }: { initialTools?: TrendingTool[] }) {
  const [tools, setTools] = useState<TrendingTool[]>(initialTools || []);
  const [loading, setLoading] = useState(!initialTools);

  useEffect(() => {
    if (initialTools && initialTools.length > 0) return;
    let mounted = true;
    fetch("/api/public/v1/trending?type=tools&limit=8")
      .then((r) => r.json())
      .then((res) => {
        if (mounted && res.success && res.data?.length > 0) {
          setTools(res.data);
        }
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false };
  }, [initialTools]);

  if (loading || tools.length === 0) return null;

  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <TrendingUp size={18} style={{ color: "hsl(var(--accent))" }} />
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, margin: 0 }}>
          Trending Tools
        </h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {tools.map((t) => {
          const def = getToolMeta(t.slug);
          const Icon = def?.icon;
          const catDetail = getCategoryDetail((t.category || "developer") as any);
          const accent = catDetail.accent;
          const soft = catDetail.soft;
          return (
            <Link
              key={t.slug}
              href={`/tools/${t.slug}`}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: 14,
                borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--card)",
                textDecoration: "none", transition: "all 0.2s",
              }}
              className="tp-tool-card"
            >
              {Icon && (
                <span style={{
                  width: 36, height: 36, borderRadius: 10, display: "inline-flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                  background: soft, color: accent,
                }}>
                  <Icon size={18} />
                </span>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {t.usage_count.toLocaleString()} uses
                </div>
              </div>
              <span style={{ fontSize: 18, color: accent, flexShrink: 0 }}>{String.fromCharCode(8594)}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
