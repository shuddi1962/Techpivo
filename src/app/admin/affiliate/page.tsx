"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  BarChart3, Link, Package, TrendingUp, DollarSign, FileText,
  Plus, Search, RefreshCw, Trash2, Edit3, ExternalLink
} from "lucide-react"

interface AffiliateLink {
  id: string
  code: string
  commission_rate: number | null
  clicks: number | null
  conversions: number | null
  revenue: number | null
  created_at: string | null
}

interface AffiliateProduct {
  id: string
  program_key: string | null
  product_name: string
  product_description: string | null
  product_image_url: string | null
  affiliate_link: string
  original_price: number | null
  sale_price: number | null
  clicks: number | null
  conversions: number | null
  is_active: boolean
  created_at: string | null
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
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "links", label: "Links", icon: Link },
  { id: "products", label: "Products", icon: Package },
  { id: "performance", label: "Performance", icon: TrendingUp },
  { id: "revenue", label: "Revenue", icon: DollarSign },
  { id: "reports", label: "Reports", icon: FileText },
]

const fmt = (n: number) => n.toLocaleString()
const fmtCurrency = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function AdminAffiliatePage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [links, setLinks] = useState<AffiliateLink[]>([])
  const [products, setProducts] = useState<AffiliateProduct[]>([])
  const [revenueData, setRevenueData] = useState<RevenueEntry[]>([])
  const [reports, setReports] = useState<ReportRow[]>([])

  const [linkSearch, setLinkSearch] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [productFilter, setProductFilter] = useState("all")
  const [reportPeriod, setReportPeriod] = useState("daily")

  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkForm, setLinkForm] = useState({ code: "", commission_rate: 0 })

  const [editingLink, setEditingLink] = useState<AffiliateLink | null>(null)

  const fetchData = useCallback(async (section: string) => {
    try {
      const res = await fetch(`/admin/affiliate/api?section=${section}`)
      return await res.json()
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [ov, lk, pr, rv, rp] = await Promise.all([
        fetchData("overview"),
        fetchData("links"),
        fetchData("products"),
        fetchData("revenue"),
        fetchData("reports"),
      ])
      if (ov) setOverview(ov.overview)
      if (lk) setLinks(lk.links || [])
      if (pr) setProducts(pr.products || [])
      if (rv) setRevenueData(rv.revenue || [])
      if (rp) setReports(rp.reports || [])
      setLoading(false)
    }
    load()
  }, [fetchData])

  const handleCreateLink = async () => {
    if (!linkForm.code) return
    const res = await fetch("/admin/affiliate/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "link", custom_slug: linkForm.code, commission_rate: linkForm.commission_rate }),
    })
    if (res.ok) {
      const data = await res.json()
      setLinks(prev => [data.link, ...prev])
      setShowLinkForm(false)
      setLinkForm({ code: "", commission_rate: 0 })
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

  const filteredLinks = links.filter(l => {
    if (!linkSearch) return true
    const q = linkSearch.toLowerCase()
    return l.code.toLowerCase().includes(q)
  })

  const filteredProducts = products.filter(p => {
    const matchSearch = !productSearch || p.product_name.toLowerCase().includes(productSearch.toLowerCase())
    const matchFilter = productFilter === "all" || (productFilter === "active" && p.is_active) || (productFilter === "inactive" && !p.is_active)
    return matchSearch && matchFilter
  })

  if (loading) {
    return (
      <div className="bg-[#0F1117] min-h-screen flex items-center justify-center">
        <div className="text-amber-500 text-lg">Loading Affiliate Center...</div>
      </div>
    )
  }

  return (
    <div className="bg-[#0F1117] min-h-screen p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-slate-100 text-2xl font-bold m-0">Affiliate Center</h1>
            <p className="text-slate-400 text-sm mt-1">Manage affiliate links, products, and revenue</p>
          </div>
          <Button onClick={() => setShowLinkForm(true)} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
            <Plus className="w-4 h-4 mr-1" /> New Link
          </Button>
        </div>

        <div className="flex gap-1 mb-6 border-b border-slate-700/50 overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon
            const isActive = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                  isActive
                    ? "text-amber-500 border-amber-500"
                    : "text-slate-400 border-transparent hover:text-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            )
          })}
        </div>

        {activeTab === "overview" && overview && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
              {[
                { label: "Total Links", value: fmt(overview.total_links), color: "text-amber-500" },
                { label: "Total Clicks", value: fmt(overview.total_clicks), color: "text-blue-500" },
                { label: "Conversions", value: fmt(overview.total_conversions), color: "text-emerald-500" },
                { label: "Revenue", value: fmtCurrency(overview.total_revenue), color: "text-emerald-500" },
                { label: "Conv. Rate", value: `${overview.conversion_rate.toFixed(1)}%`, color: "text-amber-500" },
                { label: "Active Rules", value: fmt(overview.active_rules), color: "text-violet-500" },
                { label: "Active Campaigns", value: fmt(overview.active_campaigns), color: "text-blue-500" },
              ].map((k, i) => (
                <Card key={i} className="bg-[#1C1F2E] border-slate-700/50 text-center">
                  <CardContent className="p-4">
                    <div className="text-slate-400 text-xs mb-2">{k.label}</div>
                    <div className={`${k.color} text-2xl font-bold`}>{k.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-[#1C1F2E] border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-100 text-base">Top Programs</CardTitle>
              </CardHeader>
              <CardContent>
                {overview.top_programs.length === 0 ? (
                  <p className="text-slate-400 text-sm">No program data yet</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {overview.top_programs.map((p, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-[#0F1117] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-sm">
                            {p.name.charAt(0)}
                          </div>
                          <span className="text-slate-200 text-sm font-medium">{p.name}</span>
                        </div>
                        <div className="flex gap-6 items-center">
                          <div className="text-right">
                            <div className="text-slate-200 text-sm font-semibold">{fmt(p.clicks)}</div>
                            <div className="text-slate-500 text-xs">clicks</div>
                          </div>
                          <div className="text-right">
                            <div className="text-emerald-500 text-sm font-semibold">{fmtCurrency(p.revenue)}</div>
                            <div className="text-slate-500 text-xs">revenue</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "links" && (
          <div>
            <div className="flex justify-between mb-4">
              <Input
                placeholder="Search links..."
                value={linkSearch}
                onChange={e => setLinkSearch(e.target.value)}
                className="max-w-md bg-[#0F1117] border-slate-700/50 text-slate-200"
              />
              <Button onClick={() => { setShowLinkForm(true); setEditingLink(null); setLinkForm({ code: "", commission_rate: 0 }) }} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                <Plus className="w-4 h-4 mr-1" /> New Link
              </Button>
            </div>

            <Card className="bg-[#1C1F2E] border-slate-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      {["Code", "Clicks", "Conversions", "Revenue", "Rate", "Created"].map(h => (
                        <th key={h} className="p-3 text-left text-slate-400 text-xs font-semibold uppercase tracking-wider">{h}</th>
                      ))}
                      <th className="p-3 text-right text-slate-400 text-xs font-semibold uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLinks.map(l => (
                      <tr key={l.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                        <td className="p-3 text-slate-200 text-sm font-mono">{l.code}</td>
                        <td className="p-3 text-slate-200 text-sm">{fmt(l.clicks || 0)}</td>
                        <td className="p-3 text-emerald-500 text-sm">{fmt(l.conversions || 0)}</td>
                        <td className="p-3 text-emerald-500 text-sm font-semibold">{fmtCurrency(l.revenue || 0)}</td>
                        <td className="p-3">
                          {l.commission_rate != null && (
                            <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10">
                              {(l.commission_rate * 100).toFixed(1)}%
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-slate-400 text-xs">{l.created_at ? new Date(l.created_at).toLocaleDateString() : "—"}</td>
                        <td className="p-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteLink(l.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredLinks.length === 0 && (
                      <tr><td colSpan={7} className="p-10 text-center text-slate-400">No affiliate links found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "products" && (
          <div>
            <div className="flex gap-3 mb-4">
              <Input placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="max-w-md bg-[#0F1117] border-slate-700/50 text-slate-200" />
              <select value={productFilter} onChange={e => setProductFilter(e.target.value)} className="bg-[#0F1117] border border-slate-700/50 rounded-lg px-3 py-2 text-slate-200 text-sm cursor-pointer outline-none max-w-[140px]">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(p => (
                <Card key={p.id} className="bg-[#1C1F2E] border-slate-700/50">
                  <CardContent className="p-4">
                    <div className="flex justify-between mb-3">
                      <Badge variant="outline" className={p.is_active ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/10" : "border-red-500/30 text-red-500 bg-red-500/10"}>
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {p.program_key && <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10">{p.program_key}</Badge>}
                    </div>
                    <h4 className="text-slate-200 text-sm font-medium mb-2 leading-tight">{p.product_name}</h4>
                    {p.product_description && (
                      <p className="text-slate-400 text-xs mb-3 leading-relaxed">
                        {p.product_description.slice(0, 100)}{p.product_description.length > 100 ? "..." : ""}
                      </p>
                    )}
                    <div className="flex gap-4 mb-3">
                      {p.original_price && <span className="text-slate-500 text-xs line-through">{fmtCurrency(p.original_price)}</span>}
                      {p.sale_price && <span className="text-emerald-500 text-sm font-bold">{fmtCurrency(p.sale_price)}</span>}
                      {p.affiliate_link && (
                        <a href={p.affiliate_link} target="_blank" rel="noopener noreferrer" className="ml-auto text-amber-500 hover:text-amber-400">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <div className="flex gap-6 border-t border-slate-700/50 pt-3">
                      <div className="text-center">
                        <div className="text-slate-200 text-base font-bold">{fmt(p.clicks || 0)}</div>
                        <div className="text-slate-500 text-xs">Clicks</div>
                      </div>
                      <div className="text-center">
                        <div className="text-emerald-500 text-base font-bold">{fmt(p.conversions || 0)}</div>
                        <div className="text-slate-500 text-xs">Conv.</div>
                      </div>
                      <div className="text-center">
                        <div className="text-amber-500 text-base font-bold">
                          {(p.clicks || 0) > 0 ? ((p.conversions || 0) / (p.clicks || 0) * 100).toFixed(1) : "0"}%
                        </div>
                        <div className="text-slate-500 text-xs">Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full">
                  <Card className="bg-[#1C1F2E] border-slate-700/50">
                    <CardContent className="p-16 text-center text-slate-400">No products found</CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "performance" && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              {[
                { label: "Total Clicks", value: fmt(overview?.total_clicks || 0), color: "text-blue-500" },
                { label: "Total Conversions", value: fmt(overview?.total_conversions || 0), color: "text-emerald-500" },
                { label: "Conversion Rate", value: `${overview?.conversion_rate?.toFixed(1) || "0"}%`, color: "text-amber-500" },
                { label: "Revenue", value: fmtCurrency(overview?.total_revenue || 0), color: "text-emerald-500" },
                { label: "EPC", value: fmtCurrency((overview?.total_clicks || 0) > 0 ? (overview?.total_revenue || 0) / (overview?.total_clicks || 0) : 0), color: "text-amber-500" },
              ].map((k, i) => (
                <Card key={i} className="bg-[#1C1F2E] border-slate-700/50 text-center">
                  <CardContent className="p-4">
                    <div className="text-slate-400 text-xs mb-2">{k.label}</div>
                    <div className={`${k.color} text-xl font-bold`}>{k.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-[#1C1F2E] border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-slate-100 text-base">Click Trend (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-48">
                  {(() => {
                    const maxClick = Math.max(...reports.slice(0, 30).map(r => r.clicks), 1)
                    return reports.slice(0, 30).reverse().map((r, i) => {
                      const h = (r.clicks / maxClick) * 100
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-amber-500/20 rounded-sm"
                            style={{ height: `${Math.max(h, 2)}%`, minHeight: 4 }}
                            title={`${r.date}: ${r.clicks} clicks`}
                          />
                        </div>
                      )
                    })
                  })()}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-slate-500 text-xs">30 days ago</span>
                  <span className="text-slate-500 text-xs">Today</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "revenue" && (
          <Card className="bg-[#1C1F2E] border-slate-700/50 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-slate-100 text-base">Revenue by Source</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    {["Date", "Source", "Impressions", "Clicks", "Revenue", "CPM", "CPC"].map(h => (
                      <th key={h} className="p-3 text-left text-slate-400 text-xs font-semibold uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {revenueData.map(r => (
                    <tr key={r.id} className="border-b border-slate-700/50">
                      <td className="p-3 text-slate-200 text-sm">{r.date}</td>
                      <td className="p-3"><Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10">{r.source}</Badge></td>
                      <td className="p-3 text-slate-200 text-sm">{fmt(r.impressions)}</td>
                      <td className="p-3 text-slate-200 text-sm">{fmt(r.clicks)}</td>
                      <td className="p-3 text-emerald-500 text-sm font-semibold">{fmtCurrency(r.revenue)}</td>
                      <td className="p-3 text-slate-200 text-sm">{fmtCurrency(r.cpm)}</td>
                      <td className="p-3 text-slate-200 text-sm">{fmtCurrency(r.cpc)}</td>
                    </tr>
                  ))}
                  {revenueData.length === 0 && (
                    <tr><td colSpan={7} className="p-10 text-center text-slate-400">No revenue data yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === "reports" && (
          <div>
            <div className="flex gap-3 mb-4">
              {["daily", "weekly", "monthly"].map(p => (
                <button
                  key={p}
                  onClick={() => setReportPeriod(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                    reportPeriod === p
                      ? "bg-amber-500/20 text-amber-500 border border-amber-500"
                      : "bg-transparent text-slate-400 border border-slate-700/50 hover:text-slate-300"
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            <Card className="bg-[#1C1F2E] border-slate-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      {["Date", "Clicks", "Conversions", "Revenue"].map(h => (
                        <th key={h} className="p-3 text-left text-slate-400 text-xs font-semibold uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r, i) => (
                      <tr key={i} className="border-b border-slate-700/50">
                        <td className="p-3 text-slate-200 text-sm">{r.date}</td>
                        <td className="p-3 text-slate-200 text-sm">{fmt(r.clicks)}</td>
                        <td className="p-3 text-emerald-500 text-sm">{fmt(r.conversions)}</td>
                        <td className="p-3 text-emerald-500 text-sm font-semibold">{fmtCurrency(r.revenue)}</td>
                      </tr>
                    ))}
                    {reports.length === 0 && (
                      <tr><td colSpan={4} className="p-10 text-center text-slate-400">No report data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>

      {showLinkForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => { setShowLinkForm(false); setEditingLink(null) }}>
          <div className="bg-[#1C1F2E] border border-slate-700/50 rounded-xl w-[520px] max-h-[80vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-slate-200 text-lg font-semibold mb-5">{editingLink ? "Edit Link" : "New Affiliate Link"}</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-slate-400 text-xs block mb-1.5">Tracking Code *</label>
                <Input value={linkForm.code} onChange={e => setLinkForm(p => ({ ...p, code: e.target.value }))} placeholder="my-product-code" className="bg-[#0F1117] border-slate-700/50 text-slate-200" />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1.5">Commission Rate</label>
                <Input type="number" step="0.01" value={linkForm.commission_rate} onChange={e => setLinkForm(p => ({ ...p, commission_rate: parseFloat(e.target.value) || 0 }))} placeholder="0.10" className="bg-[#0F1117] border-slate-700/50 text-slate-200" />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleCreateLink} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">Create</Button>
                <Button variant="outline" onClick={() => { setShowLinkForm(false); setEditingLink(null) }} className="border-slate-700/50 text-slate-400">Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
