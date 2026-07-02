"use client"

import { useState } from "react"
import {
  Swords, TrendingUp, TrendingDown, Globe, BarChart3,
  RefreshCw, ExternalLink, AlertTriangle, CheckCircle
} from "lucide-react"
import { KNOWN_COMPETITORS } from "@/lib/competitor-intelligence"

export default function CompetitorIntelligencePage() {
  const [selectedCompetitor, setSelectedCompetitor] = useState(KNOWN_COMPETITORS[0])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Swords className="h-6 w-6 text-red-500" />
          Competitor Intelligence
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor competitors and identify content opportunities</p>
      </div>

      {/* Competitor List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {KNOWN_COMPETITORS.map((competitor) => (
          <div
            key={competitor.domain}
            onClick={() => setSelectedCompetitor(competitor)}
            className={`bg-white dark:bg-[#111827] border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
              selectedCompetitor.domain === competitor.domain ? "ring-2 ring-primary" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">{competitor.name}</h3>
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                DA {competitor.estimated_authority}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{competitor.domain}</p>
            <p className="text-xs text-muted-foreground">{competitor.publishing_frequency}</p>
          </div>
        ))}
      </div>

      {/* Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            {selectedCompetitor.name} — Strengths
          </h3>
          <div className="space-y-2">
            {selectedCompetitor.strengths.map((strength, i) => (
              <div key={i} className="flex items-center gap-2 p-2 border rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
                <span className="text-sm">{strength}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {selectedCompetitor.name} — Weaknesses
          </h3>
          <div className="space-y-2">
            {selectedCompetitor.weaknesses.map((weakness, i) => (
              <div key={i} className="flex items-center gap-2 p-2 border rounded-lg">
                <TrendingDown className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-sm">{weakness}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Primary Categories */}
      <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          {selectedCompetitor.name} — Primary Categories
        </h3>
        <div className="flex flex-wrap gap-2">
          {selectedCompetitor.primary_categories.map((cat, i) => (
            <span key={i} className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium">
              {cat.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          ))}
        </div>
      </div>

      {/* Content Gap Analysis */}
      <div className="bg-white dark:bg-[#111827] border rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-purple-500" />
          Content Gap Opportunities
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Based on {selectedCompetitor.name}&apos;s coverage, these are areas where TechPivo can differentiate:
        </p>
        <div className="space-y-2">
          {selectedCompetitor.weaknesses.map((weakness, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <span className="text-green-500 font-bold text-sm">{i + 1}</span>
                </div>
                <span className="text-sm font-medium capitalize">{weakness}</span>
              </div>
              <button className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90">
                Create Brief
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
