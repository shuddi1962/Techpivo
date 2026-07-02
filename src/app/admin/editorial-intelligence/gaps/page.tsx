"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Target,
  TrendingUp,
  Search,
  AlertTriangle,
  Layers,
  ChevronRight,
} from "lucide-react";

interface Gap {
  id: string;
  topic: string;
  category: string;
  search_volume: number;
  competition_level: "low" | "medium" | "high";
  competitor_coverage: string[];
  gap_type: "competitor_only" | "high_demand_no_coverage" | "trending_not_covered" | "seasonal";
  priority_score: number;
  description?: string;
  recommended_action?: string;
}

export default function ContentGapsPage() {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchGaps();
  }, []);

  async function fetchGaps() {
    setLoading(true);
    try {
      const res = await fetch("/admin/editorial-intelligence/api?section=gaps");
      const data = await res.json();
      setGaps(data.gaps || []);
    } catch {
      setGaps([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredGaps = filter === "all" ? gaps : gaps.filter((g) => g.gap_type === filter);

  const totalVolume = gaps.reduce((sum, g) => sum + (g.search_volume || 0), 0);
  const highPriorityCount = gaps.filter((g) => g.priority_score >= 75).length;

  const gapTypeColors: Record<string, string> = {
    competitor_only: "bg-red-500/10 text-red-400 border-red-500/20",
    high_demand_no_coverage: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    trending_not_covered: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    seasonal: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  const gapTypeLabels: Record<string, string> = {
    competitor_only: "Competitor Only",
    high_demand_no_coverage: "High Demand, No Coverage",
    trending_not_covered: "Trending, Not Covered",
    seasonal: "Seasonal",
  };

  const competitionColors: Record<string, string> = {
    low: "text-green-400",
    medium: "text-yellow-400",
    high: "text-red-400",
  };

  function getPriorityBadge(score: number) {
    if (score >= 85) return "bg-red-500/10 text-red-400 border-red-500/20";
    if (score >= 70) return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    if (score >= 50) return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    return "bg-green-500/10 text-green-400 border-green-500/20";
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/editorial-intelligence"
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Content Gap Analysis</h1>
              <p className="text-sm text-muted-foreground">
                Topics competitors cover that TechPivo doesn&apos;t
              </p>
            </div>
          </div>
          <button
            onClick={fetchGaps}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card hover:bg-accent transition-colors text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Target className="h-4 w-4" />
              Total Gaps
            </div>
            <div className="text-2xl font-bold">{gaps.length}</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <AlertTriangle className="h-4 w-4" />
              High Priority
            </div>
            <div className="text-2xl font-bold text-orange-400">{highPriorityCount}</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Est. Total Search Volume
            </div>
            <div className="text-2xl font-bold">{totalVolume.toLocaleString()}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: "all", label: "All Gaps" },
            { key: "competitor_only", label: "Competitor Only" },
            { key: "high_demand_no_coverage", label: "High Demand" },
            { key: "trending_not_covered", label: "Trending" },
            { key: "seasonal", label: "Seasonal" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "border bg-card hover:bg-accent text-muted-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground text-sm">Loading gaps...</span>
          </div>
        )}

        {/* Gaps List */}
        {!loading && filteredGaps.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-sm">
            No content gaps found.
          </div>
        )}

        {!loading && filteredGaps.length > 0 && (
          <div className="space-y-3">
            {filteredGaps.map((gap) => (
              <div key={gap.id} className="rounded-xl border bg-card p-5 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-semibold">{gap.topic}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${gapTypeColors[gap.gap_type] || "bg-secondary text-secondary-foreground"}`}>
                        {gapTypeLabels[gap.gap_type] || gap.gap_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {gap.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Search className="h-3 w-3" />
                        {gap.search_volume?.toLocaleString()} searches/mo
                      </span>
                      <span className={`flex items-center gap-1 ${competitionColors[gap.competition_level] || ""}`}>
                        Competition: {gap.competition_level}
                      </span>
                    </div>

                    {gap.competitor_coverage && gap.competitor_coverage.length > 0 && (
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="text-muted-foreground">Covered by:</span>
                        {gap.competitor_coverage.map((comp) => (
                          <span
                            key={comp}
                            className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs"
                          >
                            {comp}
                          </span>
                        ))}
                      </div>
                    )}

                    {gap.description && (
                      <p className="text-sm text-muted-foreground mt-2">{gap.description}</p>
                    )}

                    {gap.recommended_action && (
                      <p className="text-sm text-blue-400 mt-2 flex items-center gap-1">
                        <ChevronRight className="h-3 w-3" />
                        {gap.recommended_action}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className={`px-3 py-1 rounded-lg text-sm font-semibold border ${getPriorityBadge(gap.priority_score)}`}>
                      {gap.priority_score}
                    </div>
                    <span className="text-xs text-muted-foreground">Priority</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
