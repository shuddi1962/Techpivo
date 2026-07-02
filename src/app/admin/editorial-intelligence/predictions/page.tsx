"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Clock,
  Target,
  BookOpen,
  TrendingUp,
} from "lucide-react";

interface Prediction {
  id: string;
  topic: string;
  probability: number;
  confidence: "high" | "medium" | "low";
  time_window: string;
  recommendation: string;
  sources: string[];
  category: string;
  description?: string;
}

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPredictions();
  }, []);

  async function fetchPredictions() {
    setLoading(true);
    try {
      const res = await fetch("/admin/editorial-intelligence/api?section=trends");
      const data = await res.json();
      setPredictions(data.predictions || data.trends || []);
    } catch {
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }

  const confidenceColors: Record<string, string> = {
    high: "bg-green-500/10 text-green-400 border-green-500/20",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    low: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  function getProbabilityBarColor(prob: number) {
    if (prob >= 80) return "bg-green-500";
    if (prob >= 60) return "bg-blue-500";
    if (prob >= 40) return "bg-yellow-500";
    return "bg-red-500";
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
              <h1 className="text-2xl font-bold">AI Predictions</h1>
              <p className="text-sm text-muted-foreground">
                Emerging topics with probability scores and time windows
              </p>
            </div>
          </div>
          <button
            onClick={fetchPredictions}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card hover:bg-accent transition-colors text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* How It Works */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <h2 className="font-semibold text-sm">How Predictions Work</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The AI analyzes Google Trends data, RSS feed patterns, social media signals, product
            launch calendars, and historical publishing performance to predict which topics are
            likely to trend. Each prediction includes a probability score (0–100%), confidence level,
            recommended time window for publishing, and actionable next steps. Higher probability and
            confidence scores indicate stronger signals.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground text-sm">Loading predictions...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && predictions.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-sm">
            No predictions available yet.
          </div>
        )}

        {/* Prediction Grid */}
        {!loading && predictions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {predictions.map((pred) => (
              <div
                key={pred.id}
                className="rounded-xl border bg-card p-5 space-y-4 hover:bg-accent/50 transition-colors"
              >
                {/* Topic & Category */}
                <div>
                  <h3 className="font-semibold text-base mb-1">{pred.topic}</h3>
                  <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs">
                    {pred.category}
                  </span>
                </div>

                {/* Probability Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Probability</span>
                    <span className="font-semibold">{pred.probability}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getProbabilityBarColor(pred.probability)}`}
                      style={{ width: `${pred.probability}%` }}
                    />
                  </div>
                </div>

                {/* Confidence & Time Window */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3 w-3 text-muted-foreground" />
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${confidenceColors[pred.confidence] || "bg-secondary text-secondary-foreground"}`}>
                      {pred.confidence} confidence
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {pred.time_window}
                  </div>
                </div>

                {/* Recommendation */}
                <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-blue-400 mb-1">
                    <BookOpen className="h-3 w-3" />
                    Recommendation
                  </div>
                  <p className="text-sm">{pred.recommendation}</p>
                </div>

                {/* Sources */}
                {pred.sources && pred.sources.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Sources</div>
                    <div className="flex flex-wrap gap-1">
                      {pred.sources.map((src) => (
                        <span
                          key={src}
                          className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs"
                        >
                          {src}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {pred.description && (
                  <p className="text-sm text-muted-foreground">{pred.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
