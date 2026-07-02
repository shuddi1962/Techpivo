"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  FileText,
  Plus,
  CheckCircle,
  Clock,
  Loader2,
  XCircle,
  Eye,
  Trash2,
} from "lucide-react";

interface Brief {
  id: string;
  topic: string;
  category: string;
  opportunity_score: number;
  status: "generated" | "reviewing" | "approved" | "generating" | "published" | "discarded";
  created_at: string;
  keywords?: string[];
  estimated_reading_time?: string;
}

export default function BriefsPage() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchBriefs();
  }, []);

  async function fetchBriefs() {
    setLoading(true);
    try {
      const res = await fetch("/admin/editorial-intelligence/api?section=opportunities");
      const data = await res.json();
      setBriefs(data.briefs || data.opportunities || []);
    } catch {
      setBriefs([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredBriefs =
    statusFilter === "all" ? briefs : briefs.filter((b) => b.status === statusFilter);

  const statusConfig: Record<string, { icon: typeof FileText; color: string; bg: string }> = {
    generated: { icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    reviewing: { icon: Eye, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
    approved: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
    generating: { icon: Loader2, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
    published: { icon: CheckCircle, color: "text-green-300", bg: "bg-green-500/5 border-green-500/10" },
    discarded: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  };

  const statusCounts = briefs.reduce(
    (acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  function getScoreBadge(score: number) {
    if (score >= 85) return "bg-green-500/10 text-green-400 border-green-500/20";
    if (score >= 70) return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (score >= 50) return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    return "bg-red-500/10 text-red-400 border-red-500/20";
  }

  async function generateNewBrief() {
    try {
      await fetch("/admin/editorial-intelligence/brief", { method: "POST" });
      fetchBriefs();
    } catch {
      // silent
    }
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
              <h1 className="text-2xl font-bold">Content Briefs</h1>
              <p className="text-sm text-muted-foreground">
                Generated briefs with status tracking
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchBriefs}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card hover:bg-accent transition-colors text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={generateNewBrief}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              Generate New Brief
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: "all", label: "All", count: briefs.length },
            { key: "generated", label: "Generated", count: statusCounts["generated"] || 0 },
            { key: "reviewing", label: "Reviewing", count: statusCounts["reviewing"] || 0 },
            { key: "approved", label: "Approved", count: statusCounts["approved"] || 0 },
            { key: "generating", label: "Generating", count: statusCounts["generating"] || 0 },
            { key: "published", label: "Published", count: statusCounts["published"] || 0 },
            { key: "discarded", label: "Discarded", count: statusCounts["discarded"] || 0 },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                statusFilter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "border bg-card hover:bg-accent text-muted-foreground"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-70">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground text-sm">Loading briefs...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredBriefs.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-sm">
            No briefs found. Generate your first brief to get started.
          </div>
        )}

        {/* Briefs List */}
        {!loading && filteredBriefs.length > 0 && (
          <div className="space-y-3">
            {filteredBriefs.map((brief) => {
              const statusInfo = statusConfig[brief.status] || statusConfig.generated;
              const StatusIcon = statusInfo.icon;
              return (
                <div
                  key={brief.id}
                  className="rounded-xl border bg-card p-5 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold">{brief.topic}</h3>
                        <span
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${statusInfo.bg} ${statusInfo.color}`}
                        >
                          <StatusIcon className={`h-3 w-3 ${brief.status === "generating" ? "animate-spin" : ""}`} />
                          {brief.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span>{brief.category}</span>
                        {brief.estimated_reading_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {brief.estimated_reading_time}
                          </span>
                        )}
                        <span className="text-xs">
                          {new Date(brief.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {brief.keywords && brief.keywords.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {brief.keywords.slice(0, 4).map((kw) => (
                            <span
                              key={kw}
                              className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs"
                            >
                              {kw}
                            </span>
                          ))}
                          {brief.keywords.length > 4 && (
                            <span className="text-xs text-muted-foreground">
                              +{brief.keywords.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className={`px-3 py-1 rounded-lg text-sm font-semibold border ${getScoreBadge(brief.opportunity_score)}`}>
                        {brief.opportunity_score}
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-red-400">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
