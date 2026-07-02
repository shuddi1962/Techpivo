"use client"

import { RevenueAnalytics } from "@/components/admin/revenue-analytics"
import { AiInsights } from "@/components/admin/ai-insights"

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Center</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Revenue analytics, AI insights, and performance metrics</p>
      </div>
      <AiInsights />
      <RevenueAnalytics />
    </div>
  )
}
