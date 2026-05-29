'use client'
import { useEffect, useState } from 'react'

export function GeminiQuotaWidget() {
  const [data, setData] = useState<{
    gemini: { used: number; cap: number; remaining: number; resetsAt: string; note: string }
    total: { today: number; cap: number; note: string }
  } | null>(null)

  useEffect(() => {
    fetch('/api/admin/ai-quota').then(r => r.json()).then(setData)
  }, [])

  if (!data) return <div className="text-sm text-gray-400">Loading quota...</div>

  const geminiPct = Math.round((data.gemini.used / data.gemini.cap) * 100)
  const totalPct = Math.round((data.total.today / data.total.cap) * 100)
  const gColor = geminiPct >= 100 ? '#EF4444' : geminiPct >= 75 ? '#F59E0B' : '#10B981'

  return (
    <div className="bg-white dark:bg-[#111827] border-2 border-gray-200 dark:border-[#374151] rounded-xl p-5">
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        🤖 AI Usage Today
      </h3>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Gemini 2.5 Flash (grounded)</span>
            <span className={`text-xs font-semibold ${data.gemini.remaining === 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {data.gemini.remaining === 0 ? '⚠ Cap reached' : `${data.gemini.remaining} remaining`}
            </span>
          </div>
          <div className="w-full h-2.5 bg-gray-200 dark:bg-[#1F2937] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, geminiPct)}%`, backgroundColor: gColor }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {data.gemini.used}/{data.gemini.cap} used today · Resets: {new Date(data.gemini.resetsAt).toLocaleTimeString()}
          </p>
        </div>

        <div className="pt-3 border-t border-gray-200 dark:border-[#374151]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total articles today</span>
            <span className="text-xs font-semibold text-gray-400">{data.total.today}/{data.total.cap}</span>
          </div>
          <div className="w-full h-2.5 bg-gray-200 dark:bg-[#1F2937] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#6366F1] transition-all duration-500"
              style={{ width: `${Math.min(100, totalPct)}%` }}
            />
          </div>
        </div>

        <div className="pt-2 space-y-1">
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <span className="text-green-400">✓</span> Gemini grounded = Google Search used before writing
          </p>
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <span className="text-yellow-400">!</span> {data.gemini.note}
          </p>
        </div>
      </div>
    </div>
  )
}
