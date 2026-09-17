"use client";

import { useEffect, useRef, useState } from "react";

interface ToolStat {
  usage_count: number;
  trending: boolean;
}

interface ToolStatsResult {
  stats: Record<string, ToolStat>;
  loading: boolean;
}

/**
 * Fetches usage counts + trending badges for a batch of tool slugs.
 * Deduplicates concurrent requests and caches results in-module (5 min).
 */
const moduleCache: Record<string, ToolStat> = {};
const inflight: Map<string, Promise<Record<string, ToolStat>>> = new Map();

export function useToolStats(slugs: string[]): ToolStatsResult {
  const [stats, setStats] = useState<Record<string, ToolStat>>(() => {
    // Pre-populate from module cache on first render
    const initial: Record<string, ToolStat> = {};
    for (const s of slugs) {
      if (moduleCache[s]) initial[s] = moduleCache[s];
    }
    return initial;
  });
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (slugs.length === 0) {
      setLoading(false);
      return;
    }

    // Check which slugs we still need
    const needed = slugs.filter((s) => !moduleCache[s]);
    if (needed.length === 0) {
      // All cached
      const cached: Record<string, ToolStat> = {};
      for (const s of slugs) cached[s] = moduleCache[s];
      setStats(cached);
      setLoading(false);
      return;
    }

    const key = needed.sort().join(",");

    async function fetchStats() {
      try {
        // Deduplicate in-flight requests for same slug set
        let promise = inflight.get(key);
        if (!promise) {
          promise = fetch(`/api/public/v1/tool-stats?slugs=${encodeURIComponent(key)}`)
            .then((r) => r.json())
            .then((json) => {
              if (json.success && json.data) {
                // Update module cache
                for (const [slug, stat] of Object.entries<ToolStat>(json.data)) {
                  moduleCache[slug] = stat;
                }
                return json.data as Record<string, ToolStat>;
              }
              return {} as Record<string, ToolStat>;
            })
            .catch(() => ({} as Record<string, ToolStat>))
            .finally(() => {
              inflight.delete(key);
            });
          inflight.set(key, promise);
        }

        const result = await promise;
        if (!mountedRef.current) return;

        const merged: Record<string, ToolStat> = {};
        for (const s of slugs) {
          merged[s] = result[s] || moduleCache[s] || { usage_count: 0, trending: false };
        }
        setStats(merged);
        setLoading(false);
      } catch {
        if (mountedRef.current) setLoading(false);
      }
    }

    fetchStats();

    return () => {
      mountedRef.current = false;
    };
  }, [slugs.join(",")]);

  return { stats, loading };
}

/**
 * Format usage count for display: 1200 → "1.2K", 50 → "50"
 */
export function formatUsageCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  if (count === 0) return "";
  return String(count);
}
