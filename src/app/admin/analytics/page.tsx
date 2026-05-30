'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Users, Eye, MousePointerClick, Search, TrendingUp, TrendingDown,
  Clock, Smartphone, Monitor, Tablet, Globe, Zap, RefreshCw,
  Activity, AlertCircle, ExternalLink, BarChart3, FileText, Tag,
} from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string | number
  change?: number
  icon: React.ReactNode
  iconColor: string
  suffix?: string
}

function KpiCard({ label, value, change, icon, iconColor, suffix }: KpiCardProps) {
  const up = (change ?? 0) >= 0
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ background: iconColor + '20' }}>
          {icon}
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {value}{suffix && <span className="text-lg ml-1">{suffix}</span>}
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${up ? 'text-[#34A853]' : 'text-[#EA4335]'}`}>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(change)}% vs prev period
        </div>
      )}
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

function ServiceConfigPlaceholder({
  icon, name, envVars, color,
}: {
  icon: React.ReactNode; name: string; envVars: string[]; color: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="flex items-center gap-3 p-5 border-b border-gray-100">
        <div className="p-2.5 rounded-lg" style={{ background: color + '15' }}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{name}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
              not configured
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Set up the following environment variables in Vercel Dashboard to enable this service.
          </p>
        </div>
      </div>
      <div className="p-5 space-y-2">
        {envVars.map((ev) => (
          <div key={ev} className="flex items-center gap-2 text-xs">
            <code className="px-2 py-1 bg-gray-50 border border-gray-200 rounded font-mono text-gray-700">{ev}</code>
          </div>
        ))}
        <a
          href="https://vercel.com/shuddi1962s-projects/blizine/settings/environment-variables"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-gray-900 rounded-lg text-xs text-white hover:bg-gray-800 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Configure in Vercel
        </a>
      </div>
    </div>
  )
}

const CHART_COLORS = {
  blue: '#4285F4', green: '#34A853', red: '#EA4335', yellow: '#FBBC04',
  indigo: '#6366F1', teal: '#14B8A6', pink: '#EC4899',
}

const tooltipStyle = {
  contentStyle: { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#6B7280' },
  itemStyle: { color: '#111827' },
}

function fmt(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(Math.round(n))
}

function pctChange(current: number, prev: number): number {
  if (!prev) return 0
  return Math.round(((current - prev) / prev) * 100)
}

function ga4Val(data: any, rowIdx: number, metricIdx: number): number {
  return parseFloat(data?.rows?.[rowIdx]?.metricValues?.[metricIdx]?.value || '0')
}

function ga4Prev(data: any, rowIdx: number, metricIdx: number): number {
  return parseFloat(data?.rows?.[rowIdx]?.metricValues?.[metricIdx + 6]?.value || '0')
}

function buildDailyData(ga4Daily: any, gscDaily: any) {
  const ga4Rows = ga4Daily?.rows || []
  const gscRows = gscDaily?.rows || []
  const gscMap: Record<string, any> = {}
  gscRows.forEach((row: any) => {
    const date = row.keys?.[0] || ''
    gscMap[date] = { clicks: row.clicks || 0, impressions: Math.round((row.impressions || 0) / 100) }
  })
  return ga4Rows.map((row: any) => {
    const raw = row.dimensionValues?.[0]?.value || ''
    const date = raw.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
    const gscDay = gscMap[date] || {}
    return {
      date: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      users: parseInt(row.metricValues?.[0]?.value || '0'),
      sessions: parseInt(row.metricValues?.[1]?.value || '0'),
      newUsers: parseInt(row.metricValues?.[2]?.value || '0'),
      clicks: gscDay.clicks || 0,
      impressions: gscDay.impressions || 0,
    }
  })
}

function buildSourceData(sourcesData: any) {
  const rows = sourcesData?.rows || []
  const total = rows.reduce((s: number, r: any) => s + parseInt(r.metricValues?.[0]?.value || '0'), 0)
  return rows.map((row: any) => ({
    name: row.dimensionValues?.[0]?.value || 'Unknown',
    value: parseInt(row.metricValues?.[0]?.value || '0'),
    pct: total ? Math.round((parseInt(row.metricValues?.[0]?.value || '0') / total) * 100) : 0,
  }))
}

function buildDeviceData(deviceData: any) {
  const rows = deviceData?.rows || []
  const total = rows.reduce((s: number, r: any) => s + parseInt(r.metricValues?.[0]?.value || '0'), 0)
  return rows.map((row: any) => ({
    name: row.dimensionValues?.[0]?.value || 'Unknown',
    value: parseInt(row.metricValues?.[0]?.value || '0'),
    pct: total ? Math.round((parseInt(row.metricValues?.[0]?.value || '0') / total) * 100) : 0,
  }))
}

function buildPageData(pagesData: any) {
  const rows = pagesData?.rows || []
  return rows.map((row: any) => {
    const total = parseInt(row.metricValues?.[2]?.value || '1')
    const newU = parseInt(row.metricValues?.[1]?.value || '0')
    return {
      path: row.dimensionValues?.[0]?.value || '/',
      views: parseInt(row.metricValues?.[0]?.value || '0'),
      newPct: total ? Math.round((newU / total) * 100) : 0,
    }
  })
}

function buildKeywordData(kwData: any) {
  const rows = kwData?.rows || []
  return rows.map((row: any) => ({
    keyword: row.keys?.[0] || '',
    clicks: row.clicks || 0,
    impr: row.impressions || 0,
    position: Math.round((row.position || 0) * 10) / 10,
  }))
}

function buildGeoData(geoData: any) {
  const rows = geoData?.rows || []
  const total = rows.reduce((s: number, r: any) => s + parseInt(r.metricValues?.[0]?.value || '0'), 0)
  return rows.map((row: any) => ({
    country: row.dimensionValues?.[0]?.value || 'Unknown',
    users: parseInt(row.metricValues?.[0]?.value || '0'),
    pct: total ? Math.round((parseInt(row.metricValues?.[0]?.value || '0') / total) * 100) : 0,
  }))
}

function buildRealtimeData(rtData: any) {
  const rows = rtData?.rows || []
  const result: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0, total: 0 }
  rows.forEach((row: any) => {
    const device = (row.dimensionValues?.[0]?.value || 'desktop').toLowerCase()
    const count = parseInt(row.metricValues?.[0]?.value || '0')
    if (device in result) result[device] = count
    result.total += count
  })
  return result
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [days, setDays] = useState(28)
  const [lastFetch, setLastFetch] = useState('')

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

  // Auto-refresh realtime every 30s
  useEffect(() => {
    if (!data?.ga4?.realtime) return
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [data?.ga4?.realtime, fetchData])

  // ── EXTRACT DATA ──

  const overview = data?.ga4?.overview
  const totalUsers = ga4Val(overview, 0, 0)
  const prevUsers = ga4Prev(overview, 0, 0)
  const pageViews = ga4Val(overview, 0, 1)
  const prevViews = ga4Prev(overview, 0, 1)
  const sessions = ga4Val(overview, 0, 2)
  const prevSessions = ga4Prev(overview, 0, 2)
  const sessionDuration = ga4Val(overview, 0, 3)
  const newUsers = ga4Val(overview, 0, 5)
  const prevNew = ga4Prev(overview, 0, 5)

  const gscSummary = data?.gsc?.summary
  const gscClicks = gscSummary?.rows?.[0]?.clicks || 0
  const gscPrevClicks = gscSummary?.rows?.[1]?.clicks || 0
  const gscImpressions = gscSummary?.rows?.[0]?.impressions || 0
  const gscPrevImpr = gscSummary?.rows?.[1]?.impressions || 0
  const gscCtr = Math.round((gscSummary?.rows?.[0]?.ctr || 0) * 1000) / 10
  const gscPosition = Math.round((gscSummary?.rows?.[0]?.position || 0) * 10) / 10

  const dailyData = buildDailyData(data?.ga4?.daily, data?.gsc?.daily)
  const sourceData = buildSourceData(data?.ga4?.sources)
  const deviceData = buildDeviceData(data?.ga4?.devices)
  const pageData = buildPageData(data?.ga4?.pages)
  const kwData = buildKeywordData(data?.gsc?.keywords)
  const geoData = buildGeoData(data?.ga4?.geo)
  const rtData = buildRealtimeData(data?.ga4?.realtime)
  const ps = data?.pagespeed
  const blizine = data?.blizine

  const sourceColors = [CHART_COLORS.blue, CHART_COLORS.green, CHART_COLORS.red, CHART_COLORS.yellow, CHART_COLORS.teal, CHART_COLORS.pink]
  const deviceColors = [CHART_COLORS.indigo, '#D4537E', '#F4C0D1']

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return `${m}m ${s}s`
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Google Site Kit &middot; GA4 &middot; Search Console &middot; PageSpeed
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

      {/* BLIZINE INTERNAL STATS — top for quick reference */}
      {data?.blizine && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Articles Today" value={data.blizine.todayArticles || 0}
            icon={<FileText className="h-5 w-5" style={{ color: '#6366F1' }} />} iconColor="#6366F1" />
          <KpiCard label="Gemini Used Today" value={`${data.blizine.geminiToday || 0}/20`}
            icon={<Activity className="h-5 w-5" style={{ color: '#FBBC04' }} />} iconColor="#FBBC04" />
          <KpiCard label="Published Posts" value={data.blizine.publishedPosts || 0}
            icon={<FileText className="h-5 w-5" style={{ color: '#1D9E75' }} />} iconColor="#1D9E75" />
          <KpiCard label="Total Views" value={fmt(data.blizine.totalViews || 0)}
            icon={<Eye className="h-5 w-5" style={{ color: '#14B8A6' }} />} iconColor="#14B8A6" />
        </div>
      )}

      {/* GOOGLE SERVICE CONFIG PLACEHOLDERS — shown when env vars not set */}
      {data && data.googleConfigured === false && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <ServiceConfigPlaceholder
            icon={<BarChart3 className="h-5 w-5" style={{ color: '#4285F4' }} />}
            name="Google Analytics 4"
            color="#4285F4"
            envVars={['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_GA4_PROPERTY_ID']}
          />
          <ServiceConfigPlaceholder
            icon={<Search className="h-5 w-5" style={{ color: '#34A853' }} />}
            name="Google Search Console"
            color="#34A853"
            envVars={['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_SEARCH_CONSOLE_SITE_URL']}
          />
          <ServiceConfigPlaceholder
            icon={<Zap className="h-5 w-5" style={{ color: '#FBBC04' }} />}
            name="PageSpeed Insights"
            color="#FBBC04"
            envVars={['PAGESPEED_API_KEY']}
          />
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <Card key={i} className="p-5"><Skeleton /></Card>)}
        </div>
      ) : (
        <>
          {/* KPI GRID */}
          <SectionLabel icon={<BarChart3 className="h-4 w-4 text-[#6366F1]" />}>
            Key metrics &mdash; last {days} days
          </SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Users" value={fmt(totalUsers)} change={pctChange(totalUsers, prevUsers)}
              icon={<Users className="h-5 w-5" style={{ color: '#4285F4' }} />} iconColor="#4285F4" />
            <KpiCard label="Page Views" value={fmt(pageViews)} change={pctChange(pageViews, prevViews)}
              icon={<Eye className="h-5 w-5" style={{ color: '#EA4335' }} />} iconColor="#EA4335" />
            <KpiCard label="Sessions" value={fmt(sessions)} change={pctChange(sessions, prevSessions)}
              icon={<MousePointerClick className="h-5 w-5" style={{ color: '#34A853' }} />} iconColor="#34A853" />
            <KpiCard label="New Users" value={fmt(newUsers)} change={pctChange(newUsers, prevNew)}
              icon={<Users className="h-5 w-5" style={{ color: '#FBBC04' }} />} iconColor="#FBBC04" />
            <KpiCard label="Search Clicks" value={fmt(gscClicks)} change={gscPrevClicks ? pctChange(gscClicks, gscPrevClicks) : undefined}
              icon={<Search className="h-5 w-5" style={{ color: '#185FA5' }} />} iconColor="#185FA5" />
            <KpiCard label="Search Impressions" value={fmt(gscImpressions)} change={gscPrevImpr ? pctChange(gscImpressions, gscPrevImpr) : undefined}
              icon={<Activity className="h-5 w-5" style={{ color: '#0F6E56' }} />} iconColor="#0F6E56" />
            <KpiCard label="Avg. CTR" value={gscCtr} suffix="%"
              icon={<TrendingUp className="h-5 w-5" style={{ color: '#8B5CF6' }} />} iconColor="#8B5CF6" />
            <KpiCard label="Avg. Position" value={gscPosition}
              icon={<BarChart3 className="h-5 w-5" style={{ color: '#BA7517' }} />} iconColor="#BA7517" />
          </div>

          {/* TRAFFIC LINE CHART */}
          <Card className="p-6">
            <SectionLabel icon={<Activity className="h-4 w-4 text-[#6366F1]" />}>
              Traffic overview
            </SectionLabel>
            <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
              {[['Users', '#4285F4'], ['Sessions', '#34A853'], ['New users', '#EA4335']].map(([l, c]: string[]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                  {l}
                </div>
              ))}
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fill: '#8B9EC7', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8B9EC7', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Line type="monotone" dataKey="users" stroke="#4285F4" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="sessions" stroke="#34A853" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="newUsers" stroke="#EA4335" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* SOURCES + DEVICES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <SectionLabel icon={<Globe className="h-4 w-4 text-[#6366F1]" />}>
                Traffic sources
              </SectionLabel>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sourceData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                        {sourceData.map((s: any, i: number) => <Cell key={i} fill={sourceColors[i % sourceColors.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any, n: any) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 w-full">
                  {sourceData.map((s: any, i: number) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: sourceColors[i % sourceColors.length] }} />
                        <span className="text-gray-900">{s.name}</span>
                      </div>
                      <span className="text-gray-500">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <SectionLabel icon={<Smartphone className="h-4 w-4 text-[#6366F1]" />}>
                Device category
              </SectionLabel>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={deviceData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                        {deviceData.map((d: any, i: number) => <Cell key={i} fill={deviceColors[i % deviceColors.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any, n: any) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3 w-full">
                  {[
                    { icon: <Monitor className="h-4 w-4" />, name: 'Desktop' },
                    { icon: <Smartphone className="h-4 w-4" />, name: 'Mobile' },
                    { icon: <Tablet className="h-4 w-4" />, name: 'Tablet' },
                  ].map((d: any, i: number) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-gray-900">
                        {d.icon}
                        {d.name}
                      </div>
                      <span className="text-gray-500">{deviceData[i]?.pct || 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* SEARCH CONSOLE */}
          <Card className="p-6">
            <SectionLabel icon={<Search className="h-4 w-4 text-[#6366F1]" />}>
              Google Search Console
            </SectionLabel>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Impressions', value: fmt(gscImpressions), color: '#4285F4' },
                { label: 'Total Clicks', value: fmt(gscClicks), color: '#34A853' },
                { label: 'Average CTR', value: gscCtr + '%', color: '#FBBC04' },
                { label: 'Average Position', value: gscPosition, color: '#EA4335' },
              ].map((c: any) => (
                <div key={c.label} className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-xl font-bold text-gray-900">{c.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{c.label}</div>
                </div>
              ))}
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fill: '#8B9EC7', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8B9EC7', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#6B7280' }} />
                  <Bar dataKey="impressions" name="Impressions" fill="rgba(234,67,53,0.7)" radius={[2,2,0,0]} />
                  <Bar dataKey="clicks" name="Clicks" fill="#185FA5" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* TOP PAGES + KEYWORDS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <SectionLabel icon={<FileText className="h-4 w-4 text-[#6366F1]" />}>
                Most popular pages
              </SectionLabel>
              <div className="space-y-1">
                <div className="flex items-center text-xs text-gray-500 pb-2 border-b border-gray-200">
                  <div className="flex-1">Page</div>
                  <div className="w-16 text-right">Views</div>
                  <div className="w-16 text-right">% New</div>
                </div>
                {pageData.slice(0, 8).map((p: any) => (
                  <div key={p.path} className="flex items-center text-xs py-2 border-b border-gray-200/50">
                    <div className="flex-1 truncate text-gray-900">{p.path}</div>
                    <div className="w-16 text-right text-gray-900">{fmt(p.views)}</div>
                    <div className="w-16 text-right text-gray-500">{p.newPct}%</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <SectionLabel icon={<Search className="h-4 w-4 text-[#6366F1]" />}>
                Top search queries
              </SectionLabel>
              <div className="space-y-1">
                <div className="flex items-center text-xs text-gray-500 pb-2 border-b border-gray-200">
                  <div className="flex-1">Keyword</div>
                  <div className="w-14 text-right">Clicks</div>
                  <div className="w-14 text-right">Pos.</div>
                </div>
                {kwData.slice(0, 8).map((k: any) => (
                  <div key={k.keyword} className="flex items-center text-xs py-2 border-b border-gray-200/50">
                    <div className="flex-1 truncate text-gray-900">{k.keyword}</div>
                    <div className="w-14 text-right text-gray-900">{k.clicks}</div>
                    <div className="w-14 text-right text-gray-500">{k.position}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* GEOGRAPHY + REALTIME */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <SectionLabel icon={<Globe className="h-4 w-4 text-[#6366F1]" />}>
                Top countries
              </SectionLabel>
              <div className="space-y-3">
                {geoData.map((g: any, i: number) => (
                  <div key={g.country}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-900">{g.country}</span>
                      <span className="text-gray-500">{g.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${g.pct}%`, background: i === 0 ? '#4285F4' : '#6366F1' }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <SectionLabel icon={<Zap className="h-4 w-4 text-[#6366F1]" />}>
                Real-time users
              </SectionLabel>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#34A853] animate-pulse" />
                  <span className="text-xs text-gray-500">LIVE</span>
                </div>
                <span className="text-3xl font-bold text-gray-900">{rtData.total}</span>
                <span className="text-xs text-gray-500">users right now</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: <Monitor className="h-4 w-4" />, label: 'Desktop', val: rtData.desktop },
                  { icon: <Smartphone className="h-4 w-4" />, label: 'Mobile', val: rtData.mobile },
                  { icon: <Tablet className="h-4 w-4" />, label: 'Tablet', val: rtData.tablet },
                ].map((d: any) => (
                  <div key={d.label} className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="flex justify-center text-gray-500 mb-1">{d.icon}</div>
                    <div className="text-lg font-bold text-gray-900">{d.val}</div>
                    <div className="text-xs text-gray-500">{d.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* PAGESPEED */}
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
