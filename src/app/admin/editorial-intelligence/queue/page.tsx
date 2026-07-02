"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface QueueItem {
  id: string;
  title: string;
  category: string;
  stage: string;
  priority: "high" | "medium" | "low";
  time_in_queue: string;
  created_at: string;
  assigned_to?: string;
}

const STAGES = [
  "researching",
  "keyword_analysis",
  "draft_generation",
  "fact_verification",
  "seo_optimization",
  "image_processing",
  "editorial_review",
  "publishing",
  "published",
];

const stageLabels: Record<string, string> = {
  researching: "Researching",
  keyword_analysis: "Keyword Analysis",
  draft_generation: "Draft Generation",
  fact_verification: "Fact Verification",
  seo_optimization: "SEO Optimization",
  image_processing: "Image Processing",
  editorial_review: "Editorial Review",
  publishing: "Publishing",
  published: "Published",
};

export default function QueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQueue();
  }, []);

  async function fetchQueue() {
    setLoading(true);
    try {
      const res = await fetch("/admin/editorial-intelligence/api?section=queue");
      const data = await res.json();
      setItems(data.queue || data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const priorityColors: Record<string, string> = {
    high: "text-red-400",
    medium: "text-yellow-400",
    low: "text-green-400",
  };

  const priorityBg: Record<string, string> = {
    high: "bg-red-500/10 border-red-500/20",
    medium: "bg-yellow-500/10 border-yellow-500/20",
    low: "bg-green-500/10 border-green-500/20",
  };

  function getStageIndex(stage: string): number {
    const idx = STAGES.indexOf(stage);
    return idx >= 0 ? idx : 0;
  }

  function getStageProgress(stage: string): number {
    const idx = getStageIndex(stage);
    return Math.round(((idx + 1) / STAGES.length) * 100);
  }

  const stageCount = items.reduce(
    (acc, item) => {
      acc[item.stage] = (acc[item.stage] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const publishedCount = items.filter((i) => i.stage === "published").length;
  const inProgressCount = items.filter((i) => i.stage !== "published").length;

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
              <h1 className="text-2xl font-bold">Content Queue</h1>
              <p className="text-sm text-muted-foreground">
                Articles in the publishing pipeline
              </p>
            </div>
          </div>
          <button
            onClick={fetchQueue}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card hover:bg-accent transition-colors text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Pipeline Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <BarChart3 className="h-4 w-4" />
              Total Items
            </div>
            <div className="text-2xl font-bold">{items.length}</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Loader2 className="h-4 w-4" />
              In Progress
            </div>
            <div className="text-2xl font-bold text-blue-400">{inProgressCount}</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <CheckCircle className="h-4 w-4" />
              Published
            </div>
            <div className="text-2xl font-bold text-green-400">{publishedCount}</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <AlertCircle className="h-4 w-4" />
              Stages Active
            </div>
            <div className="text-2xl font-bold">{Object.keys(stageCount).length}</div>
          </div>
        </div>

        {/* Pipeline Overview */}
        <div className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold text-sm mb-3">Pipeline Stages</h2>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {STAGES.map((stage, idx) => {
              const count = stageCount[stage] || 0;
              const isActive = count > 0;
              return (
                <div key={stage} className="flex items-center">
                  <div
                    className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {stageLabels[stage]}
                    {isActive && (
                      <span className="ml-1 font-semibold">{count}</span>
                    )}
                  </div>
                  {idx < STAGES.length - 1 && (
                    <div className="w-3 h-px bg-border mx-0.5 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground text-sm">Loading queue...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-sm">
            No articles in the queue.
          </div>
        )}

        {/* Queue Items */}
        {!loading && items.length > 0 && (
          <div className="space-y-3">
            {items
              .sort((a, b) => getStageIndex(a.stage) - getStageIndex(b.stage))
              .map((item) => {
                const progress = getStageProgress(item.stage);
                const stageIdx = getStageIndex(item.stage);
                const isPublished = item.stage === "published";

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border bg-card p-5 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold">{item.title}</h3>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                          <span>{item.category}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.time_in_queue}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs border ${priorityBg[item.priority] || ""} ${priorityColors[item.priority] || ""}`}
                        >
                          {item.priority}
                        </span>
                      </div>
                    </div>

                    {/* Stage Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Stage: <span className="font-medium text-foreground">{stageLabels[item.stage] || item.stage}</span>
                        </span>
                        <span className="text-muted-foreground">{progress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isPublished ? "bg-green-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      {/* Stage Dots */}
                      <div className="flex items-center gap-1">
                        {STAGES.map((stage, idx) => (
                          <div
                            key={stage}
                            className={`h-1.5 flex-1 rounded-full ${
                              idx <= stageIdx
                                ? isPublished
                                  ? "bg-green-500"
                                  : "bg-blue-500"
                                : "bg-secondary"
                            }`}
                            title={stageLabels[stage]}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
