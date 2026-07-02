"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Globe,
  TrendingUp,
  BarChart3,
  Users,
  FileText,
  Zap,
} from "lucide-react";

interface Competitor {
  id: string;
  name: string;
  website: string;
  category_focus: string[];
  publishing_frequency: string;
  trending_topics: string[];
  estimated_domain_authority: number;
  overlap_score: number;
  recent_articles?: number;
  estimated_traffic?: string;
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompetitors();
  }, []);

  async function fetchCompetitors() {
    setLoading(true);
    try {
      const res = await fetch("/admin/editorial-intelligence/api?section=competitors");
      const data = await res.json();
      setCompetitors(data.competitors || []);
    } catch {
      setCompetitors([]);
    } finally {
      setLoading(false);
    }
  }

  const avgDA =
    competitors.length > 0
      ? Math.round(competitors.reduce((sum, c) => sum + (c.estimated_domain_authority || 0), 0) / competitors.length)
      : 0;

  const avgOverlap =
    competitors.length > 0
      ? Math.round(competitors.reduce((sum, c) => sum + (c.overlap_score || 0), 0) / competitors.length)
      : 0;

  const totalTopics = competitors.reduce((sum, c) => sum + (c.trending_topics?.length || 0), 0);

  function getOverlapColor(score: number) {
    if (score >= 70) return "text-red-400";
    if (score >= 40) return "text-yellow-400";
    return "text-green-400";
  }

  function getOverlapBarColor(score: number) {
    if (score >= 70) return "bg-red-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-green-500";
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
              <h1 className="text-2xl font-bold">Competitor Watch</h1>
              <p className="text-sm text-muted-foreground">
                Track competitor publishing, trending topics, and overlap
              </p>
            </div>
          </div>
          <button
            onClick={fetchCompetitors}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card hover:bg-accent transition-colors text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Comparison Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Users className="h-4 w-4" />
              Competitors Tracked
            </div>
            <div className="text-2xl font-bold">{competitors.length}</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <BarChart3 className="h-4 w-4" />
              Avg. Domain Authority
            </div>
            <div className="text-2xl font-bold">{avgDA}</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Zap className="h-4 w-4" />
              Avg. Overlap Score
            </div>
            <div className="text-2xl font-bold">{avgOverlap}%</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Trending Topics (Total)
            </div>
            <div className="text-2xl font-bold">{totalTopics}</div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground text-sm">Loading competitors...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && competitors.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-sm">
            No competitors tracked yet.
          </div>
        )}

        {/* Competitor Cards */}
        {!loading && competitors.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {competitors.map((comp) => (
              <div key={comp.id} className="rounded-xl border bg-card p-5 space-y-4">
                {/* Name & Website */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{comp.name}</h3>
                    <a
                      href={comp.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-blue-400 hover:underline"
                    >
                      <Globe className="h-3 w-3" />
                      {comp.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">DA</div>
                    <div className="text-xl font-bold">{comp.estimated_domain_authority}</div>
                  </div>
                </div>

                {/* Category Focus */}
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Category Focus</div>
                  <div className="flex flex-wrap gap-1">
                    {comp.category_focus?.map((cat) => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Publishing Frequency */}
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Publishing:</span>
                  <span className="font-medium">{comp.publishing_frequency}</span>
                </div>

                {/* Trending Topics */}
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Trending Topics</div>
                  <div className="flex flex-wrap gap-1">
                    {comp.trending_topics?.slice(0, 5).map((topic) => (
                      <span
                        key={topic}
                        className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Overlap Score */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Overlap with TechPivo</span>
                    <span className={`font-semibold ${getOverlapColor(comp.overlap_score)}`}>
                      {comp.overlap_score}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getOverlapBarColor(comp.overlap_score)}`}
                      style={{ width: `${comp.overlap_score}%` }}
                    />
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
