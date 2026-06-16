'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Eye, FileText, Activity, RefreshCw, AlertCircle, Zap,
  BarChart3, Globe, MousePointerClick, TrendingUp, Rss,
  PieChart as PieIcon,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  ComposedChart, Line, RadialBarChart, RadialBar,
} from 'recharts'

const WARM = ['#FF6B6B', '#FFA07A', '#FFD700', '#98FB98', '#00CED1', '#9370DB', '#FF69B4', '#20B2AA', '#F97316', '#84CC16']
const PIE_VIBRANT = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCB77', '#45B7D1', '#DDA0DD', '#FF8C94', '#96CEB4', '#F97316', '#A855F7']

const COUNTRY_FLAGS: Record<string, string> = {
  "United States": "🇺🇸", "US": "🇺🇸", "India": "🇮🇳", "United Kingdom": "🇬🇧", "UK": "🇬🇧",
  "Germany": "🇩🇪", "France": "🇫🇷", "Canada": "🇨🇦", "Australia": "🇦🇺", "Brazil": "🇧🇷",
  "Japan": "🇯🇵", "China": "🇨🇳", "Russia": "🇷🇺", "South Korea": "🇰🇷", "Netherlands": "🇳🇱",
  "Spain": "🇪🇸", "Italy": "🇮🇹", "Sweden": "🇸🇪", "Norway": "🇳🇴", "Denmark": "🇩🇰",
  "Finland": "🇫🇮", "Poland": "🇵🇱", "Turkey": "🇹🇷", "Indonesia": "🇮🇩", "Mexico": "🇲🇽",
  "Argentina": "🇦🇷", "Nigeria": "🇳🇬", "South Africa": "🇿🇦", "Egypt": "🇪🇬", "Kenya": "🇰🇪",
  "Saudi Arabia": "🇸🇦", "UAE": "🇦🇪", "United Arab Emirates": "🇦🇪", "Singapore": "🇸🇬",
  "Hong Kong": "🇭🇰", "Switzerland": "🇨🇭", "Belgium": "🇧🇪", "Austria": "🇦🇹", "Ireland": "🇮🇪",
  "New Zealand": "🇳🇿", "Portugal": "🇵🇹", "Greece": "🇬🇷", "Czech Republic": "🇨🇿", "Romania": "🇷🇴",
  "Ukraine": "🇺🇦", "Hungary": "🇭🇺", "Israel": "🇮🇱", "Thailand": "🇹🇭", "Vietnam": "🇻🇳",
  "Philippines": "🇵🇭", "Malaysia": "🇲🇾", "Pakistan": "🇵🇰", "Bangladesh": "🇧🇩", "Colombia": "🇨🇴",
  "Chile": "🇨🇱", "Peru": "🇵🇪",
}

function flag(name: string): string {
  return COUNTRY_FLAGS[name] || ""
}

function KpiCard({ label, value, icon, gradient }: { label: string; value: string | number; icon: React.ReactNode; gradient: string }) {
  return (
    <div className="rounded-xl p-5 shadow-sm text-white relative overflow-hidden" style={{ background: gradient }}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
          {icon}
        </div>
        <span className="text-xs text-white/80 font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold relative z-10">{value}</div>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-indigo-200 rounded-xl shadow-sm ${className}`}>{children}</div>
}

function ColorCard({ children, accent, className = '' }: { children: React.ReactNode; accent: string; className?: string }) {
  return (
    <div className={`bg-white border border-indigo-200 rounded-xl shadow-sm overflow-hidden ${className}`}>
      <div className="h-1 w-full" style={{ background: accent }} />
      <div className="p-6">{children}</div>
    </div>
  )
}

function SectionLabel({ icon, children, accent }: { icon: React.ReactNode; children: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold mb-4" style={{ color: accent || '#4F46E5' }}>
      {icon}{children}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-indigo-100 rounded w-3/4" />
      <div className="h-8 bg-indigo-100 rounded" />
      <div className="h-8 bg-indigo-100 rounded w-5/6" />
    </div>
  )
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-white border border-rose-200 rounded-xl p-8 text-center">
      <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
      <p className="text-sm text-rose-600 mb-4">{message}</p>
      <button onClick={onRetry} className="px-4 py-2 bg-indigo-500 rounded-lg text-sm text-white hover:bg-indigo-600 transition-colors">
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
  contentStyle: { background: '#4C1D95', border: 'none', borderRadius: 8, fontSize: 12, color: '#EDE9FE' },
  labelStyle: { color: '#C4B5FD' },
  itemStyle: { color: '#EDE9FE' },
}

function ChartCard({ title, icon, accent, children }: { title: string; icon: React.ReactNode; accent: string; children: React.ReactNode }) {
  return (
    <ColorCard accent={accent}>
      <SectionLabel icon={<span style={{ color: accent }}>{icon}</span>} accent={accent}>{title}</SectionLabel>
      <div className="h-72">{children}</div>
    </ColorCard>
  )
}

function BarListCard({ title, icon, data, valueLabel, accent }: { title: string; icon: React.ReactNode; data: { name: string; value: number }[]; valueLabel: string; accent: string }) {
  if (!data || data.length === 0) {
    return (
      <ColorCard accent={accent}>
        <SectionLabel icon={<span style={{ color: accent }}>{icon}</span>} accent={accent}>{title}</SectionLabel>
        <div className="flex flex-col items-center justify-center h-48 text-sm" style={{ color: accent }}>
          <BarChart3 className="h-8 w-8 mb-2 opacity-50" style={{ color: accent }} />
          <p>No data yet</p>
          <p className="text-xs mt-1 opacity-70">Data appears as visitors browse your site</p>
        </div>
      </ColorCard>
    )
  }

  return (
    <ColorCard accent={accent}>
      <SectionLabel icon={<span style={{ color: accent }}>{icon}</span>} accent={accent}>{title}</SectionLabel>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E7FF" horizontal={false} />
            <XAxis type="number" tick={{ fill: accent, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: accent, fontSize: 11 }} axisLine={false} tickLine={false} width={160} />
            <Tooltip {...tooltipStyle} formatter={(v: any) => [v, valueLabel]} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
              {data.map((_, i) => (
                <Cell key={i} fill={WARM[i % WARM.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ColorCard>
  )
}

function RainbowComposedChart({ data }: { data: { date: string; views: number }[] | undefined }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-sm text-indigo-500">
        <Activity className="h-8 w-8 mb-2 text-indigo-300" />
        <p>No view data yet</p>
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data}>
        <defs>
          <linearGradient id="rainbowBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B6B" stopOpacity={0.8} />
            <stop offset="50%" stopColor="#FFD93D" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#6BCB77" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="composedLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#45B7D1" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E0E7FF" />
        <XAxis dataKey="date" tick={{ fill: '#6366F1', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6366F1', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="views" fill="url(#rainbowBar)" radius={[4, 4, 0, 0]} barSize={20} />
        <Line type="monotone" dataKey="views" stroke="url(#composedLine)" strokeWidth={2.5} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function DonutCard({ title, icon, data, accent }: { title: string; icon: React.ReactNode; data: { name: string; value: number }[]; accent: string }) {
  if (!data || data.length === 0) return null

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <ColorCard accent={accent} className="h-full">
      <SectionLabel icon={<span style={{ color: accent }}>{icon}</span>} accent={accent}>{title}</SectionLabel>
      <div className="flex flex-col items-center justify-center h-[calc(100%-2rem)]">
        <div className="h-48 w-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {data.map((_, i) => (
                  <linearGradient key={i} id={`donutGrad${i}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={PIE_VIBRANT[i % PIE_VIBRANT.length]} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={PIE_VIBRANT[i % PIE_VIBRANT.length]} stopOpacity={1} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={data}
                dataKey="value"
                cx="50%" cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={4}
                stroke="#fff"
                strokeWidth={2.5}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={`url(#donutGrad${i})`} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => [`${v.toLocaleString()} (${Math.round((v / total) * 100)}%)`, '']} contentStyle={{ background: '#4C1D95', border: 'none', borderRadius: 8, color: '#EDE9FE' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2 text-sm">
              <span className="h-3 w-3 rounded-full" style={{ background: PIE_VIBRANT[i % PIE_VIBRANT.length] }} />
              <span className="font-medium" style={{ color: accent }}>{d.name}</span>
              <span className="opacity-60" style={{ color: accent }}>{Math.round((d.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </ColorCard>
  )
}

function GaugeCard({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(value / max, 1)
  const grad = pct >= 0.9
    ? 'linear-gradient(90deg, #43e97b, #38f9d7)'
    : pct >= 0.5
    ? 'linear-gradient(90deg, #fa709a, #fee140)'
    : 'linear-gradient(90deg, #f5576c, #ff6b6b)'
  return (
    <div className="rounded-xl p-4 text-center shadow-sm border border-indigo-100" style={{ background: '#EEF2FF' }}>
      <div className="text-xs mb-2 font-semibold uppercase tracking-wider" style={{ color: '#4F46E5' }}>{label}</div>
      <div className="text-2xl font-extrabold mb-1" style={{ background: grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{value}</div>
      <div className="mt-2 h-2.5 rounded-full overflow-hidden shadow-inner" style={{ background: '#C7D2FE' }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct * 100}%`, background: grad }} />
      </div>
    </div>
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
      const res = await fetch(`/api/admin/analytics?days=${days}&_t=${Date.now()}`)
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

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)

    const supabase = createClient()
    const channel = supabase
      .channel("analytics-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "analytics_events" }, () => {
        fetchData()
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts", filter: "status=eq.published" }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const b = data?.blizine
  const a = data?.analytics
  const ps = data?.pagespeed

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Analytics</h1>
          <p className="text-sm mt-1" style={{ color: '#6366F1' }}>
            Real-time site analytics from your database
            {lastFetch && <span className="ml-2">&middot; Updated {lastFetch}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 28, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 500,
                background: days === d ? '#6366F1' : '#EEF2FF',
                border: `1px solid ${days === d ? '#6366F1' : '#A5B4FC'}`,
                color: days === d ? 'white' : '#4F46E5',
              }}>
              {d}d
            </button>
          ))}
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 rounded-lg text-xs text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors">
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
              <SectionLabel icon={<Activity className="h-4 w-4" style={{ color: '#667eea' }} />} accent="#4F46E5">
                Overview &mdash; last {days} days
              </SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <KpiCard label="Total Views" value={fmt(b.totalViews || 0)}
                  icon={<Eye className="h-5 w-5 text-white" />}
                  gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" />
                <KpiCard label="Published Posts" value={b.publishedPosts || 0}
                  icon={<FileText className="h-5 w-5 text-white" />}
                  gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" />
                <KpiCard label="Draft Posts" value={b.draftPosts || 0}
                  icon={<FileText className="h-5 w-5 text-white" />}
                  gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)" />
                <KpiCard label="Published Today" value={b.todayArticles || 0}
                  icon={<TrendingUp className="h-5 w-5 text-white" />}
                  gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" />
                <KpiCard label="Manual Today" value={Math.max(0, (b.todayArticles || 0) - (b.rssArticlesToday || 0))}
                  icon={<FileText className="h-5 w-5 text-white" />}
                  gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)" />
                <KpiCard label="RSS Today" value={b.rssArticlesToday || 0}
                  icon={<Rss className="h-5 w-5 text-white" />}
                  gradient="linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)" />
                <KpiCard label="All Feed Posts" value={fmt(b.totalFeedPosts || 0)}
                  icon={<Rss className="h-5 w-5 text-white" />}
                  gradient="linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)" />
                <KpiCard label="AI Articles Today" value={b.geminiToday || 0}
                  icon={<Activity className="h-5 w-5 text-white" />}
                  gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" />
              </div>
            </>
          )}

          {a && (
            <>
              <SectionLabel icon={<BarChart3 className="h-4 w-4" style={{ color: '#4facfe' }} />} accent="#4F46E5">
                Page views &mdash; {a.totalPageViews.toLocaleString()} total
              </SectionLabel>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Views over time" icon={<Activity className="h-4 w-4" />} accent="#667eea">
                  <RainbowComposedChart data={a.viewsOverTime} />
                </ChartCard>

                <ColorCard accent="#4ECDC4">
                  <SectionLabel icon={<Globe className="h-4 w-4" style={{ color: '#4ECDC4' }} />} accent="#4ECDC4">Traffic sources</SectionLabel>
                  <div className="flex flex-col items-center justify-center h-[calc(100%-2rem)]">
                    <div className="h-52 w-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart innerRadius="20%" outerRadius="90%" data={(a.trafficSourceDist || []).map((d: any, i: number) => ({ ...d, fill: ['#4ECDC4', '#FF6B6B'][i] }))} startAngle={90} endAngle={-270}>
                          <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#E0E7FF' }} />
                          <Tooltip formatter={(v: any) => [`${v.toLocaleString()} visits`, '']} contentStyle={{ background: '#4C1D95', border: 'none', borderRadius: 8, color: '#EDE9FE' }} />
                        </RadialBarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                      {(a.trafficSourceDist || []).map((d: any, i: number) => (
                        <div key={d.name} className="flex items-center gap-2 text-sm">
                          <span className="h-3 w-3 rounded-full" style={{ background: ['#4ECDC4', '#FF6B6B'][i] }} />
                          <span className="font-medium" style={{ color: '#4F46E5' }}>{d.name}</span>
                          <span className="opacity-60" style={{ color: '#4F46E5' }}>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ColorCard>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BarListCard
                  title="Top pages"
                  icon={<FileText className="h-4 w-4" />}
                  data={a.topPages}
                  valueLabel="Views"
                  accent="#FF6B6B"
                />
                <BarListCard
                  title="Top referrers"
                  icon={<MousePointerClick className="h-4 w-4" />}
                  data={a.topReferrers}
                  valueLabel="Visits"
                  accent="#45B7D1"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BarListCard
                  title="Top countries"
                  icon={<Globe className="h-4 w-4" />}
                  data={(a.topCountries || []).map((c: any) => ({ ...c, name: flag(c.name) ? `${flag(c.name)} ${c.name}` : c.name }))}
                  valueLabel="Visitors"
                  accent="#48C774"
                />
                <DonutCard
                  title="Post status"
                  icon={<PieIcon className="h-4 w-4" />}
                  data={b?.postStatusDist}
                  accent="#FFD93D"
                />
              </div>

              <BarListCard
                title="Most viewed posts"
                icon={<Eye className="h-4 w-4" />}
                data={(b?.topPosts || []).map((p: any) => ({ name: p.title.length > 40 ? p.title.slice(0, 37) + '...' : p.title, value: p.views }))}
                valueLabel="Views"
                accent="#A855F7"
              />
            </>
          )}

          {ps && (
            <ColorCard accent="#FFD700">
              <SectionLabel icon={<Zap className="h-4 w-4" style={{ color: '#FFD700' }} />} accent="#D97706">
                PageSpeed Insights &middot; techpivo.com
              </SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <GaugeCard label="Performance" value={ps.performance} max={100} />
                <GaugeCard label="Accessibility" value={ps.accessibility} max={100} />
                <GaugeCard label="SEO score" value={ps.seo} max={100} />
                <GaugeCard label="Best Practices" value={ps.bestPractices ?? 0} max={100} />
                <div className="rounded-xl p-4 text-center shadow-sm border border-indigo-100" style={{ background: '#EEF2FF' }}>
                  <div className="text-xs mb-2 font-semibold uppercase tracking-wider" style={{ color: '#4F46E5' }}>LCP</div>
                  <div className="text-2xl font-extrabold mb-1" style={{ background: 'linear-gradient(90deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{ps.lcp}</div>
                  <div className="text-xs mt-1" style={{ color: '#6366F1' }}>Largest Contentful Paint</div>
                </div>
                <div className="rounded-xl p-4 text-center shadow-sm border border-indigo-100" style={{ background: '#EEF2FF' }}>
                  <div className="text-xs mb-2 font-semibold uppercase tracking-wider" style={{ color: '#4F46E5' }}>CLS</div>
                  <div className="text-2xl font-extrabold mb-1" style={{ background: 'linear-gradient(90deg, #4ECDC4, #44A08D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{ps.cls}</div>
                  <div className="text-xs mt-1" style={{ color: '#6366F1' }}>Cumulative Layout Shift</div>
                </div>
              </div>
            </ColorCard>
          )}
        </>
      )}
    </div>
  )
}
