"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

const BG = "#0F1117"
const CARD = "#1C1F2E"
const BORDER = "#2A2D3E"
const ACCENT = "#F59E0B"
const ACCENT_DIM = "rgba(245,158,11,0.15)"
const TEXT = "#E5E7EB"
const TEXT_DIM = "#9CA3AF"
const SUCCESS = "#10B981"
const DANGER = "#EF4444"
const WARN = "#F59E0B"

interface AffiliateLink {
  id: string
  product_id: string | null
  program_id: string | null
  custom_slug: string | null
  destination_url: string
  tracking_params: Record<string, unknown>
  total_clicks: number
  total_conversions: number
  total_revenue: number
  is_active: boolean
  created_at: string
  product_name?: string
  program_name?: string
}

interface AffiliateRule {
  id: string
  name: string
  description: string
  match_type: string
  match_value: string
  program_id: string | null
  placement: string
  priority: number
  is_active: boolean
  revenue_per_click: number
  created_at: string
}

interface AffiliateCampaign {
  id: string
  name: string
  description: string
  program_ids: string[]
  start_date: string | null
  end_date: string | null
  budget: number
  spent: number
  total_clicks: number
  total_conversions: number
  total_revenue: number
  status: string
  created_at: string
}

interface AffiliateProduct {
  id: string
  product_name: string
  product_description: string | null
  product_image_url: string | null
  affiliate_link: string
  original_price: number | null
  sale_price: number | null
  clicks: number
  conversions: number
  is_active: boolean
  program_key: string | null
}

interface OverviewData {
  total_links: number
  total_clicks: number
  total_conversions: number
  total_revenue: number
  conversion_rate: number
  active_rules: number
  active_campaigns: number
  top_programs: { name: string; clicks: number; revenue: number }[]
}

interface RevenueEntry {
  id: string
  source: string
  impressions: number
  clicks: number
  revenue: number
  cpm: number
  cpc: number
  date: string
}

interface ReportRow {
  date: string
  clicks: number
  conversions: number
  revenue: number
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "links", label: "Links" },
  { id: "products", label: "Products" },
  { id: "performance", label: "Performance" },
  { id: "revenue", label: "Revenue" },
  { id: "rules", label: "Rules" },
  { id: "campaigns", label: "Campaigns" },
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
  color: "#000",
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

export default function AdminAffiliatePage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [links, setLinks] = useState<AffiliateLink[]>([])
  const [products, setProducts] = useState<AffiliateProduct[]>([])
  const [rules, setRules] = useState<AffiliateRule[]>([])
  const [campaigns, setCampaigns] = useState<AffiliateCampaign[]>([])
  const [revenueData, setRevenueData] = useState<RevenueEntry[]>([])
  const [reports, setReports] = useState<ReportRow[]>([])

  const [linkSearch, setLinkSearch] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [productFilter, setProductFilter] = useState("all")
  const [reportPeriod, setReportPeriod] = useState("daily")

  const [showLinkForm, setShowLinkForm] = useState(false)
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [showCampaignForm, setShowCampaignForm] = useState(false)

  const [linkForm, setLinkForm] = useState({ destination_url: "", custom_slug: "", product_id: "", program_id: "" })
  const [ruleForm, setRuleForm] = useState({ name: "", description: "", match_type: "keyword", match_value: "", program_id: "", placement: "inline", priority: 0, revenue_per_click: 0 })
  const [campaignForm, setCampaignForm] = useState({ name: "", description: "", start_date: "", end_date: "", budget: 0, status: "active" })

  const [editingLink, setEditingLink] = useState<AffiliateLink | null>(null)
  const [editingRule, setEditingRule] = useState<AffiliateRule | null>(null)
  const [editingCampaign, setEditingCampaign] = useState<AffiliateCampaign | null>(null)

  const supabase = createClient()

  const fetchData = useCallback(async (section: string) => {
    try {
      const res = await fetch(`/admin/affiliate/api?section=${section}`)
      const data = await res.json()
      return data
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [ov, lk, pr, rl, cm, rv, rp] = await Promise.all([
        fetchData("overview"),
        fetchData("links"),
        fetchData("products"),
        fetchData("rules"),
        fetchData("campaigns"),
        fetchData("revenue"),
        fetchData("reports"),
      ])
      if (ov) setOverview(ov.overview)
      if (lk) setLinks(lk.links || [])
      if (pr) setProducts(pr.products || [])
      if (rl) setRules(rl.rules || [])
      if (cm) setCampaigns(cm.campaigns || [])
      if (rv) setRevenueData(rv.revenue || [])
      if (rp) setReports(rp.reports || [])
      setLoading(false)
    }
    load()
  }, [fetchData])

  const handleCreateLink = async () => {
    if (!linkForm.destination_url) return
    const res = await fetch("/admin/affiliate/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "link", ...linkForm }),
    })
    if (res.ok) {
      const data = await res.json()
      setLinks(prev => [data.link, ...prev])
      setShowLinkForm(false)
      setLinkForm({ destination_url: "", custom_slug: "", product_id: "", program_id: "" })
    }
  }

  const handleUpdateLink = async () => {
    if (!editingLink) return
    const res = await fetch("/admin/affiliate/api", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "link", id: editingLink.id, ...linkForm }),
    })
    if (res.ok) {
      const data = await res.json()
      setLinks(prev => prev.map(l => l.id === editingLink.id ? { ...l, ...data.link } : l))
      setEditingLink(null)
      setShowLinkForm(false)
    }
  }

  const handleDeleteLink = async (id: string) => {
    if (!confirm("Delete this affiliate link?")) return
    const res = await fetch("/admin/affiliate/api", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "link", id }),
    })
    if (res.ok) setLinks(prev => prev.filter(l => l.id !== id))
  }

  const handleCreateRule = async () => {
    if (!ruleForm.name || !ruleForm.match_value) return
    const res = await fetch("/admin/affiliate/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "rule", ...ruleForm }),
    })
    if (res.ok) {
      const data = await res.json()
      setRules(prev => [data.rule, ...prev])
      setShowRuleForm(false)
      setRuleForm({ name: "", description: "", match_type: "keyword", match_value: "", program_id: "", placement: "inline", priority: 0, revenue_per_click: 0 })
    }
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Delete this rule?")) return
    const res = await fetch("/admin/affiliate/api", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "rule", id }),
    })
    if (res.ok) setRules(prev => prev.filter(r => r.id !== id))
  }

  const handleCreateCampaign = async () => {
    if (!campaignForm.name) return
    const res = await fetch("/admin/affiliate/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "campaign", ...campaignForm }),
    })
    if (res.ok) {
      const data = await res.json()
      setCampaigns(prev => [data.campaign, ...prev])
      setShowCampaignForm(false)
      setCampaignForm({ name: "", description: "", start_date: "", end_date: "", budget: 0, status: "active" })
    }
  }

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm("Delete this campaign?")) return
    const res = await fetch("/admin/affiliate/api", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "campaign", id }),
    })
    if (res.ok) setCampaigns(prev => prev.filter(c => c.id !== id))
  }

  const filteredLinks = links.filter(l => {
    if (!linkSearch) return true
    const q = linkSearch.toLowerCase()
    return l.destination_url.toLowerCase().includes(q) || l.custom_slug?.toLowerCase().includes(q) || l.product_name?.toLowerCase().includes(q) || l.program_name?.toLowerCase().includes(q)
  })

  const filteredProducts = products.filter(p => {
    const matchSearch = !productSearch || p.product_name.toLowerCase().includes(productSearch.toLowerCase())
    const matchFilter = productFilter === "all" || (productFilter === "active" && p.is_active) || (productFilter === "inactive" && !p.is_active)
    return matchSearch && matchFilter
  })

  if (loading) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: ACCENT, fontSize: 18 }}>Loading Affiliate Center...</div>
      </div>
    )
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ color: TEXT, fontSize: 28, fontWeight: 700, margin: 0 }}>Affiliate Center</h1>
            <p style={{ color: TEXT_DIM, fontSize: 14, margin: "4px 0 0" }}>Manage affiliate links, products, campaigns and revenue</p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setShowLinkForm(true)} style={btnPrimary}>+ New Link</button>
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
                { label: "Total Links", value: fmt(overview.total_links), color: ACCENT },
                { label: "Total Clicks", value: fmt(overview.total_clicks), color: "#3B82F6" },
                { label: "Conversions", value: fmt(overview.total_conversions), color: SUCCESS },
                { label: "Revenue", value: fmtCurrency(overview.total_revenue), color: SUCCESS },
                { label: "Conversion Rate", value: `${overview.conversion_rate.toFixed(1)}%`, color: ACCENT },
                { label: "Active Rules", value: fmt(overview.active_rules), color: "#8B5CF6" },
                { label: "Active Campaigns", value: fmt(overview.active_campaigns), color: "#3B82F6" },
              ].map((k, i) => (
                <div key={i} style={cardStyle({ textAlign: "center" })}>
                  <div style={{ color: TEXT_DIM, fontSize: 12, marginBottom: 8 }}>{k.label}</div>
                  <div style={{ color: k.color, fontSize: 28, fontWeight: 700 }}>{k.value}</div>
                </div>
              ))}
            </div>
            <div style={cardStyle()}>
              <h3 style={{ color: TEXT, fontSize: 16, margin: "0 0 16px" }}>Top Programs</h3>
              {overview.top_programs.length === 0 ? (
                <p style={{ color: TEXT_DIM, fontSize: 14 }}>No program data yet</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {overview.top_programs.map((p, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: BG, borderRadius: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: ACCENT_DIM, display: "flex", alignItems: "center", justifyContent: "center", color: ACCENT, fontWeight: 700, fontSize: 14 }}>{p.name.charAt(0)}</div>
                        <span style={{ color: TEXT, fontSize: 14, fontWeight: 500 }}>{p.name}</span>
                      </div>
                      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>{fmt(p.clicks)}</div>
                          <div style={{ color: TEXT_DIM, fontSize: 11 }}>clicks</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: SUCCESS, fontSize: 14, fontWeight: 600 }}>{fmtCurrency(p.revenue)}</div>
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

        {activeTab === "links" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <input
                placeholder="Search links..."
                value={linkSearch}
                onChange={e => setLinkSearch(e.target.value)}
                style={{ ...inputStyle, maxWidth: 400 }}
              />
              <button onClick={() => { setShowLinkForm(true); setEditingLink(null); setLinkForm({ destination_url: "", custom_slug: "", product_id: "", program_id: "" }) }} style={btnPrimary}>+ New Link</button>
            </div>
            <div style={cardStyle({ padding: 0, overflow: "hidden" })}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Destination", "Slug", "Program", "Clicks", "Conversions", "Revenue", "Status", "Actions"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: TEXT_DIM, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLinks.map(l => (
                    <tr key={l.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "12px 16px", color: TEXT, fontSize: 13, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.destination_url}</td>
                      <td style={{ padding: "12px 16px" }}>
                        {l.custom_slug ? <span style={{ ...badge(ACCENT) }}>{l.custom_slug}</span> : <span style={{ color: TEXT_DIM, fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 16px", color: TEXT, fontSize: 13 }}>{l.program_name || "—"}</td>
                      <td style={{ padding: "12px 16px", color: TEXT, fontSize: 13 }}>{fmt(l.total_clicks)}</td>
                      <td style={{ padding: "12px 16px", color: SUCCESS, fontSize: 13 }}>{fmt(l.total_conversions)}</td>
                      <td style={{ padding: "12px 16px", color: SUCCESS, fontSize: 13, fontWeight: 600 }}>{fmtCurrency(l.total_revenue)}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={badge(l.is_active ? SUCCESS : DANGER)}>{l.is_active ? "Active" : "Inactive"}</span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => { setEditingLink(l); setLinkForm({ destination_url: l.destination_url, custom_slug: l.custom_slug || "", product_id: l.product_id || "", program_id: l.program_id || "" }); setShowLinkForm(true) }} style={{ ...btnSecondary, padding: "4px 10px", fontSize: 12 }}>Edit</button>
                          <button onClick={() => handleDeleteLink(l.id)} style={{ ...btnSecondary, padding: "4px 10px", fontSize: 12, color: DANGER, borderColor: `${DANGER}44` }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredLinks.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: TEXT_DIM }}>No affiliate links found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "products" && (
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <input placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)} style={{ ...inputStyle, maxWidth: 400 }} />
              <select value={productFilter} onChange={e => setProductFilter(e.target.value)} style={{ ...inputStyle, maxWidth: 160, cursor: "pointer" }}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {filteredProducts.map(p => (
                <div key={p.id} style={cardStyle()}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={badge(p.is_active ? SUCCESS : DANGER)}>{p.is_active ? "Active" : "Inactive"}</span>
                    {p.program_key && <span style={{ ...badge(ACCENT) }}>{p.program_key}</span>}
                  </div>
                  <h4 style={{ color: TEXT, fontSize: 15, margin: "0 0 8px", lineHeight: 1.4 }}>{p.product_name}</h4>
                  {p.product_description && <p style={{ color: TEXT_DIM, fontSize: 13, margin: "0 0 12px", lineHeight: 1.5 }}>{p.product_description.slice(0, 100)}{p.product_description.length > 100 ? "..." : ""}</p>}
                  <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                    {p.original_price && <span style={{ color: TEXT_DIM, fontSize: 13, textDecoration: "line-through" }}>{fmtCurrency(p.original_price)}</span>}
                    {p.sale_price && <span style={{ color: SUCCESS, fontSize: 15, fontWeight: 700 }}>{fmtCurrency(p.sale_price)}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 20, borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ color: TEXT, fontSize: 16, fontWeight: 700 }}>{fmt(p.clicks)}</div>
                      <div style={{ color: TEXT_DIM, fontSize: 11 }}>Clicks</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ color: SUCCESS, fontSize: 16, fontWeight: 700 }}>{fmt(p.conversions)}</div>
                      <div style={{ color: TEXT_DIM, fontSize: 11 }}>Conversions</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ color: ACCENT, fontSize: 16, fontWeight: 700 }}>{p.clicks > 0 ? ((p.conversions / p.clicks) * 100).toFixed(1) : "0"}%</div>
                      <div style={{ color: TEXT_DIM, fontSize: 11 }}>Conv. Rate</div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div style={{ ...cardStyle({ gridColumn: "1 / -1" }), textAlign: "center", padding: 60, color: TEXT_DIM }}>No products found</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "performance" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Total Clicks", value: fmt(overview?.total_clicks || 0), color: "#3B82F6" },
                { label: "Total Conversions", value: fmt(overview?.total_conversions || 0), color: SUCCESS },
                { label: "Conversion Rate", value: `${overview?.conversion_rate?.toFixed(1) || "0"}%`, color: ACCENT },
                { label: "Revenue", value: fmtCurrency(overview?.total_revenue || 0), color: SUCCESS },
                { label: "Earnings Per Click", value: fmtCurrency((overview?.total_clicks || 0) > 0 ? (overview?.total_revenue || 0) / (overview?.total_clicks || 0) : 0), color: ACCENT },
              ].map((k, i) => (
                <div key={i} style={cardStyle({ textAlign: "center" })}>
                  <div style={{ color: TEXT_DIM, fontSize: 12, marginBottom: 8 }}>{k.label}</div>
                  <div style={{ color: k.color, fontSize: 24, fontWeight: 700 }}>{k.value}</div>
                </div>
              ))}
            </div>
            <div style={cardStyle()}>
              <h3 style={{ color: TEXT, fontSize: 16, margin: "0 0 16px" }}>Click Trend (Last 30 Days)</h3>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 200 }}>
                {(() => {
                  const maxClick = Math.max(...reports.slice(0, 30).map(r => r.clicks), 1)
                  return reports.slice(0, 30).reverse().map((r, i) => {
                    const h = (r.clicks / maxClick) * 100
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ width: "100%", background: `${ACCENT}33`, borderRadius: 4, height: `${Math.max(h, 2)}%`, minHeight: 4, position: 'relative' }} title={`${r.date}: ${r.clicks} clicks`} />
                      </div>
                    )
                  })
                })()}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ color: TEXT_DIM, fontSize: 11 }}>30 days ago</span>
                <span style={{ color: TEXT_DIM, fontSize: 11 }}>Today</span>
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

        {activeTab === "rules" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={() => { setShowRuleForm(true); setEditingRule(null); setRuleForm({ name: "", description: "", match_type: "keyword", match_value: "", program_id: "", placement: "inline", priority: 0, revenue_per_click: 0 }) }} style={btnPrimary}>+ New Rule</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {rules.map(r => (
                <div key={r.id} style={cardStyle({ display: "flex", justifyContent: "space-between", alignItems: "center" })}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                      <span style={{ color: TEXT, fontSize: 15, fontWeight: 600 }}>{r.name}</span>
                      <span style={badge(ACCENT)}>{r.match_type}</span>
                      <span style={badge("#8B5CF6")}>{r.placement}</span>
                      {!r.is_active && <span style={badge(DANGER)}>Disabled</span>}
                    </div>
                    <div style={{ color: TEXT_DIM, fontSize: 13 }}>
                      Match: <span style={{ color: TEXT }}>{r.match_value}</span> · Priority: <span style={{ color: TEXT }}>{r.priority}</span> · RPC: <span style={{ color: SUCCESS }}>{fmtCurrency(r.revenue_per_click)}</span>
                    </div>
                    {r.description && <div style={{ color: TEXT_DIM, fontSize: 12, marginTop: 4 }}>{r.description}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setEditingRule(r); setRuleForm({ name: r.name, description: r.description, match_type: r.match_type, match_value: r.match_value, program_id: r.program_id || "", placement: r.placement, priority: r.priority, revenue_per_click: r.revenue_per_click }); setShowRuleForm(true) }} style={{ ...btnSecondary, padding: "4px 10px", fontSize: 12 }}>Edit</button>
                    <button onClick={() => handleDeleteRule(r.id)} style={{ ...btnSecondary, padding: "4px 10px", fontSize: 12, color: DANGER, borderColor: `${DANGER}44` }}>Delete</button>
                  </div>
                </div>
              ))}
              {rules.length === 0 && <div style={cardStyle({ textAlign: "center", padding: 60, color: TEXT_DIM })}>No auto-insertion rules configured</div>}
            </div>
          </div>
        )}

        {activeTab === "campaigns" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={() => { setShowCampaignForm(true); setEditingCampaign(null); setCampaignForm({ name: "", description: "", start_date: "", end_date: "", budget: 0, status: "active" }) }} style={btnPrimary}>+ New Campaign</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
              {campaigns.map(c => (
                <div key={c.id} style={cardStyle()}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                    <h4 style={{ color: TEXT, fontSize: 16, margin: 0 }}>{c.name}</h4>
                    <span style={badge(c.status === "active" ? SUCCESS : c.status === "paused" ? WARN : TEXT_DIM)}>{c.status}</span>
                  </div>
                  {c.description && <p style={{ color: TEXT_DIM, fontSize: 13, margin: "0 0 12px" }}>{c.description}</p>}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ color: TEXT_DIM, fontSize: 11 }}>Budget</div>
                      <div style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>{fmtCurrency(c.budget)}</div>
                    </div>
                    <div>
                      <div style={{ color: TEXT_DIM, fontSize: 11 }}>Spent</div>
                      <div style={{ color: c.spent > c.budget ? DANGER : TEXT, fontSize: 14, fontWeight: 600 }}>{fmtCurrency(c.spent)}</div>
                    </div>
                    <div>
                      <div style={{ color: TEXT_DIM, fontSize: 11 }}>Clicks</div>
                      <div style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>{fmt(c.total_clicks)}</div>
                    </div>
                    <div>
                      <div style={{ color: TEXT_DIM, fontSize: 11 }}>Revenue</div>
                      <div style={{ color: SUCCESS, fontSize: 14, fontWeight: 600 }}>{fmtCurrency(c.total_revenue)}</div>
                    </div>
                  </div>
                  {c.start_date && (
                    <div style={{ color: TEXT_DIM, fontSize: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
                      {c.start_date}{c.end_date ? ` → ${c.end_date}` : " → ongoing"}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={() => { setEditingCampaign(c); setCampaignForm({ name: c.name, description: c.description, start_date: c.start_date || "", end_date: c.end_date || "", budget: c.budget, status: c.status }); setShowCampaignForm(true) }} style={{ ...btnSecondary, flex: 1, textAlign: "center" }}>Edit</button>
                    <button onClick={() => handleDeleteCampaign(c.id)} style={{ ...btnSecondary, color: DANGER, borderColor: `${DANGER}44` }}>Delete</button>
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && <div style={{ ...cardStyle({ gridColumn: "1 / -1" }), textAlign: "center", padding: 60, color: TEXT_DIM }}>No campaigns yet</div>}
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
                    {["Date", "Clicks", "Conversions", "Revenue"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: TEXT_DIM, fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "12px 16px", color: TEXT, fontSize: 13 }}>{r.date}</td>
                      <td style={{ padding: "12px 16px", color: TEXT, fontSize: 13 }}>{fmt(r.clicks)}</td>
                      <td style={{ padding: "12px 16px", color: SUCCESS, fontSize: 13 }}>{fmt(r.conversions)}</td>
                      <td style={{ padding: "12px 16px", color: SUCCESS, fontSize: 13, fontWeight: 600 }}>{fmtCurrency(r.revenue)}</td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: TEXT_DIM }}>No report data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showLinkForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => { setShowLinkForm(false); setEditingLink(null) }}>
          <div style={{ ...cardStyle({ width: 520, maxHeight: "80vh", overflow: "auto" }) }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: TEXT, fontSize: 18, margin: "0 0 20px" }}>{editingLink ? "Edit Link" : "New Affiliate Link"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Destination URL *</label>
                <input value={linkForm.destination_url} onChange={e => setLinkForm(p => ({ ...p, destination_url: e.target.value }))} placeholder="https://..." style={inputStyle} />
              </div>
              <div>
                <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Custom Slug</label>
                <input value={linkForm.custom_slug} onChange={e => setLinkForm(p => ({ ...p, custom_slug: e.target.value }))} placeholder="my-product" style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={editingLink ? handleUpdateLink : handleCreateLink} style={btnPrimary}>{editingLink ? "Update" : "Create"}</button>
                <button onClick={() => { setShowLinkForm(false); setEditingLink(null) }} style={btnSecondary}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRuleForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => { setShowRuleForm(false); setEditingRule(null) }}>
          <div style={{ ...cardStyle({ width: 520, maxHeight: "80vh", overflow: "auto" }) }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: TEXT, fontSize: 18, margin: "0 0 20px" }}>{editingRule ? "Edit Rule" : "New Auto-Insertion Rule"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Rule Name *</label>
                <input value={ruleForm.name} onChange={e => setRuleForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. AI Product Links" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Match Type</label>
                <select value={ruleForm.match_type} onChange={e => setRuleForm(p => ({ ...p, match_type: e.target.value }))} style={inputStyle}>
                  <option value="keyword">Keyword</option>
                  <option value="category">Category</option>
                  <option value="tag">Tag</option>
                  <option value="regex">Regex</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div>
                <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Match Value *</label>
                <input value={ruleForm.match_value} onChange={e => setRuleForm(p => ({ ...p, match_value: e.target.value }))} placeholder="e.g. chatgpt, openai" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Placement</label>
                  <select value={ruleForm.placement} onChange={e => setRuleForm(p => ({ ...p, placement: e.target.value }))} style={inputStyle}>
                    <option value="inline">Inline</option>
                    <option value="sidebar">Sidebar</option>
                    <option value="banner">Banner</option>
                    <option value="popup">Popup</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Priority</label>
                  <input type="number" value={ruleForm.priority} onChange={e => setRuleForm(p => ({ ...p, priority: parseInt(e.target.value) || 0 }))} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Description</label>
                <input value={ruleForm.description} onChange={e => setRuleForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={handleCreateRule} style={btnPrimary}>{editingRule ? "Update" : "Create"}</button>
                <button onClick={() => { setShowRuleForm(false); setEditingRule(null) }} style={btnSecondary}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCampaignForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => { setShowCampaignForm(false); setEditingCampaign(null) }}>
          <div style={{ ...cardStyle({ width: 520, maxHeight: "80vh", overflow: "auto" }) }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: TEXT, fontSize: 18, margin: "0 0 20px" }}>{editingCampaign ? "Edit Campaign" : "New Campaign"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Campaign Name *</label>
                <input value={campaignForm.name} onChange={e => setCampaignForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Holiday Promo" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Description</label>
                <input value={campaignForm.description} onChange={e => setCampaignForm(p => ({ ...p, description: e.target.value }))} placeholder="Campaign description" style={inputStyle} />
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Budget ($)</label>
                  <input type="number" step="0.01" value={campaignForm.budget} onChange={e => setCampaignForm(p => ({ ...p, budget: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: TEXT_DIM, fontSize: 12, display: "block", marginBottom: 6 }}>Status</label>
                  <select value={campaignForm.status} onChange={e => setCampaignForm(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={handleCreateCampaign} style={btnPrimary}>{editingCampaign ? "Update" : "Create"}</button>
                <button onClick={() => { setShowCampaignForm(false); setEditingCampaign(null) }} style={btnSecondary}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
