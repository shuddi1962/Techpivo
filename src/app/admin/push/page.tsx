"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Bell, BellRing, Users, Send, BarChart3, Plus, RefreshCw, Trash2,
  Eye, MousePointerClick, Smartphone, Monitor, Tablet, Globe,
  Clock, CheckCircle, AlertCircle, TrendingUp, ArrowUpRight, Edit3
} from "lucide-react"

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "subscribers", label: "Subscribers", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "compose", label: "Compose", icon: Edit3 },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
]

const S = {
  bg: "#0F1117",
  card: "#1C1F2E",
  border: "#2A2D3E",
  primary: "#2563EB",
  green: "#22C55E",
  red: "#EF4444",
  yellow: "#EAB308",
  purple: "#A855F7",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  textDim: "#64748B",
  input: "#141620",
}

interface PushSubscriber {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  device_type: string
  browser: string
  os: string
  user_agent: string | null
  subscribed_at: string
  last_seen_at: string | null
}

interface PushNotification {
  id: string
  title: string
  body: string
  url: string | null
  image: string | null
  status: string
  sent_at: string | null
  sent_count: number | null
  open_count: number | null
  created_at: string
}

interface OverviewData {
  totalSubscribers: number
  activeSubscribers: number
  totalSent: number
  totalOpens: number
  avgOpenRate: number
  deviceBreakdown: Array<{ type: string; count: number }>
  recentNotifications: Array<{ title: string; sent_at: string; opens: number }>
}

interface AnalyticsData {
  deliveryRates: Array<{ date: string; rate: number }>
  clickRates: Array<{ date: string; rate: number }>
  subscriberGrowth: Array<{ month: string; count: number }>
  browserBreakdown: Array<{ browser: string; count: number }>
  osBreakdown: Array<{ os: string; count: number }>
}

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
      <RefreshCw style={{ width: 24, height: 24, color: S.primary, animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function StatCard({ label, value, change, icon: Icon, color }: { label: string; value: string; change?: string; icon: any; color: string }) {
  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 13, color: S.textMuted, marginBottom: 4 }}>{label}</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: S.text }}>{value}</p>
          {change && <p style={{ fontSize: 12, color: change.startsWith("+") ? S.green : S.red, marginTop: 4 }}>{change}</p>}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ width: 22, height: 22, color }} />
        </div>
      </div>
    </div>
  )
}

function OverviewTab({ data, loading }: { data: OverviewData | null; loading: boolean }) {
  if (loading) return <LoadingSpinner />
  if (!data) return <p style={{ color: S.textMuted, padding: 24 }}>No data available</p>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        <StatCard label="Total Subscribers" value={data.totalSubscribers.toLocaleString()} icon={Users} color={S.primary} />
        <StatCard label="Active Subscribers" value={data.activeSubscribers.toLocaleString()} icon={Bell} color={S.green} />
        <StatCard label="Notifications Sent" value={data.totalSent.toLocaleString()} icon={Send} color={S.purple} />
        <StatCard label="Total Opens" value={data.totalOpens.toLocaleString()} icon={Eye} color={S.yellow} />
        <StatCard label="Avg Open Rate" value={`${data.avgOpenRate.toFixed(1)}%`} icon={MousePointerClick} color={S.primary} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text, marginBottom: 16 }}>Device Breakdown</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.deviceBreakdown.map((d, i) => {
              const total = data.deviceBreakdown.reduce((s, x) => s + x.count, 0) || 1
              const pct = Math.round((d.count / total) * 100)
              const icon = d.type === "mobile" ? Smartphone : d.type === "desktop" ? Monitor : Tablet
              const Icon = icon
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon style={{ width: 16, height: 16, color: S.textDim }} />
                      <span style={{ fontSize: 13, color: S.text, textTransform: "capitalize" }}>{d.type}</span>
                    </div>
                    <span style={{ fontSize: 13, color: S.textMuted }}>{d.count} ({pct}%)</span>
                  </div>
                  <div style={{ width: "100%", height: 6, background: S.input, borderRadius: 3 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: S.primary, borderRadius: 3, transition: "width 0.3s" }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text, marginBottom: 16 }}>Recent Notifications</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.recentNotifications.map((n, i) => (
              <div key={i} style={{ padding: "10px 14px", background: S.input, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: S.text }}>{n.title}</p>
                  <span style={{ fontSize: 12, color: S.green }}>{n.opens} opens</span>
                </div>
                <p style={{ fontSize: 11, color: S.textDim, marginTop: 4 }}>{n.sent_at ? new Date(n.sent_at).toLocaleDateString() : "Not sent"}</p>
              </div>
            ))}
            {data.recentNotifications.length === 0 && (
              <p style={{ color: S.textMuted, textAlign: "center", padding: 20 }}>No notifications yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SubscribersTab({ data, loading }: { data: PushSubscriber[]; loading: boolean }) {
  const [search, setSearch] = useState("")

  const filtered = data.filter(s =>
    s.endpoint.toLowerCase().includes(search.toLowerCase()) ||
    s.browser.toLowerCase().includes(search.toLowerCase()) ||
    s.os.toLowerCase().includes(search.toLowerCase()) ||
    s.device_type.toLowerCase().includes(search.toLowerCase())
  )

  const deviceIcon = (type: string) => {
    switch (type) {
      case "mobile": return Smartphone
      case "tablet": return Tablet
      default: return Monitor
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: S.textDim }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search subscribers..."
            style={{ background: S.input, border: `1px solid ${S.border}`, borderRadius: 8, padding: "8px 12px 8px 34px", color: S.text, fontSize: 13, width: 280, outline: "none" }}
          />
        </div>
        <span style={{ fontSize: 13, color: S.textMuted }}>{filtered.length} subscriber{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <p style={{ color: S.textMuted, textAlign: "center", padding: 40 }}>No push subscribers found</p>
        ) : (
          <div>
            {filtered.map(s => {
              const DevIcon = deviceIcon(s.device_type)
              const shortEndpoint = s.endpoint.slice(0, 40) + "..."
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid ${S.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: `${S.primary}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <DevIcon style={{ width: 18, height: 18, color: S.primary }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, color: S.text, fontFamily: "monospace" }}>{shortEndpoint}</p>
                      <p style={{ fontSize: 11, color: S.textDim, marginTop: 2 }}>{s.browser} on {s.os} · {s.device_type}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 11, color: S.textDim }}>Subscribed {new Date(s.subscribed_at).toLocaleDateString()}</span>
                    {s.last_seen_at && <span style={{ fontSize: 11, color: S.textDim }}>Last seen {new Date(s.last_seen_at).toLocaleDateString()}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function NotificationsTab({ data, loading, onRefresh, onSend }: { data: PushNotification[]; loading: boolean; onRefresh: () => void; onSend: (id: string) => void }) {
  const statusColor = (status: string) => {
    switch (status) {
      case "sent": return S.green
      case "draft": return S.textDim
      case "scheduled": return S.yellow
      case "sending": return S.primary
      default: return S.textDim
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text }}>Notifications ({data.length})</h3>
        <button onClick={onRefresh} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: "8px 14px", color: S.text, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw style={{ width: 14, height: 14 }} /> Refresh
        </button>
      </div>

      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
        {loading ? <LoadingSpinner /> : data.length === 0 ? (
          <p style={{ color: S.textMuted, textAlign: "center", padding: 40 }}>No notifications yet. Compose your first push notification.</p>
        ) : data.map(n => (
          <div key={n.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${S.border}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: S.text }}>{n.title}</p>
                <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 10px", borderRadius: 20, background: `${statusColor(n.status)}20`, color: statusColor(n.status) }}>{n.status}</span>
              </div>
              <p style={{ fontSize: 12, color: S.textDim, marginTop: 4, maxWidth: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.body}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {n.sent_count != null && <span style={{ fontSize: 12, color: S.textDim }}>{n.sent_count} sent</span>}
              {n.open_count != null && <span style={{ fontSize: 12, color: S.green }}>{n.open_count} opens</span>}
              <span style={{ fontSize: 11, color: S.textDim }}>{n.sent_at ? new Date(n.sent_at).toLocaleDateString() : new Date(n.created_at).toLocaleDateString()}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {n.status === "draft" && (
                  <button onClick={() => onSend(n.id)} style={{ background: S.green, border: "none", borderRadius: 6, padding: "5px 12px", color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <Send style={{ width: 12, height: 12 }} /> Send
                  </button>
                )}
                <button style={{ background: "transparent", border: `1px solid ${S.border}`, borderRadius: 6, padding: "5px 8px", color: S.red, fontSize: 12, cursor: "pointer" }}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ComposeTab({ onRefresh }: { onRefresh: () => void }) {
  const [form, setForm] = useState({ title: "", body: "", url: "", image: "", audience: "all" })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleSend = async (asDraft: boolean) => {
    if (!form.title || !form.body) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch("/admin/push/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: asDraft ? "create-notification" : "send-notification", ...form }),
      })
      const json = await res.json()
      if (res.ok) {
        setResult(asDraft ? "Notification saved as draft" : `Notification sent to ${json.sentCount || 0} subscribers`)
        setForm({ title: "", body: "", url: "", image: "", audience: "all" })
        onRefresh()
      } else {
        setResult(json.error || "Failed to send notification")
      }
    } catch {
      setResult("Network error")
    } finally {
      setSending(false)
    }
  }

  const inputStyle: React.CSSProperties = { background: S.input, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px", color: S.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 700 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text }}>Compose Push Notification</h3>

      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, color: S.textMuted, display: "block", marginBottom: 6 }}>Title *</label>
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Notification title" style={inputStyle} />
        </div>

        <div>
          <label style={{ fontSize: 12, color: S.textMuted, display: "block", marginBottom: 6 }}>Body *</label>
          <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Notification body text" rows={4} style={{ ...inputStyle, resize: "vertical" as const }} />
        </div>

        <div>
          <label style={{ fontSize: 12, color: S.textMuted, display: "block", marginBottom: 6 }}>URL (optional)</label>
          <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://techpivo.com/..." style={inputStyle} />
        </div>

        <div>
          <label style={{ fontSize: 12, color: S.textMuted, display: "block", marginBottom: 6 }}>Image URL (optional)</label>
          <input value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} placeholder="https://..." style={inputStyle} />
        </div>

        <div>
          <label style={{ fontSize: 12, color: S.textMuted, display: "block", marginBottom: 6 }}>Audience</label>
          <select value={form.audience} onChange={e => setForm(p => ({ ...p, audience: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="all">All Subscribers</option>
            <option value="desktop">Desktop Only</option>
            <option value="mobile">Mobile Only</option>
            <option value="chrome">Chrome Users</option>
            <option value="firefox">Firefox Users</option>
          </select>
        </div>

        {result && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: result.includes("error") || result.includes("Failed") ? `${S.red}15` : `${S.green}15`, color: result.includes("error") || result.includes("Failed") ? S.red : S.green, fontSize: 13 }}>
            {result}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => handleSend(true)} disabled={sending || !form.title || !form.body} style={{ background: S.input, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 20px", color: S.text, fontSize: 13, cursor: "pointer", opacity: sending || !form.title || !form.body ? 0.5 : 1 }}>
            Save as Draft
          </button>
          <button onClick={() => handleSend(false)} disabled={sending || !form.title || !form.body} style={{ background: S.primary, border: "none", borderRadius: 8, padding: "10px 20px", color: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: sending || !form.title || !form.body ? 0.5 : 1 }}>
            <Send style={{ width: 14, height: 14 }} /> {sending ? "Sending..." : "Send Now"}
          </button>
        </div>
      </div>
    </div>
  )
}

function AnalyticsTab({ data, loading }: { data: AnalyticsData | null; loading: boolean }) {
  if (loading) return <LoadingSpinner />
  if (!data) return <p style={{ color: S.textMuted, padding: 24 }}>No analytics data</p>

  const maxDelivery = Math.max(...data.deliveryRates.map(d => d.rate), 1)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text, marginBottom: 16 }}>Delivery Rates (30 Days)</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 140 }}>
            {data.deliveryRates.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 9, color: S.textDim }}>{d.rate}%</span>
                <div style={{ width: "100%", background: `${S.green}40`, borderRadius: "3px 3px 0 0", height: `${(d.rate / maxDelivery) * 100}%`, minHeight: 3 }} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text, marginBottom: 16 }}>Click Rates (30 Days)</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 140 }}>
            {data.clickRates.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 9, color: S.textDim }}>{d.rate}%</span>
                <div style={{ width: "100%", background: `${S.primary}40`, borderRadius: "3px 3px 0 0", height: `${d.rate * 5}%`, minHeight: 3 }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text, marginBottom: 16 }}>Subscriber Growth</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
            {data.subscriberGrowth.map((g, i) => {
              const max = Math.max(...data.subscriberGrowth.map(x => x.count), 1)
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 9, color: S.textDim }}>{g.count}</span>
                  <div style={{ width: "100%", background: `${S.primary}40`, borderRadius: "3px 3px 0 0", height: `${(g.count / max) * 100}%`, minHeight: 3 }} />
                  <span style={{ fontSize: 8, color: S.textDim }}>{g.month}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text, marginBottom: 16 }}>Browsers</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.browserBreakdown.map((b, i) => {
              const total = data.browserBreakdown.reduce((s, x) => s + x.count, 0) || 1
              const pct = Math.round((b.count / total) * 100)
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: S.text }}>{b.browser}</span>
                    <span style={{ fontSize: 12, color: S.textMuted }}>{pct}%</span>
                  </div>
                  <div style={{ width: "100%", height: 5, background: S.input, borderRadius: 3 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: S.primary, borderRadius: 3 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text, marginBottom: 16 }}>Operating Systems</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.osBreakdown.map((o, i) => {
              const total = data.osBreakdown.reduce((s, x) => s + x.count, 0) || 1
              const pct = Math.round((o.count / total) * 100)
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: S.text }}>{o.os}</span>
                    <span style={{ fontSize: 12, color: S.textMuted }}>{pct}%</span>
                  </div>
                  <div style={{ width: "100%", height: 5, background: S.input, borderRadius: 3 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: S.purple, borderRadius: 3 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PushNotificationCenterPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [subscribers, setSubscribers] = useState<PushSubscriber[]>([])
  const [notifications, setNotifications] = useState<PushNotification[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)

  const fetchData = useCallback(async (section: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/admin/push/api?section=${section}`)
      const json = await res.json()
      switch (section) {
        case "overview": setOverview(json); break
        case "subscribers": setSubscribers(json.subscribers || []); break
        case "notifications": setNotifications(json.notifications || []); break
        case "analytics": setAnalytics(json.analytics || null); break
      }
    } catch (err) {
      console.error("Failed to fetch push data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(activeTab)
  }, [activeTab, fetchData])

  const handleSendNotification = async (id: string) => {
    try {
      await fetch("/admin/push/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-notification", id }),
      })
      fetchData("notifications")
    } catch (err) {
      console.error("Failed to send notification:", err)
    }
  }

  const renderTab = () => {
    switch (activeTab) {
      case "overview": return <OverviewTab data={overview} loading={loading} />
      case "subscribers": return <SubscribersTab data={subscribers} loading={loading} />
      case "notifications": return <NotificationsTab data={notifications} loading={loading} onRefresh={() => fetchData("notifications")} onSend={handleSendNotification} />
      case "compose": return <ComposeTab onRefresh={() => { fetchData("notifications"); fetchData("overview") }} />
      case "analytics": return <AnalyticsTab data={analytics} loading={loading} />
      default: return <OverviewTab data={overview} loading={loading} />
    }
  }

  return (
    <div style={{ background: S.bg, minHeight: "100vh", padding: 32 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: S.text }}>Push Notifications</h1>
          <p style={{ fontSize: 14, color: S.textMuted, marginTop: 4 }}>Manage push subscribers, compose notifications, and track delivery analytics</p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, borderBottom: `1px solid ${S.border}`, marginBottom: 24 }}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
                  fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", transition: "all 0.15s",
                  background: isActive ? `${S.primary}15` : "transparent",
                  color: isActive ? S.primary : S.textMuted,
                  borderBottom: isActive ? `2px solid ${S.primary}` : "2px solid transparent",
                  borderRadius: "8px 8px 0 0",
                }}
              >
                <Icon style={{ width: 15, height: 15 }} /> {tab.label}
              </button>
            )
          })}
        </div>

        {renderTab()}
      </div>
    </div>
  )
}
