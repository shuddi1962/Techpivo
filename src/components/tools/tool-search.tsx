"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { TOOL_META, type ToolMeta } from "@/lib/tools-metadata";
import { getToolMeta } from "@/lib/tools-registry";
import { getCategoryDetail } from "@/lib/tools-categories";

const allTools: ToolMeta[] = Object.values(TOOL_META);

export function ToolSearch() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return allTools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.keywords.some((k) => k.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q)
    );
  }, [query]);

  const showResults = query.trim().length > 0;

  return (
    <div style={{ marginBottom: 32, position: "relative" }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 16px", borderRadius: 12,
          border: "1.5px solid var(--border)", background: "var(--card)",
          transition: "border-color 0.2s",
        }}
      >
        <Search size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 51 free tools..."
          style={{
            flex: 1, border: "none", outline: "none", background: "transparent",
            fontSize: 14, color: "var(--text)", fontFamily: "inherit",
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 24, height: 24, borderRadius: 6, border: "none",
              background: "var(--muted)", color: "var(--text)", cursor: "pointer",
              padding: 0,
            }}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showResults && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
          marginTop: 6, padding: results.length === 0 ? 16 : 8,
          borderRadius: 12, border: "1.5px solid var(--border)",
          background: "var(--card)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          maxHeight: 360, overflowY: "auto",
        }}>
          {results.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, padding: "8px 0" }}>
              No tools found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", padding: "4px 8px 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>
                {results.length} tool{results.length !== 1 ? "s" : ""} found
              </div>
              {results.map((t) => {
                const def = getToolMeta(t.slug);
                const Icon = def?.icon;
                const cat = getCategoryDetail(t.category);
                return (
                  <Link
                    key={t.slug}
                    href={`/tools/${t.slug}`}
                    onClick={() => setQuery("")}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 8px",
                      borderRadius: 8, textDecoration: "none", transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--muted)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {Icon && (
                      <span style={{
                        width: 32, height: 32, borderRadius: 8, display: "inline-flex",
                        alignItems: "center", justifyContent: "center", flexShrink: 0,
                        background: cat.soft, color: cat.accent,
                      }}>
                        <Icon size={16} />
                      </span>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.description}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                      letterSpacing: 0.3, color: cat.accent, background: cat.soft,
                      padding: "3px 8px", borderRadius: 6, flexShrink: 0,
                    }}>
                      {cat.label}
                    </span>
                  </Link>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
