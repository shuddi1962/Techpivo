'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Eye, FileText, Activity, RefreshCw, AlertCircle, Zap,
  BarChart3, Globe, MousePointerClick, TrendingUp, Rss,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

function KpiCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ background: color + '20' }}>
          {icon}
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-gray-200 rounded-xl shadow-sm ${className}`}>{children}</div>
}

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
      {icon}{children}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-8 bg-gray-200 rounded" />
      <div className="h-8 bg-gray-200 rounded w-5/6" />
    </div>
  )
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
      <AlertCircle className="h-10 w-10 text-[#EA4335] mx-auto mb-3" />
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      <button onClick={onRetry} className="px-4 py-2 bg-[#6366F1] rounded-lg text-sm text-white hover:bg-[#5457E5] transition-colors">
        Retry
      </button>
    </div>
  )
}

function fmt(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(Math.round(n))
}

const tooltipStyle = {
  contentStyle: { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#6B7280' },
  itemStyle: { color: '#111827' },
}

const COLORS = ['#4285F4', '#34A853', '#FBBC04', '#EA4335', '#6366F1', '#14B8A6', '#EC4899', '#F59E0B']

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <SectionLabel icon={icon}>{title}</SectionLabel>
      <div className="h-72">{children}</div>
    </Card>
  )
}

function TopList({ title, icon, data, valueLabel }: { title: string; icon: React.ReactNode; data: { name: string; value: number }[]; valueLabel: string }) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <SectionLabel icon={icon}>{title}</SectionLabel>
        <div className="flex flex-col items-center justify-center h-48 text-sm text-gray-400">
          <BarChart3 className="h-8 w-8 mb-2 text-gray-300" />
          <p>No data yet</p>
          <p className="text-xs mt-1">Data appears as visitors browse your site</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <SectionLabel icon={icon}>{title}</SectionLabel>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#8B9EC7', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
            <Tooltip {...tooltipStyle} formatter={(v: any) => [v, valueLabel]} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
              {data.map((_, i) => (
                <rect key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastFetch, setLastFetch] = useState('')
  const [days, setDays] = useState(28)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setLastFetch(new Date().toLocaleTimeString())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { fetchData() }, [fetchData])

  const b = data?.blizine
  const a = data?.analytics
  const ps = data?.pagespeed

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time site analytics from your database
            {lastFetch && <span className="ml-2">&middot; Updated {lastFetch}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 28, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                background: days === d ? '#6366F1' : '#fff',
                border: `1px solid ${days === d ? '#6366F1' : '#D1D5DB'}`,
                color: days === d ? 'white' : '#6B7280',
              }}>
              {d}d
            </button>
          ))}
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6366F1] rounded-lg text-xs text-white hover:bg-[#5457E5] disabled:opacity-50 transition-colors">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <ErrorCard message={error} onRetry={fetchData} />}

      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6].map(i => <Card key={i} className="p-5"><Skeleton /></Card>)}
        </div>
      ) : (
        <>
          {b && (
            <>
              <SectionLabel icon={<Activity className="h-4 w-4 text-[#6366F1]" />}>
                Overview &mdash; last {days} days
              </SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Total Views" value={fmt(b.totalViews || 0)}
                  icon={<Eye className="h-5 w-5" style={{ color: '#4285F4' }} />} color="#4285F4" />
                <KpiCard label="Published Posts" value={b.publishedPosts || 0}
                  icon={<FileText className="h-5 w-5" style={{ color: '#34A853' }} />} color="#34A853" />
                <KpiCard label="Draft Posts" value={b.draftPosts || 0}
                  icon={<FileText className="h-5 w-5" style={{ color: '#FBBC04' }} />} color="#FBBC04" />
                <KpiCard label="Feed Posts Fetched" value={fmt(b.totalFeedPosts || 0)}
                  icon={<Rss className="h-5 w-5" style={{ color: '#EA4335' }} />} color="#EA4335" />
                <KpiCard label="Articles Today" value={b.todayArticles || 0}
                  icon={<TrendingUp className="h-5 w-5" style={{ color: '#6366F1' }} />} color="#6366F1" />
                <KpiCard label="Gemini Today" value={`${b.geminiToday || 0}/20`}
                  icon={<Activity className="h-5 w-5" style={{ color: '#14B8A6' }} />} color="#14B8A6" />
              </div>
            </>
          )}

          {a && (
            <>
              <SectionLabel icon={<BarChart3 className="h-4 w-4 text-[#6366F1]" />}>
                Page views &mdash; {a.totalPageViews.toLocaleString()} total
              </SectionLabel>
              <ChartCard title="Views over time" icon={<Activity className="h-4 w-4 text-[#6366F1]" />}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={a.viewsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" tick={{ fill: '#8B9EC7', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#8B9EC7', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Line type="monotone" dataKey="views" stroke="#6366F1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopList
                  title="Top pages"
                  icon={<FileText className="h-4 w-4 text-[#6366F1]" />}
                  data={a.topPages}
                  valueLabel="Views"
                />
                <TopList
                  title="Top referrers"
                  icon={<MousePointerClick className="h-4 w-4 text-[#6366F1]" />}
                  data={a.topReferrers}
                  valueLabel="Visits"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopList
                  title="Top countries"
                  icon={<Globe className="h-4 w-4 text-[#6366F1]" />}
                  data={a.topCountries}
                  valueLabel="Visitors"
                />
                <TopList
                  title="Most viewed posts"
                  icon={<Eye className="h-4 w-4 text-[#6366F1]" />}
                  data={(b?.topPosts || []).map((p: any) => ({ name: p.title.length > 40 ? p.title.slice(0, 37) + '...' : p.title, value: p.views }))}
                  valueLabel="Views"
                />
              </div>
            </>
          )}

          {ps && (
            <Card className="p-6">
              <SectionLabel icon={<Zap className="h-4 w-4 text-[#6366F1]" />}>
                PageSpeed Insights &middot; blizine.com
              </SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Performance', val: ps.performance, isScore: true },
                  { label: 'Accessibility', val: ps.accessibility, isScore: true },
                  { label: 'SEO score', val: ps.seo, isScore: true },
                  { label: 'LCP', val: ps.lcp, isScore: false },
                  { label: 'INP', val: ps.inp, isScore: false },
                  { label: 'CLS', val: ps.cls, isScore: false },
                ].map((m: any) => {
                  const color = m.isScore
                    ? (m.val >= 90 ? '#1D9E75' : m.val >= 50 ? '#BA7517' : '#D85A30')
                    : '#6366F1'
                  const label = m.isScore
                    ? (m.val >= 90 ? 'Good' : m.val >= 50 ? 'Needs work' : 'Poor')
                    : ''
                  return (
                    <div key={m.label} className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-xs text-gray-500 mb-2">{m.label}</div>
                      <div className="text-xl font-bold" style={{ color }}>{m.val}</div>
                      {label && <div className="text-xs mt-1" style={{ color }}>{label}</div>}
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
