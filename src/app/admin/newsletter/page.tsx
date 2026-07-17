"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Mail, Users, Send, FileText, List, Zap, FlaskConical, BarChart3,
  Plus, Search, Download, Upload, Eye, MousePointerClick, UserMinus,
  Clock, CheckCircle, AlertCircle, TrendingUp, TrendingDown, RefreshCw,
  Trash2, Edit3, Copy, ArrowUpRight, Filter, ChevronDown
} from "lucide-react"

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "subscribers", label: "Subscribers", icon: Users },
  { id: "campaigns", label: "Campaigns", icon: Send },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "lists", label: "Lists", icon: List },
  { id: "automations", label: "Automations", icon: Zap },
  { id: "abtests", label: "A/B Tests", icon: FlaskConical },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
]

const S = {
  bg: "#0F1117",
  card: "#1C1F2E",
  cardHover: "#232738",
  border: "#2A2D3E",
  primary: "#2563EB",
  primaryHover: "#1D4ED8",
  green: "#22C55E",
  red: "#EF4444",
  yellow: "#EAB308",
  purple: "#A855F7",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  textDim: "#64748B",
  input: "#141620",
}

interface Subscriber {
  id: string
  email: string
  name: string | null
  status: string
  list_id: string | null
  subscribed_at: string
  unsubscribed_at: string | null
  source: string | null
}

interface Campaign {
  id: string
  name: string
  subject: string
  status: string
  list_id: string | null
  template_id: string | null
  sent_at: string | null
  scheduled_at: string | null
  created_at: string
  open_rate: number | null
  click_rate: number | null
  recipients: number | null
}

interface Template {
  id: string
  name: string
  subject: string
  html: string
  created_at: string
  updated_at: string
}

interface SubscriberList {
  id: string
  name: string
  description: string | null
  subscriber_count: number
  created_at: string
}

interface Automation {
  id: string
  name: string
  trigger: string
  action: string
  status: string
  runs: number
  created_at: string
}

interface ABTest {
  id: string
  name: string
  status: string
  variant_a_subject: string
  variant_b_subject: string
  variant_a_opens: number
  variant_b_opens: number
  variant_a_clicks: number
  variant_b_clicks: number
  winner: string | null
  created_at: string
}

interface OverviewData {
  totalSubscribers: number
  activeSubscribers: number
  totalCampaigns: number
  sentCampaigns: number
  avgOpenRate: number
  avgClickRate: number
  recentActivity: Array<{ type: string; message: string; time: string }>
  subscriberGrowth: Array<{ month: string; count: number }>
}

interface AnalyticsData {
  subscriberGrowth: Array<{ month: string; count: number }>
  campaignPerformance: Array<{ name: string; opens: number; clicks: number; sent: number }>
  openRateHistory: Array<{ date: string; rate: number }>
  clickRateHistory: Array<{ date: string; rate: number }>
  topCampaigns: Array<{ name: string; openRate: number; clickRate: number }>
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
          {change && (
            <p style={{ fontSize: 12, color: change.startsWith("+") ? S.green : S.red, marginTop: 4 }}>
              {change}
            </p>
          )}
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
        <StatCard label="Total Subscribers" value={data.totalSubscribers.toLocaleString()} change="+12% this month" icon={Users} color={S.primary} />
        <StatCard label="Active Subscribers" value={data.activeSubscribers.toLocaleString()} change="+8% this month" icon={Mail} color={S.green} />
        <StatCard label="Total Campaigns" value={data.totalCampaigns.toString()} icon={Send} color={S.purple} />
        <StatCard label="Sent Campaigns" value={data.sentCampaigns.toString()} icon={CheckCircle} color={S.green} />
        <StatCard label="Avg Open Rate" value={`${data.avgOpenRate.toFixed(1)}%`} change="+2.3%" icon={Eye} color={S.primary} />
        <StatCard label="Avg Click Rate" value={`${data.avgClickRate.toFixed(1)}%`} change="+1.1%" icon={MousePointerClick} color={S.yellow} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text, marginBottom: 16 }}>Subscriber Growth</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140 }}>
            {(data.subscriberGrowth?.length ? data.subscriberGrowth : [35, 42, 38, 55, 48, 62, 58, 72, 68, 85, 78, 92]).map((h: any, i: number) => (
              <div key={i} style={{ flex: 1, background: `${S.primary}30`, borderRadius: "4px 4px 0 0", height: `${typeof h === 'number' ? h : Math.min((h.count || 0) * 5, 100)}%`, transition: "height 0.3s" }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(m => (
              <span key={m} style={{ fontSize: 10, color: S.textDim }}>{m}</span>
            ))}
          </div>
        </div>

        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text, marginBottom: 16 }}>Recent Activity</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.recentActivity.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 12px", background: S.input, borderRadius: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.type === "subscribe" ? S.green : a.type === "campaign" ? S.primary : S.yellow, marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: S.text }}>{a.message}</p>
                  <p style={{ fontSize: 11, color: S.textDim, marginTop: 2 }}>{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SubscribersTab({ data, loading, onRefresh }: { data: Subscriber[]; loading: boolean; onRefresh: () => void }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filtered = data.filter(s => {
    const matchSearch = s.email.toLowerCase().includes(search.toLowerCase()) || (s.name && s.name.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = statusFilter === "all" || s.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: S.textDim }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search subscribers..."
              style={{ background: S.input, border: `1px solid ${S.border}`, borderRadius: 8, padding: "8px 12px 8px 34px", color: S.text, fontSize: 13, width: 260, outline: "none" }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ background: S.input, border: `1px solid ${S.border}`, borderRadius: 8, padding: "8px 12px", color: S.text, fontSize: 13, outline: "none", cursor: "pointer" }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="bounced">Bounced</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: "8px 14px", color: S.text, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Upload style={{ width: 14, height: 14 }} /> Import
          </button>
          <button style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: "8px 14px", color: S.text, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Download style={{ width: 14, height: 14 }} /> Export
          </button>
          <button onClick={onRefresh} style={{ background: S.primary, border: "none", borderRadius: 8, padding: "8px 14px", color: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw style={{ width: 14, height: 14 }} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: S.textMuted }}>{filtered.length} subscriber{filtered.length !== 1 ? "s" : ""}</span>
        </div>
        {loading ? <LoadingSpinner /> : (
          <div>
            {filtered.length === 0 ? (
              <p style={{ color: S.textMuted, textAlign: "center", padding: 40 }}>No subscribers found</p>
            ) : filtered.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid ${S.border}`, transition: "background 0.15s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${S.primary}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: S.primary }}>
                    {(s.name || s.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: S.text }}>{s.email}</p>
                    {s.name && <p style={{ fontSize: 12, color: S.textDim }}>{s.name}</p>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ fontSize: 11, color: S.textDim }}>{s.source || "Direct"}</span>
                  <span style={{ fontSize: 11, color: S.textDim }}>{new Date(s.subscribed_at).toLocaleDateString()}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20,
                    background: s.status === "active" ? `${S.green}20` : s.status === "unsubscribed" ? `${S.red}20` : `${S.yellow}20`,
                    color: s.status === "active" ? S.green : s.status === "unsubscribed" ? S.red : S.yellow
                  }}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CampaignsTab({ data, loading, onRefresh, onSend }: { data: Campaign[]; loading: boolean; onRefresh: () => void; onSend: (id: string) => void }) {
  const [showCreate, setShowCreate] = useState(false)
  const [newCampaign, setNewCampaign] = useState({ name: "", subject: "" })

  const handleCreate = async () => {
    if (!newCampaign.name || !newCampaign.subject) return
    await fetch("/admin/newsletter/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create-campaign", ...newCampaign }),
    })
    setNewCampaign({ name: "", subject: "" })
    setShowCreate(false)
    onRefresh()
  }

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
        <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text }}>Campaigns ({data.length})</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onRefresh} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: "8px 14px", color: S.text, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw style={{ width: 14, height: 14 }} /> Refresh
          </button>
          <button onClick={() => setShowCreate(!showCreate)} style={{ background: S.primary, border: "none", borderRadius: 8, padding: "8px 14px", color: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Plus style={{ width: 14, height: 14 }} /> Create Campaign
          </button>
        </div>
      </div>

      {showCreate && (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            value={newCampaign.name}
            onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))}
            placeholder="Campaign name"
            style={{ background: S.input, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px", color: S.text, fontSize: 13, outline: "none" }}
          />
          <input
            value={newCampaign.subject}
            onChange={e => setNewCampaign(p => ({ ...p, subject: e.target.value }))}
            placeholder="Email subject line"
            style={{ background: S.input, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px", color: S.text, fontSize: 13, outline: "none" }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowCreate(false)} style={{ background: S.input, border: `1px solid ${S.border}`, borderRadius: 8, padding: "8px 16px", color: S.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
            <button onClick={handleCreate} style={{ background: S.primary, border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", fontSize: 13, cursor: "pointer" }}>Create</button>
          </div>
        </div>
      )}

      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
        {loading ? <LoadingSpinner /> : data.length === 0 ? (
          <p style={{ color: S.textMuted, textAlign: "center", padding: 40 }}>No campaigns yet. Create your first campaign.</p>
        ) : data.map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${S.border}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: S.text }}>{c.name}</p>
                <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 10px", borderRadius: 20, background: `${statusColor(c.status)}20`, color: statusColor(c.status) }}>{c.status}</span>
              </div>
              <p style={{ fontSize: 12, color: S.textDim, marginTop: 4 }}>{c.subject}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {c.recipients != null && <span style={{ fontSize: 12, color: S.textDim }}>{c.recipients} recipients</span>}
              {c.open_rate != null && <span style={{ fontSize: 12, color: S.green }}>{c.open_rate.toFixed(1)}% opens</span>}
              {c.click_rate != null && <span style={{ fontSize: 12, color: S.primary }}>{c.click_rate.toFixed(1)}% clicks</span>}
              <span style={{ fontSize: 11, color: S.textDim }}>{c.sent_at ? new Date(c.sent_at).toLocaleDateString() : c.scheduled_at ? `Scheduled ${new Date(c.scheduled_at).toLocaleDateString()}` : new Date(c.created_at).toLocaleDateString()}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {c.status === "draft" && (
                  <button onClick={() => onSend(c.id)} style={{ background: S.green, border: "none", borderRadius: 6, padding: "5px 12px", color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <Send style={{ width: 12, height: 12 }} /> Send
                  </button>
                )}
                <button onClick={() => alert('Edit feature coming soon')} style={{ background: "transparent", border: `1px solid ${S.border}`, borderRadius: 6, padding: "5px 8px", color: S.textDim, fontSize: 12, cursor: "pointer" }}>
                  <Edit3 style={{ width: 12, height: 12 }} />
                </button>
                <button onClick={() => { if (confirm('Delete this campaign?')) { fetch('/admin/newsletter/api', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'campaign', id: c.id }) }).then(() => window.location.reload()) } }} style={{ background: "transparent", border: `1px solid ${S.border}`, borderRadius: 6, padding: "5px 8px", color: S.red, fontSize: 12, cursor: "pointer" }}>
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

function TemplatesTab({ data, loading }: { data: Template[]; loading: boolean }) {
  const [preview, setPreview] = useState<Template | null>(null)
  const handleNewTemplate = async () => {
    const name = prompt('Template name:')
    if (!name) return
    await fetch('/admin/newsletter/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'template', name, subject: '', content: '' }) })
    window.location.reload()
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text }}>Templates ({data.length})</h3>
        <button onClick={handleNewTemplate} style={{ background: S.primary, border: "none", borderRadius: 8, padding: "8px 14px", color: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus style={{ width: 14, height: 14 }} /> New Template
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {data.map(t => (
            <div key={t.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = S.primary)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = S.border)}
              onClick={() => setPreview(t)}
            >
              <div style={{ height: 140, background: `linear-gradient(135deg, ${S.primary}15, ${S.purple}15)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText style={{ width: 40, height: 40, color: S.primary, opacity: 0.5 }} />
              </div>
              <div style={{ padding: 16 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: S.text }}>{t.name}</p>
                <p style={{ fontSize: 12, color: S.textDim, marginTop: 4 }}>{t.subject}</p>
                <p style={{ fontSize: 11, color: S.textDim, marginTop: 8 }}>Updated {new Date(t.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
          {data.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 60, color: S.textMuted }}>
              No templates yet. Create your first template.
            </div>
          )}
        </div>
      )}

      {preview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 40 }}
          onClick={() => setPreview(null)}>
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, width: "100%", maxWidth: 700, maxHeight: "80vh", overflow: "auto", padding: 24 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: S.text }}>{preview.name}</h3>
              <button onClick={() => setPreview(null)} style={{ background: "transparent", border: "none", color: S.textMuted, fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: S.textDim, marginBottom: 12 }}>Subject: {preview.subject}</p>
            <div style={{ background: S.input, borderRadius: 8, padding: 16, fontSize: 13, color: S.textMuted }}>
              Template preview would render here. The HTML content is stored in the database.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ListsTab({ data, loading }: { data: SubscriberList[]; loading: boolean }) {
  const handleNewList = async () => {
    const name = prompt('List name:')
    if (!name) return
    await fetch('/admin/newsletter/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'list', name, description: '' }) })
    window.location.reload()
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text }}>Lists ({data.length})</h3>
        <button onClick={handleNewList} style={{ background: S.primary, border: "none", borderRadius: 8, padding: "8px 14px", color: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus style={{ width: 14, height: 14 }} /> New List
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {data.map(l => (
            <div key={l.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: S.text }}>{l.name}</p>
                  {l.description && <p style={{ fontSize: 12, color: S.textDim, marginTop: 4 }}>{l.description}</p>}
                </div>
                <span style={{ fontSize: 20, fontWeight: 700, color: S.primary }}>{l.subscriber_count}</span>
              </div>
              <p style={{ fontSize: 11, color: S.textDim, marginTop: 12 }}>Created {new Date(l.created_at).toLocaleDateString()}</p>
            </div>
          ))}
          {data.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 60, color: S.textMuted }}>
              No lists yet. Create your first subscriber list.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AutomationsTab({ data, loading }: { data: Automation[]; loading: boolean }) {
  const handleNewAutomation = async () => {
    const name = prompt('Automation name:')
    if (!name) return
    await fetch('/admin/newsletter/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'automation', name, trigger: 'new_subscriber', actions: [] }) })
    window.location.reload()
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text }}>Automations ({data.length})</h3>
        <button onClick={handleNewAutomation} style={{ background: S.primary, border: "none", borderRadius: 8, padding: "8px 14px", color: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus style={{ width: 14, height: 14 }} /> New Automation
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {data.map(a => (
            <div key={a.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: `${S.purple}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Zap style={{ width: 20, height: 20, color: S.purple }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: S.text }}>{a.name}</p>
                  <p style={{ fontSize: 12, color: S.textDim, marginTop: 2 }}>When {a.trigger} → {a.action}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 12, color: S.textDim }}>{a.runs} runs</span>
                <span style={{
                  fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20,
                  background: a.status === "active" ? `${S.green}20` : `${S.textDim}20`,
                  color: a.status === "active" ? S.green : S.textDim
                }}>{a.status}</span>
              </div>
            </div>
          ))}
          {data.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: S.textMuted, background: S.card, borderRadius: 12, border: `1px solid ${S.border}` }}>
              No automations yet. Create your first workflow.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ABTestsTab({ data, loading }: { data: ABTest[]; loading: boolean }) {
  const handleNewTest = () => alert('Create a draft campaign first, then set up A/B test from the campaign page.')

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text }}>A/B Tests ({data.length})</h3>
        <button onClick={handleNewTest} style={{ background: S.primary, border: "none", borderRadius: 8, padding: "8px 14px", color: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <FlaskConical style={{ width: 14, height: 14 }} /> New Test
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {data.map(t => (
            <div key={t.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: S.text }}>{t.name}</p>
                  <p style={{ fontSize: 12, color: S.textDim, marginTop: 4 }}>Created {new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20,
                  background: t.status === "completed" ? `${S.green}20` : t.status === "running" ? `${S.primary}20` : `${S.textDim}20`,
                  color: t.status === "completed" ? S.green : t.status === "running" ? S.primary : S.textDim
                }}>{t.status}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ background: S.input, borderRadius: 8, padding: 16, border: t.winner === "A" ? `2px solid ${S.green}` : `1px solid ${S.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: S.text }}>Variant A</span>
                    {t.winner === "A" && <span style={{ fontSize: 11, color: S.green, fontWeight: 600 }}>Winner</span>}
                  </div>
                  <p style={{ fontSize: 13, color: S.text, marginBottom: 8 }}>{t.variant_a_subject}</p>
                  <div style={{ display: "flex", gap: 16 }}>
                    <span style={{ fontSize: 12, color: S.textMuted }}><Eye style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />{t.variant_a_opens} opens</span>
                    <span style={{ fontSize: 12, color: S.textMuted }}><MousePointerClick style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />{t.variant_a_clicks} clicks</span>
                  </div>
                </div>
                <div style={{ background: S.input, borderRadius: 8, padding: 16, border: t.winner === "B" ? `2px solid ${S.green}` : `1px solid ${S.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: S.text }}>Variant B</span>
                    {t.winner === "B" && <span style={{ fontSize: 11, color: S.green, fontWeight: 600 }}>Winner</span>}
                  </div>
                  <p style={{ fontSize: 13, color: S.text, marginBottom: 8 }}>{t.variant_b_subject}</p>
                  <div style={{ display: "flex", gap: 16 }}>
                    <span style={{ fontSize: 12, color: S.textMuted }}><Eye style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />{t.variant_b_opens} opens</span>
                    <span style={{ fontSize: 12, color: S.textMuted }}><MousePointerClick style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />{t.variant_b_clicks} clicks</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {data.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: S.textMuted, background: S.card, borderRadius: 12, border: `1px solid ${S.border}` }}>
              No A/B tests yet. Create your first test.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AnalyticsTab({ data, loading }: { data: AnalyticsData | null; loading: boolean }) {
  if (loading) return <LoadingSpinner />
  if (!data) return <p style={{ color: S.textMuted, padding: 24 }}>No analytics data</p>

  const maxGrowth = Math.max(...data.subscriberGrowth.map(g => g.count), 1)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text, marginBottom: 16 }}>Subscriber Growth</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160 }}>
            {data.subscriberGrowth.map((g, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, color: S.textDim }}>{g.count}</span>
                <div style={{ width: "100%", background: `${S.primary}40`, borderRadius: "4px 4px 0 0", height: `${(g.count / maxGrowth) * 100}%`, minHeight: 4 }} />
                <span style={{ fontSize: 9, color: S.textDim }}>{g.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text, marginBottom: 16 }}>Open Rate History</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 160 }}>
            {data.openRateHistory.map((h, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, color: S.textDim }}>{h.rate}%</span>
                <div style={{ width: "100%", background: `${S.green}40`, borderRadius: "4px 4px 0 0", height: `${h.rate * 2}%`, minHeight: 4 }} />
                <span style={{ fontSize: 9, color: S.textDim }}>{h.date.slice(-5)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text, marginBottom: 16 }}>Campaign Performance</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.campaignPerformance.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 14px", background: S.input, borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: S.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
              <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: S.textDim }}>{c.sent} sent</span>
                <span style={{ fontSize: 12, color: S.green }}>{c.opens} opens</span>
                <span style={{ fontSize: 12, color: S.primary }}>{c.clicks} clicks</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: S.text, marginBottom: 16 }}>Top Performing Campaigns</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.topCampaigns.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: S.input, borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: S.text }}>{c.name}</span>
              <div style={{ display: "flex", gap: 20 }}>
                <span style={{ fontSize: 12, color: S.green }}>{c.openRate.toFixed(1)}% open</span>
                <span style={{ fontSize: 12, color: S.primary }}>{c.clickRate.toFixed(1)}% click</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function NewsletterCenterPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [lists, setLists] = useState<SubscriberList[]>([])
  const [automations, setAutomations] = useState<Automation[]>([])
  const [abTests, setAbTests] = useState<ABTest[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)

  const fetchData = useCallback(async (section: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/admin/newsletter/api?section=${section}`)
      const json = await res.json()
      switch (section) {
        case "overview": setOverview(json); break
        case "subscribers": setSubscribers(json.subscribers || []); break
        case "campaigns": setCampaigns(json.campaigns || []); break
        case "templates": setTemplates(json.templates || []); break
        case "lists": setLists(json.lists || []); break
        case "automations": setAutomations(json.automations || []); break
        case "abtests": setAbTests(json.abTests || []); break
        case "analytics": setAnalytics(json.analytics || null); break
      }
    } catch (err) {
      console.error("Failed to fetch newsletter data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(activeTab)
  }, [activeTab, fetchData])

  const handleSendCampaign = async (id: string) => {
    try {
      await fetch("/admin/newsletter/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-campaign", id }),
      })
      fetchData("campaigns")
    } catch (err) {
      console.error("Failed to send campaign:", err)
    }
  }

  const renderTab = () => {
    switch (activeTab) {
      case "overview": return <OverviewTab data={overview} loading={loading} />
      case "subscribers": return <SubscribersTab data={subscribers} loading={loading} onRefresh={() => fetchData("subscribers")} />
      case "campaigns": return <CampaignsTab data={campaigns} loading={loading} onRefresh={() => fetchData("campaigns")} onSend={handleSendCampaign} />
      case "templates": return <TemplatesTab data={templates} loading={loading} />
      case "lists": return <ListsTab data={lists} loading={loading} />
      case "automations": return <AutomationsTab data={automations} loading={loading} />
      case "abtests": return <ABTestsTab data={abTests} loading={loading} />
      case "analytics": return <AnalyticsTab data={analytics} loading={loading} />
      default: return <OverviewTab data={overview} loading={loading} />
    }
  }

  return (
    <div style={{ background: S.bg, minHeight: "100vh", padding: 32 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: S.text }}>Newsletter Center</h1>
          <p style={{ fontSize: 14, color: S.textMuted, marginTop: 4 }}>Manage subscribers, campaigns, templates, and newsletter analytics</p>
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
