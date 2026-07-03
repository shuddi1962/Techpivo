"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

const BG = "#0F1117"
const CARD = "#1C1F2E"
const BORDER = "#2A2D3E"
const ACCENT = "#3B82F6"
const ACCENT_DIM = "rgba(59,130,246,0.15)"
const TEXT = "#E5E7EB"
const TEXT_DIM = "#9CA3AF"
const SUCCESS = "#10B981"
const DANGER = "#EF4444"
const WARN = "#F59E0B"

interface AdPlacement {
  id: string
  name: string
  position: string
  description: string
  ad_type: string
  sizes: string[]
  is_active: boolean
  current_ad_id: string | null
  impressions: number
  clicks: number
  created_at: string
}

interface AdCampaign {
  id: string
  advertiser_name: string
  ad_image_url: string | null
  destination_url: string | null
  ad_code: string | null
  positions: string[]
  start_date: string | null
  end_date: string | null
  daily_impression_cap: number | null
  impressions: number
  clicks: number
  is_active: boolean
  created_at: string
}

interface AdSchedule {
  id: string
  name: string
  ad_id: string | null
  campaign_id: string | null
  start_date: string
  end_date: string | null
  frequency: string
  priority: number
  is_active: boolean
  created_at: string
}

interface AdRevenueEntry {
  id: string
  ad_id: string | null
  campaign_id: string | null
  source: string
  impressions: number
  clicks: number
  revenue: number
  cpm: number
  cpc: number
  date: string
}

interface OverviewData {
  total_impressions: number
  total_clicks: number
  total_revenue: number
  fill_rate: number
  active_placements: number
  active_campaigns: number
  avg_ctr: number
  top_sources: { source: string; revenue: number; impressions: number }[]
}

interface ReportRow {
  date: string
  impressions: number
  clicks: number
  revenue: number
  source: string
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "placements", label: "Placements" },
  { id: "campaigns", label: "Campaigns" },
  { id: "schedule", label: "Schedule" },
  { id: "direct", label: "Direct Ads" },
  { id: "revenue", label: "Revenue" },
  { id: "native", label: "Native Ads" },
  { id: "reports", label: "Reports" },
]

const cardStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: 20,
  ...extra,
})

const inputStyle: React.CSSProperties = {
  background: BG,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: "10px 14px",
  color: TEXT,
  fontSize: 14,
  width: "100%",
  outline: "none",
}

const btnPrimary: React.CSSProperties = {
  background: ACCENT,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 20px",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
}

const btnSecondary: React.CSSProperties = {
  background: "transparent",
  color: TEXT_DIM,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: "8px 16px",
  cursor: "pointer",
  fontSize: 13,
}

const badge = (color: string): React.CSSProperties => ({
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 600,
  background: `${color}22`,
  color,
})

const fmt = (n: number) => n.toLocaleString()
const fmtCurrency = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function AdminAdsPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [placements, setPlacements] = useState<AdPlacement[]>([])
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([])
  const [schedules, setSchedules] = useState<AdSchedule[]>([])
  const [revenueData, setRevenueData] = useState<AdRevenueEntry[]>([])
  const [reports, setReports] = useState<ReportRow[]>([])
  const [reportPeriod, setReportPeriod] = useState("daily")

  const [showPlacementForm, setShowPlacementForm] = useState(false)
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [showScheduleForm, setShowScheduleForm] = useState(false)

  const [placementForm, setPlacementForm] = useState({ name: "", position: "", description: "", ad_type: "banner", sizes: "300x250" })
  const [campaignForm, setCampaignForm] = useState({ advertiser_name: "", ad_image_url: "", destination_url: "", ad_code: "", positions: "", start_date: "", end_date: "", daily_impression_cap: 0, is_active: true })
  const [scheduleForm, setScheduleForm] = useState({ name: "", ad_id: "", campaign_id: "", start_date: "", end_date: "", frequency: "always", priority: 0 })

  const [editingPlacement, setEditingPlacement] = useState<AdPlacement | null>(null)
  const [editingCampaign, setEditingCampaign] = useState<AdCampaign | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<AdSchedule | null>(null)

  const fetchData = useCallback(async (section: string) => {
    try {
      const res = await fetch(`/admin/ads/api?section=${section}`)
      const data = await res.json()
      return data
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [ov, pl, cm, sc, rv, rp] = await Promise.all([
        fetchData("overview"),
        fetchData("placements"),
        fetchData("campaigns"),
        fetchData("schedule"),
        fetchData("revenue"),
        fetchData("reports"),
      ])
      if (ov) setOverview(ov.overview)
      if (pl) setPlacements(pl.placements || [])
      if (cm) setCampaigns(cm.campaigns || [])
      if (sc) setSchedules(sc.schedules || [])
      if (rv) setRevenueData(rv.revenue || [])
      if (rp) setReports(rp.reports || [])
      setLoading(false)
    }
    load()
  }, [fetchData])

  const handleCreatePlacement = async () => {
    if (!placementForm.name || !placementForm.position) return
    const res = await fetch("/admin/ads/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "placement", ...placementForm, sizes: placementForm.sizes.split(",").map(s => s.trim()) }),
    })
    if (res.ok) {
      const data = await res.json()
      setPlacements(prev => [data.placement, ...prev])
      setShowPlacementForm(false)
      setPlacementForm({ name: "", position: "", description: "", ad_type: "banner", sizes: "300x250" })
    }
  }

  const handleDeletePlacement = async (id: string) => {
    if (!confirm("Delete this placement?")) return
    const res = await fetch("/admin/ads/api", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "placement", id }),
    })
    if (res.ok) setPlacements(prev => prev.filter(p => p.id !== id))
  }

  const handleCreateCampaign = async () => {
    if (!campaignForm.advertiser_name) return
    const res = await fetch("/admin/ads/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "campaign", ...campaignForm, positions: campaignForm.positions.split(",").map(s => s.trim()) }),
    })
    if (res.ok) {
      const data = await res.json()
      setCampaigns(prev => [data.campaign, ...prev])
      setShowCampaignForm(false)
      setCampaignForm({ advertiser_name: "", ad_image_url: "", destination_url: "", ad_code: "", positions: "", start_date: "", end_date: "", daily_impression_cap: 0, is_active: true })
    }
  }

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm("Delete this campaign?")) return
    const res = await fetch("/admin/ads/api", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "campaign", id }),
    })
    if (res.ok) setCampaigns(prev => prev.filter(c => c.id !== id))
  }

  const handleCreateSchedule = async () => {
    if (!scheduleForm.name || !scheduleForm.start_date) return
    const res = await fetch("/admin/ads/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "schedule", ...scheduleForm }),
    })
    if (res.ok) {
      const data = await res.json()
      setSchedules(prev => [data.schedule, ...prev])
      setShowScheduleForm(false)
      setScheduleForm({ name: "", ad_id: "", campaign_id: "", start_date: "", end_date: "", frequency: "always", priority: 0 })
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("Delete this schedule?")) return
    const res = await fetch("/admin/ads/api", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "schedule", id }),
    })
    if (res.ok) setSchedules(prev => prev.filter(s => s.id !== id))
  }

  if (loading) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: ACCENT, fontSize: 18 }}>Loading Advertisement Center...</div>
      </div>
    )
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ color: TEXT, fontSize: 28, fontWeight: 700, margin: 0 }}>Advertisement Center</h1>
            <p style={{ color: TEXT_DIM, fontSize: 14, margin: "4px 0 0" }}>Manage ad placements, campaigns, schedules and revenue</p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setShowPlacementForm(true)} style={btnPrimary}>+ New Placement</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: `1px solid ${BORDER}`, paddingBottom: 0, overflowX: "auto" }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: "12px 20px",
                background: "transparent",
                color: activeTab === t.id ? ACCENT : TEXT_DIM,
                border: "none",
                borderBottom: activeTab === t.id ? `2px solid ${ACCENT}` : "2px solid transparent",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: activeTab === t.id ? 600 : 400,
                whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && overview && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Total Impressions", value: fmt(overview.total_impressions), color: ACCENT },
                { label: "Total Clicks", value: fmt(overview.total_clicks), color: "#8B5CF6" },
                { label: "Revenue", value: fmtCurrency(overview.total_revenue), color: SUCCESS },
                { label: "Fill Rate", value: `${overview.fill_rate.toFixed(1)}%`, color: ACCENT },
                { label: "Avg. CTR", value: `${overview.avg_ctr.toFixed(2)}%`, color: WARN },
                { label: "Active Placements", value: fmt(overview.active_placements), color: "#8B5CF6" },
                { label: "Active Campaigns", value: fmt(overview.active_campaigns), color: SUCCESS },
              ].map((k, i) => (
                <div key={i} style={cardStyle({ textAlign: "center" })}>
                  <div style={{ color: TEXT_DIM, fontSize: 12, marginBottom: 8 }}>{k.label}</div>
                  <div style={{ color: k.color, fontSize: 28, fontWeight: 700 }}>{k.value}</div>
                </div>
              ))}
            </div>
            <div style={cardStyle()}>
              <h3 style={{ color: TEXT, fontSize: 16, margin: "0 0 16px" }}>Revenue by Source</h3>
              {overview.top_sources.length === 0 ? (
                <p style={{ color: TEXT_DIM, fontSize: 14 }}>No source data yet</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {overview.top_sources.map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: BG, borderRadius: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: ACCENT_DIM, display: "flex", alignItems: "center", justifyContent: "center", color: ACCENT, fontWeight: 700, fontSize: 14 }}>{s.source.charAt(0).toUpperCase()}</div>
                        <span style={{ color: TEXT, fontSize: 14, fontWeight: 500 }}>{s.source}</span>
                      </div>
                      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>{fmt(s.impressions)}</div>
                          <div style={{ color: TEXT_DIM, fontSize: 11 }}>impressions</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: SUCCESS, fontSize: 14, fontWeight: 600 }}>{fmtCurrency(s.revenue)}</div>
                          <div style={{ color: TEXT_DIM, fontSize: 11 }}>revenue</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "placements" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={() => { setShowPlacementForm(true); setEditingPlacement(null); setPlacementForm({ name: "", position: "", description: "", ad_type: "banner", sizes: "300x250" }) }} style={btnPrimary}>+ New Placement</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
              {placements.map(p => (
                <div key={p.id} style={cardStyle()}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                    <div>
                      <h4 style={{ color: TEXT, fontSize: 16, margin: "0 0 4px" }}>{p.name}</h4>
                      <span style={{ color: TEXT_DIM, fontSize: 12 }}>{p.position}</span>
                    </div>
                    <span style={badge(p.is_active ? SUCCESS : DANGER)}>{p.is_active ? "Active" : "Inactive"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <span style={badge(ACCENT)}>{p.ad_type}</span>
                    {p.sizes?.map((s, i) => <span key={i} style={badge("#8B5CF6")}>{s}</span>)}
                  </div>
                  {p.description && <p style={{ color: TEXT_DIM, fontSize: 13, margin: "0 0 12px" }}>{p.description}</p>}
                  <div style={{ display: "flex", gap: 20, borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                    <div>
                      <div style={{ color: TEXT, fontSize: 16, fontWeight: 700 }}>{fmt(p.impressions)}</div>
                      <div style={{ color: TEXT_DIM, fontSize: 11 }}>Impressions</div>
                    </div>
                    <div>
                      <div style={{ color: TEXT, fontSize: 16, fontWeight: 700 }}>{fmt(p.clicks)}</div>
                      <div style={{ color: TEXT_DIM, fontSize: 11 }}>Clicks</div>
                    </div>
                    <div>
                      <div style={{ color: ACCENT, fontSize: 16, fontWeight: 700 }}>{p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(2) : "0"}%</div>
                      <div style={{ color: TEXT_DIM, fontSize: 11 }}>CTR</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={() => { setEditingPlacement(p); setPlacementForm({ name: p.name, position: p.position, description: p.description, ad_type: p.ad_type, sizes: p.sizes?.join(", ") || "" }); setShowPlacementForm(true) }} style={{ ...btnSecondary, flex: 1, textAlign: "center" }}>Edit</button>
                    <button onClick={() => handleDeletePlacement(p.id)} style={{ ...btnSecondary, color: DANGER, borderColor: `${DANGER}44` }}>Delete</button>
                  </div>
                </div>
              ))}
              {placements.length === 0 && <div style={{ ...cardStyle({ gridColumn: "1 / -1" }), textAlign: "center", padding: 60, color: TEXT_DIM }}>No ad placements configured</div>}
            </div>
          </div>
        )}

        {activeTab === "campaigns" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={() => { setShowCampaignForm(true); setEditingCampaign(null); setCampaignForm({ advertiser_name: "", ad_image_url: "", destination_url: "", ad_code: "", positions: "", start_date: "", end_date: "", daily_impression_cap: 0, is_active: true }) }} style={btnPrimary}>+ New Campaign</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
              {campaigns.map(c => (
                <div key={c.id} style={cardStyle()}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                    <h4 style={{ color: TEXT, fontSize: 16, margin: 0 }}>{c.advertiser_name}</h4>
                    <span style={badge(c.is_active ? SUCCESS : DANGER)}>{c.is_active ? "Active" : "Paused"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {c.positions?.map((pos, i) => <span key={i} style={badge(ACCENT)}>{pos}</span>)}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ color: TEXT_DIM, fontSize: 11 }}>Impressions</div>
                      <div style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>{fmt(c.impressions)}</div>
                    </div>
                    <div>
                      <div style={{ color: TEXT_DIM, fontSize: 11 }}>Clicks</div>
                      <div style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>{fmt(c.clicks)}</div>
                    </div>
                    <div>
                      <div style={{ color: TEXT_DIM, fontSize: 11 }}>CTR</div>
                      <div style={{ color: ACCENT, fontSize: 14, fontWeight: 600 }}>{c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : "0"}%</div>
                    </div>
                  </div>
                  {c.start_date && (
                    <div style={{ color: TEXT_DIM, fontSize: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
                      {c.start_date}{c.end_date ? ` → ${c.end_date}` : " → ongoing"}
                      {c.daily_impression_cap ? ` · Cap: ${fmt(c.daily_impression_cap)}/day` : ""}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={() => { setEditingCampaign(c); setCampaignForm({ advertiser_name: c.advertiser_name, ad_image_url: c.ad_image_url || "", destination_url: c.destination_url || "", ad_code: c.ad_code || "", positions: c.positions?.join(", ") || "", start_date: c.start_date || "", end_date: c.end_date || "", daily_impression_cap: c.daily_impression_cap || 0, is_active: c.is_active }); setShowCampaignForm(true) }} style={{ ...btnSecondary, flex: 1, textAlign: "center" }}>Edit</button>
                    <button onClick={() => handleDeleteCampaign(c.id)} style={{ ...btnSecondary, color: DANGER, borderColor: `${DANGER}44` }}>Delete</button>
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && <div style={{ ...cardStyle({ gridColumn: "1 / -1" }), textAlign: "center", padding: 60, color: TEXT_DIM }}>No campaigns yet</div>}
            </div>
          </div>
        )}

        {activeTab === "schedule" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={() => { setShowScheduleForm(true); setEditingSchedule(null); setScheduleForm({ name: "", ad_id: "", campaign_id: "", start_date: "", end_date: "", frequency: "always", priority: 0 }) }} style={btnPrimary}>+ New Schedule</button>
            </div>
            <div style={cardStyle({ padding: 0, overflow: "hidden" })}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Name", "Frequency", "Start", "End", "Priority", "Status", "Actions"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: TEXT_DIM, fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedules.map(s => (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "12px 16px", color: TEXT, fontSize: 14, fontWeight: 500 }}>{s.name}</td>
                      <td style={{ padding: "12px 16px" }}><span style={badge(ACCENT)}>{s.frequency}</span></td>
                      <td style={{ padding: "12px 16px", color: TEXT, fontSize: 13 }}>{s.start_date?.slice(0, 10) || "—"}</td>
                      <td style={{ padding: "12px 16px", color: TEXT, fontSize: 13 }}>{s.end_date?.slice(0, 10) || "—"}</td>
                      <td style={{ padding: "12px 16px", color: TEXT, fontSize: 13 }}>{s.priority}</td>
                      <td style={{ padding: "12px 16px" }}><span style={badge(s.is_active ? SUCCESS : DANGER)}>{s.is_active ? "Active" : "Inactive"}</span></td>
                      <td style={{ padding: "12px 16px" }}>
                        <button onClick={() => handleDeleteSchedule(s.id)} style={{ ...btnSecondary, padding: "4px 10px", fontSize: 12, color: DANGER, borderColor: `${DANGER}44` }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {schedules.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: TEXT_DIM }}>No schedules configured</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "direct" && (
          <div>
            <div style={cardStyle()}>
              <h3 style={{ color: TEXT, fontSize: 16, margin: "0 0 16px" }}>Direct Advertising Management</h3>
              <p style={{ color: TEXT_DIM, fontSize: 14, marginBottom: 20 }}>Manage direct advertising partnerships, sponsorships, and branded content deals.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                {campaigns.filter(c => c.ad_code || c.ad_image_url).length === 0 ? (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40, color: TEXT_DIM }}>No direct ad campaigns. Create a campaign with custom code or image to manage direct ads.</div>
                ) : (
                  campaigns.filter(c => c.ad_code || c.ad_image_url).map(c => (
                    <div key={c.id} style={cardStyle({ border: `1px solid ${ACCENT}44` })}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ color: TEXT, fontWeight: 600 }}>{c.advertiser_name}</span>
                        <span style={badge(c.is_active ? SUCCESS : DANGER)}>{c.is_active ? "Live" : "Paused"}</span>
                      </div>
                      <div style={{ color: TEXT_DIM, fontSize: 13, marginBottom: 8 }}>
                        {c.ad_code ? "Custom Code" : "Banner Image"}
                        {c.daily_impression_cap ? ` · ${fmt(c.daily_impression_cap)} imp/day` : ""}
                      </div>
                      <div style={{ display: "flex", gap: 16, borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
                        <div><span style={{ color: TEXT, fontWeight: 600 }}>{fmt(c.impressions)}</span> <span style={{ color: TEXT_DIM, fontSize: 11 }}>imp</span></div>
                        <div><span style={{ color: TEXT, fontWeight: 600 }}>{fmt(c.clicks)}</span> <span style={{ color: TEXT_DIM, fontSize: 11 }}>clicks</span></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "revenue" && (
          <div>
            <div style={cardStyle({ padding: 0, overflow: "hidden" })}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
                <h3 style={{ color: TEXT, fontSize: 16, margin: 0 }}>Revenue by Source</h3>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Date", "Source", "Impressions", "Clicks", "Revenue", "CPM", "CPC"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: TEXT_DIM, fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {revenueData.map(r => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "12px 16px", color: TEXT, fontSize: 13 }}>{r.date}</td>
                      <td style={{ padding: "12px 16px" }}><span style={badge(ACCENT)}>{r.source}</span></td>
                      <td style={{ padding: "12px 16px", color: TEXT, fontSize: 13 }}>{fmt(r.impressions)}</td>
                      <td style={{ padding: "12px 16px", color: TEXT, fontSize: 13 }}>{fmt(r.clicks)}</td>
                      <td style={{ padding: "12px 16px", color: SUCCESS, fontSize: 13, fontWeight: 600 }}>{fmtCurrency(r.revenue)}</td>
                      <td style={{ padding: "12px 16px", color: TEXT, fontSize: 13 }}>{fmtCurrency(r.cpm)}</td>
                      <td style={{ padding: "12px 16px", color: TEXT, fontSize: 13 }}>{fmtCurrency(r.cpc)}</td>
                    </tr>
                  ))}
                  {revenueData.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: TEXT_DIM }}>No revenue data yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "native" && (
          <div>
            <div style={cardStyle()}>
              <h3 style={{ color: TEXT, fontSize: 16, margin: "0 0 16px" }}>Native Ad Management</h3>
              <p style={{ color: TEXT_DIM, fontSize: 14, marginBottom: 20 }}>Manage native advertising placements that blend with editorial content.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                {placements.filter(p => p.ad_type === "native").length === 0 ? (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40, color: TEXT_DIM }}>No native ad placements configured. Create a placement with type &quot;native&quot; to manage native ads.</div>
                ) : (
                  placements.filter(p => p.ad_type === "native").map(p => (
                    <div key={p.id} style={cardStyle({ border: `1px solid ${ACCENT}44` })}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ color: TEXT, fontWeight: 600 }}>{p.name}</span>
                        <span style={badge(p.is_active ? SUCCESS : DANGER)}>{p.is_active ? "Live" : "Paused"}</span>
                      </div>
                      <div style={{ color: TEXT_DIM, fontSize: 13, marginBottom: 8 }}>Position: {p.position}</div>
                      <div style={{ display: "flex", gap: 16, borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
                        <div><span style={{ color: TEXT, fontWeight: 600 }}>{fmt(p.impressions)}</span> <span style={{ color: TEXT_DIM, fontSize: 11 }}>imp</span></div>
                        <div><span style={{ color: TEXT, fontWeight: 600 }}>{fmt(p.clicks)}</span> <span style={{ color: TEXT_DIM, fontSize: 11 }}>clicks</span></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              {["daily", "weekly", "monthly"].map(p => (
                <button key={p} onClick={() => setReportPeriod(p)} style={{ ...btnSecondary, background: reportPeriod === p ? ACCENT_DIM : "transparent", color: reportPeriod === p ? ACCENT : TEXT_DIM, borderColor: reportPeriod === p ? ACCENT : BORDER }}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>
              ))}
            </div>
            <div style={cardStyle({ padding: 0, overflow: "hidden" })}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Date", "Source", "Impressions", "Clicks", "Revenue", "CTR"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: TEXT_DIM, fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "12px 16px", color: TEXT, fontSize: 13 }}>{r.date}</td>
                      <td style={{ padding: "12px 16px" }}><span style={badge(ACCENT)}>{r.source}</span></td>
                      <td style={{ padding: "12px 16px", color: TEXT, fontSize: 13 }}>{fmt(r.impressions)}</td>
                      <td style={{ padding: "12px 16px", color: TEXT, fontSize: 13 }}>{fmt(r.clicks)}</td>
                      <td style={{ padding: "12px 16px", color: SUCCESS, fontSize: 13, fontWeight: 600 }}>{fmtCurrency(r.revenue)}</td>
                      <td style={{ padding: "12px 16px", color: ACCENT, fontSize: 13 }}>{r.impressions > 0 ? ((r.clicks / r.impressions) * 100).toFixed(2) : "0"}%</td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: TEXT_DIM }}>No report data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showPlacementForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => { setShowPlacementForm(false); setEditingPlacement(null) }}>
          <div style={{ ...cardStyle({ width: 520, maxHeight: "80vh", overflow: "auto" }) }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: TEXT, fontSize: 18, margin: "0 0 20px" }}>{editingPlacement ? "Edit Placement" : "New Ad Placement"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Placement Name *</label>
                <input value={placementForm.name} onChange={e => setPlacementForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Sidebar Banner" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Position Key *</label>
                <input value={placementForm.position} onChange={e => setPlacementForm(p => ({ ...p, position: e.target.value }))} placeholder="e.g. sidebar-right" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Ad Type</label>
                  <select value={placementForm.ad_type} onChange={e => setPlacementForm(p => ({ ...p, ad_type: e.target.value }))} style={inputStyle}>
                    <option value="banner">Banner</option>
                    <option value="native">Native</option>
                    <option value="popup">Popup</option>
                    <option value="sticky">Sticky</option>
                    <option value="infeed">In-Feed</option>
                    <option value="interstitial">Interstitial</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Sizes (comma-sep)</label>
                  <input value={placementForm.sizes} onChange={e => setPlacementForm(p => ({ ...p, sizes: e.target.value }))} placeholder="300x250, 728x90" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Description</label>
                <input value={placementForm.description} onChange={e => setPlacementForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={handleCreatePlacement} style={btnPrimary}>{editingPlacement ? "Update" : "Create"}</button>
                <button onClick={() => { setShowPlacementForm(false); setEditingPlacement(null) }} style={btnSecondary}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCampaignForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => { setShowCampaignForm(false); setEditingCampaign(null) }}>
          <div style={{ ...cardStyle({ width: 560, maxHeight: "80vh", overflow: "auto" }) }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: TEXT, fontSize: 18, margin: "0 0 20px" }}>{editingCampaign ? "Edit Campaign" : "New Campaign"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Advertiser Name *</label>
                <input value={campaignForm.advertiser_name} onChange={e => setCampaignForm(p => ({ ...p, advertiser_name: e.target.value }))} placeholder="e.g. Acme Corp" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Destination URL</label>
                <input value={campaignForm.destination_url} onChange={e => setCampaignForm(p => ({ ...p, destination_url: e.target.value }))} placeholder="https://..." style={inputStyle} />
              </div>
              <div>
                <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Ad Image URL</label>
                <input value={campaignForm.ad_image_url} onChange={e => setCampaignForm(p => ({ ...p, ad_image_url: e.target.value }))} placeholder="https://..." style={inputStyle} />
              </div>
              <div>
                <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Positions (comma-sep)</label>
                <input value={campaignForm.positions} onChange={e => setCampaignForm(p => ({ ...p, positions: e.target.value }))} placeholder="sidebar-right, header" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Start Date</label>
                  <input type="date" value={campaignForm.start_date} onChange={e => setCampaignForm(p => ({ ...p, start_date: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>End Date</label>
                  <input type="date" value={campaignForm.end_date} onChange={e => setCampaignForm(p => ({ ...p, end_date: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Daily Impression Cap</label>
                <input type="number" value={campaignForm.daily_impression_cap} onChange={e => setCampaignForm(p => ({ ...p, daily_impression_cap: parseInt(e.target.value) || 0 }))} style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={handleCreateCampaign} style={btnPrimary}>{editingCampaign ? "Update" : "Create"}</button>
                <button onClick={() => { setShowCampaignForm(false); setEditingCampaign(null) }} style={btnSecondary}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showScheduleForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => { setShowScheduleForm(false); setEditingSchedule(null) }}>
          <div style={{ ...cardStyle({ width: 520, maxHeight: "80vh", overflow: "auto" }) }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: TEXT, fontSize: 18, margin: "0 0 20px" }}>{editingSchedule ? "Edit Schedule" : "New Ad Schedule"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Schedule Name *</label>
                <input value={scheduleForm.name} onChange={e => setScheduleForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Weekend Boost" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Start Date *</label>
                  <input type="datetime-local" value={scheduleForm.start_date} onChange={e => setScheduleForm(p => ({ ...p, start_date: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>End Date</label>
                  <input type="datetime-local" value={scheduleForm.end_date} onChange={e => setScheduleForm(p => ({ ...p, end_date: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Frequency</label>
                  <select value={scheduleForm.frequency} onChange={e => setScheduleForm(p => ({ ...p, frequency: e.target.value }))} style={inputStyle}>
                    <option value="always">Always</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Priority</label>
                  <input type="number" value={scheduleForm.priority} onChange={e => setScheduleForm(p => ({ ...p, priority: parseInt(e.target.value) || 0 }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={handleCreateSchedule} style={btnPrimary}>{editingSchedule ? "Update" : "Create"}</button>
                <button onClick={() => { setShowScheduleForm(false); setEditingSchedule(null) }} style={btnSecondary}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
