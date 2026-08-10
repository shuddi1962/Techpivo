"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Store, LayoutGrid, Megaphone, ListChecks, TrendingUp, Settings2,
  Plus, Trash2, CheckCircle, XCircle, PauseCircle, PlayCircle, RefreshCw,
  Upload, Eye, MousePointerClick, Users, Wallet, Clock, ShieldCheck,
  ArrowRight, Calendar, Image as ImageIcon, AlertCircle, Crown, Search,
} from "lucide-react"

const S = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  cardHover: "#F8FAFC",
  border: "#E2E8F0",
  primary: "#2563EB",
  primaryHover: "#1D4ED8",
  green: "#16A34A",
  red: "#DC2626",
  yellow: "#CA8A04",
  purple: "#7C3AED",
  amber: "#B45309",
  slate: "#64748B",
  text: "#0F172A",
  textMuted: "#475569",
  textDim: "#94A3B8",
  input: "#F8FAFC",
  overlay: "rgba(15,23,42,0.4)",
}

const TABS = [
  { id: "marketplace", label: "Marketplace", icon: Store },
  { id: "spaces", label: "Ad Spaces", icon: LayoutGrid },
  { id: "advertise", label: "Advertise", icon: Megaphone },
  { id: "campaigns", label: "Campaigns", icon: ListChecks },
  { id: "revenue", label: "Revenue", icon: TrendingUp },
  { id: "manage", label: "Manage", icon: Settings2 },
]

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: S.slate, bg: "#F1F5F9" },
  pending: { label: "Pending Review", color: S.amber, bg: "#FEF3C7" },
  approved: { label: "Approved", color: S.primary, bg: "#DBEAFE" },
  live: { label: "Live", color: S.green, bg: "#DCFCE7" },
  rejected: { label: "Rejected", color: S.red, bg: "#FEE2E2" },
  paused: { label: "Paused", color: S.yellow, bg: "#FEF9C3" },
  completed: { label: "Completed", color: S.slate, bg: "#F1F5F9" },
  cancelled: { label: "Cancelled", color: S.slate, bg: "#F1F5F9" },
}

const NGN = (n: number | string | null | undefined) =>
  "₦" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })

const fmt = (n: number | null | undefined) => Number(n || 0).toLocaleString()

const cardStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: S.card,
  border: `1px solid ${S.border}`,
  borderRadius: 14,
  padding: 20,
  ...extra,
})

const inputStyle: React.CSSProperties = {
  background: S.input,
  border: `1px solid ${S.border}`,
  borderRadius: 10,
  padding: "10px 14px",
  color: S.text,
  fontSize: 14,
  width: "100%",
  outline: "none",
}

const btnPrimary: React.CSSProperties = {
  background: S.primary,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 20px",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
}

const btnSecondary: React.CSSProperties = {
  background: "#fff",
  color: S.textMuted,
  border: `1px solid ${S.border}`,
  borderRadius: 10,
  padding: "9px 16px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
}

interface Placement {
  id: string
  name: string
  location: string
  position: string
  description: string | null
  ad_type: string
  width: number | null
  height: number | null
  sizes: string[]
  is_active: boolean
  price_per_day: number
  cpm: number
  min_days: number
  min_budget: number
  est_impressions: number
  advertisers: number
  impressions: number
  clicks: number
  created_at: string
}

interface Campaign {
  id: string
  user_id: string | null
  advertiser_name: string
  advertiser_email: string | null
  headline: string | null
  description: string | null
  cta_text: string | null
  ad_image_url: string | null
  destination_url: string | null
  ad_code: string | null
  positions: string[]
  placement_id: string | null
  billing_model: string
  units: number
  unit_price: number
  total_price: number
  budget: number
  spend: number
  status: string
  review_note: string | null
  is_active: boolean
  start_date: string | null
  end_date: string | null
  impressions: number
  clicks: number
  submitted_at: string | null
  approved_at: string | null
  created_at: string
  placements?: Placement | null
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

let channelCounter = 0

export default function AdminAdsPage() {
  const supabaseRef = useRef(createClient())
  const [activeTab, setActiveTab] = useState("marketplace")
  const [loading, setLoading] = useState(true)
  const [placements, setPlacements] = useState<Placement[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [revenue, setRevenue] = useState<RevenueEntry[]>([])
  const [role, setRole] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [preselectedPlacement, setPreselectedPlacement] = useState<Placement | null>(null)
  const [campaignFilter, setCampaignFilter] = useState("all")

  const isAdmin = role === "admin" || role === "editor"

  const showNotice = useCallback((type: "success" | "error", text: string) => {
    setNotice({ type, text })
    window.setTimeout(() => setNotice(null), 6000)
  }, [])

  const loadAll = useCallback(async () => {
    try {
      const [pl, cm, rv] = await Promise.all([
        fetch("/admin/ads/api?section=placements").then((r) => r.json()),
        fetch("/admin/ads/api?section=campaigns").then((r) => r.json()),
        fetch("/admin/ads/api?section=revenue").then((r) => r.json()),
      ])
      if (pl.placements) setPlacements(pl.placements)
      if (cm.campaigns) setCampaigns(cm.campaigns)
      if (rv.revenue) setRevenue(rv.revenue)
    } catch (e) {
      console.error("Failed to load ads data:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const supabase = supabaseRef.current
    loadAll()

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email || null)
        supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (profile) setRole((profile.role as string) || null)
          })
      }
    })

    const channel = supabase.channel(`ads_center_${++channelCounter}`)
    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ad_campaigns" },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ad_placements" },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ad_revenue" },
        () => loadAll()
      )
      .subscribe()

    const poll = setInterval(loadAll, 30000)
    const onFocus = () => loadAll()
    window.addEventListener("focus", onFocus)
    return () => {
      channel.unsubscribe().then(() => supabase.removeChannel(channel))
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
    }
  }, [loadAll])

  const openAdvertise = useCallback((placement: Placement) => {
    setPreselectedPlacement(placement)
    setActiveTab("advertise")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const liveCampaigns = campaigns.filter((c) => c.status === "live" || c.status === "approved")
  const pendingCampaigns = campaigns.filter((c) => c.status === "pending")
  const activePlacements = placements.filter((p) => p.is_active)
  const totalCampaignImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0)
  const totalCampaignClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0)
  const totalRevenue = revenue.reduce((s, r) => s + Number(r.revenue || 0), 0)
  const totalRevImpressions = revenue.reduce((s, r) => s + (r.impressions || 0), 0)
  const totalRevClicks = revenue.reduce((s, r) => s + (r.clicks || 0), 0)
  const allImpressions = totalCampaignImpressions + totalRevImpressions
  const allClicks = totalCampaignClicks + totalRevClicks
  const avgCtr = allImpressions > 0 ? (allClicks / allImpressions) * 100 : 0
  const estMonthlyReach = activePlacements.reduce((s, p) => s + (p.est_impressions || 0), 0)

  const sourceMap: Record<string, { revenue: number; impressions: number }> = {}
  for (const r of revenue) {
    const src = r.source || "other"
    if (!sourceMap[src]) sourceMap[src] = { revenue: 0, impressions: 0 }
    sourceMap[src].revenue += Number(r.revenue || 0)
    sourceMap[src].impressions += r.impressions || 0
  }
  const topSources = Object.entries(sourceMap)
    .map(([source, d]) => ({ source, ...d }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  const filteredCampaigns =
    campaignFilter === "all"
      ? campaigns
      : campaigns.filter((c) => c.status === campaignFilter)

  if (loading) {
    return (
      <div style={{ background: S.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <RefreshCw style={{ width: 24, height: 24, color: S.primary, animation: "spin 1s linear infinite" }} />
        <span style={{ color: S.textMuted, fontSize: 15 }}>Loading Advertising Marketplace...</span>
      </div>
    )
  }

  return (
    <div style={{ background: S.bg, minHeight: "100vh", padding: "24px 28px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {notice && (
          <div style={{
            position: "fixed", top: 76, right: 24, zIndex: 1200,
            display: "flex", alignItems: "center", gap: 10,
            background: notice.type === "success" ? S.green : S.red,
            color: "#fff", borderRadius: 10, padding: "12px 18px",
            fontSize: 14, fontWeight: 500, boxShadow: "0 8px 24px rgba(15,23,42,0.18)",
          }}>
            {notice.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {notice.text}
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: S.text, margin: 0, letterSpacing: "-0.02em" }}>Advertise on Techpivo</h1>
            <p style={{ color: S.textMuted, fontSize: 14, margin: "4px 0 0" }}>
              Buy premium ad space on one of Nigeria&apos;s fastest growing technology platforms.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setActiveTab("spaces")} style={btnSecondary}>
              <LayoutGrid size={15} style={{ marginRight: 6, verticalAlign: "-2px" }} /> Browse Ad Spaces
            </button>
            <button onClick={() => { setPreselectedPlacement(null); setActiveTab("advertise"); window.scrollTo({ top: 0, behavior: "smooth" }) }} style={btnPrimary}>
              <Megaphone size={15} style={{ marginRight: 6, verticalAlign: "-2px" }} /> Start Campaign
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, marginBottom: 24, borderBottom: `1px solid ${S.border}`, overflowX: "auto" }}>
          {TABS.map((t) => {
            const Icon = t.icon
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                data-tab={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "12px 18px", background: "transparent", border: "none",
                  borderBottom: active ? `2px solid ${S.primary}` : "2px solid transparent",
                  color: active ? S.primary : S.textMuted,
                  fontSize: 14, fontWeight: active ? 600 : 500, cursor: "pointer",
                  whiteSpace: "nowrap", transition: "color 0.15s",
                }}
              >
                <Icon size={16} />
                {t.label}
                {t.id === "campaigns" && pendingCampaigns.length > 0 && isAdmin && (
                  <span style={{ background: S.amber, color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>
                    {pendingCampaigns.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {activeTab === "marketplace" && (
          <MarketplaceTab
            totalRevenue={totalRevenue}
            liveCampaigns={liveCampaigns.length}
            pendingCampaigns={pendingCampaigns.length}
            activePlacements={activePlacements.length}
            estMonthlyReach={estMonthlyReach}
            avgCtr={avgCtr}
            allImpressions={allImpressions}
            allClicks={allClicks}
            topSources={topSources}
            campaigns={campaigns}
            placements={activePlacements}
            onBuy={openAdvertise}
          />
        )}

        {activeTab === "spaces" && (
          <SpacesTab placements={activePlacements} onBuy={openAdvertise} />
        )}

        {activeTab === "advertise" && (
          <AdvertiseTab
            placements={activePlacements}
            preselected={preselectedPlacement}
            userEmail={userEmail}
            onSubmitted={(msg) => { showNotice("success", msg); setActiveTab("campaigns"); loadAll() }}
            onError={showNotice}
          />
        )}

        {activeTab === "campaigns" && (
          <CampaignsTab
            campaigns={filteredCampaigns}
            filter={campaignFilter}
            setFilter={setCampaignFilter}
            isAdmin={isAdmin}
            onAction={async (action, campaign) => {
              if (action === "delete") {
                if (!window.confirm(`Delete this campaign? This cannot be undone.`)) return
                const res = await fetch("/admin/ads/api", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ type: "campaign", id: campaign.id }),
                })
                const data = await res.json()
                if (res.ok) {
                  showNotice("success", "Campaign deleted")
                  loadAll()
                } else {
                  showNotice("error", data.error || "Delete failed")
                }
                return
              }
              const res = await fetch("/admin/ads/api", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, campaign_id: campaign.id }),
              })
              const data = await res.json()
              if (res.ok) {
                showNotice("success", data.message || "Done")
                loadAll()
              } else {
                showNotice("error", data.error || "Action failed")
              }
            }}
          />
        )}

        {activeTab === "revenue" && (
          <RevenueTab revenue={revenue} totalRevenue={totalRevenue} topSources={topSources} />
        )}

        {activeTab === "manage" && (
          <ManageTab
            placements={placements}
            isAdmin={isAdmin}
            onChanged={() => { loadAll(); showNotice("success", "Ad space updated") }}
            onError={showNotice}
          />
        )}
      </div>
    </div>
  )
}

/* ================== MARKETPLACE ================== */

function MarketplaceTab(props: {
  totalRevenue: number
  liveCampaigns: number
  pendingCampaigns: number
  activePlacements: number
  estMonthlyReach: number
  avgCtr: number
  allImpressions: number
  allClicks: number
  topSources: { source: string; revenue: number; impressions: number }[]
  campaigns: Campaign[]
  placements: Placement[]
  onBuy: (p: Placement) => void
}) {
  const kpis = [
    { label: "Total Ad Revenue", value: NGN(props.totalRevenue), icon: Wallet, color: S.green, bg: "#DCFCE7" },
    { label: "Live Campaigns", value: fmt(props.liveCampaigns), icon: Megaphone, color: S.primary, bg: "#DBEAFE" },
    { label: "Pending Approvals", value: fmt(props.pendingCampaigns), icon: Clock, color: S.amber, bg: "#FEF3C7" },
    { label: "Active Ad Spaces", value: fmt(props.activePlacements), icon: LayoutGrid, color: S.purple, bg: "#EDE9FE" },
    { label: "Est. Monthly Reach", value: fmt(props.estMonthlyReach), icon: Users, color: "#0EA5E9", bg: "#E0F2FE" },
    { label: "Avg. CTR", value: `${props.avgCtr.toFixed(2)}%`, icon: MousePointerClick, color: S.yellow, bg: "#FEF9C3" },
  ]

  const recentOrders = [...props.campaigns].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(120deg, #1E3A8A 0%, #2563EB 55%, #3B82F6 100%)",
        borderRadius: 16, padding: "34px 36px", color: "#fff", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: -60, top: -60, width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", right: 40, bottom: -80, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "relative", maxWidth: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Crown size={18} />
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Premium Audience · 20,000+ Monthly Tech Readers</span>
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.25 }}>
            Put your brand in front of developers, IT pros &amp; gadget buyers.
          </h2>
          <p style={{ fontSize: 14.5, margin: "12px 0 20px", opacity: 0.92, lineHeight: 1.6 }}>
            Transparent pricing, no middleman. Pick an ad space, choose your duration, submit your creative,
            and our team approves it within 24 hours.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => props.placements[0] && props.onBuy(props.placements[0])}
              style={{ background: "#fff", color: S.primary, border: "none", borderRadius: 10, padding: "11px 22px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              Advertise Now
            </button>
            <button
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              style={{ background: "rgba(255,255,255,0.14)", color: "#fff", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 10, padding: "11px 22px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              How it works
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} style={cardStyle({ padding: 16, display: "flex", alignItems: "center", gap: 12 })}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={19} color={k.color} />
              </div>
              <div>
                <div style={{ fontSize: 19, fontWeight: 700, color: S.text, lineHeight: 1.2 }}>{k.value}</div>
                <div style={{ fontSize: 12, color: S.textDim }}>{k.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* How it works */}
      <div id="how-it-works" style={cardStyle()}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: S.text, margin: "0 0 18px" }}>How It Works</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {[
            { step: "1", title: "Pick an ad space", desc: "Browse our inventory — leaderboards, sidebars, in-content units — with transparent daily pricing.", icon: LayoutGrid },
            { step: "2", title: "Set your schedule", desc: "Choose a day-based plan or buy impressions. Total cost is calculated instantly.", icon: Calendar },
            { step: "3", title: "Submit creative", desc: "Upload your banner, add your destination URL, and place your order in under 2 minutes.", icon: ImageIcon },
            { step: "4", title: "We approve & go live", desc: "Our team reviews your ad within 24 hours. Once approved, it starts serving immediately.", icon: ShieldCheck },
          ].map((s) => {
            const Icon = s.icon
            return (
              <div key={s.step} style={{ background: S.input, borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: S.primary, color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.step}</span>
                  <Icon size={18} color={S.primary} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: S.text, margin: "0 0 4px" }}>{s.title}</p>
                <p style={{ fontSize: 12.5, color: S.textMuted, margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* Top sources */}
        <div style={cardStyle()}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: S.text, margin: "0 0 14px" }}>Revenue by Source</h3>
          {props.topSources.length === 0 ? (
            <p style={{ color: S.textDim, fontSize: 13.5, margin: 0 }}>No revenue data yet. Connect ad networks or sell direct ad space.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {props.topSources.map((s) => (
                <div key={s.source} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: S.input, borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: "#DBEAFE", color: S.primary, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", textTransform: "capitalize" }}>
                      {s.source.charAt(0)}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: S.text, textTransform: "capitalize" }}>{s.source}</span>
                  </div>
                  <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: S.text }}>{fmt(s.impressions)}</div>
                      <div style={{ fontSize: 11, color: S.textDim }}>impressions</div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 90 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: S.green }}>{NGN(s.revenue)}</div>
                      <div style={{ fontSize: 11, color: S.textDim }}>revenue</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div style={cardStyle()}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: S.text, margin: 0 }}>Recent Campaigns</h3>
            <button onClick={() => (document.querySelector('[data-tab="campaigns"]') as HTMLElement)?.click()} style={btnSecondary}>View all</button>
          </div>
          {recentOrders.length === 0 ? (
            <p style={{ color: S.textDim, fontSize: 13.5, margin: 0 }}>No campaigns yet — be the first advertiser on Techpivo.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recentOrders.map((c) => {
                const st = STATUS_META[c.status] || STATUS_META.draft
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: S.input, borderRadius: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 600, color: S.text, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.headline || c.advertiser_name}
                      </p>
                      <p style={{ fontSize: 12, color: S.textDim, margin: "2px 0 0" }}>
                        {c.advertiser_name} · {c.billing_model === "per_day" ? `${c.units} days` : `${fmt(c.units * 1000)} impressions`}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: S.text }}>{NGN(c.total_price)}</span>
                      <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{st.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ================== AD SPACES ================== */

function SpacesTab({ placements, onBuy }: { placements: Placement[]; onBuy: (p: Placement) => void }) {
  const [query, setQuery] = useState("")
  const filtered = placements.filter((p) => {
    const q = query.toLowerCase()
    return !q || p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q) || p.location.toLowerCase().includes(q)
  })

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 700, color: S.text, margin: 0 }}>Available Ad Spaces</h2>
          <p style={{ fontSize: 13, color: S.textMuted, margin: "3px 0 0" }}>Fixed transparent pricing. Minimum {Math.min(...placements.map((p) => p.min_days), 7)} days per booking.</p>
        </div>
        <div style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: 11, color: S.textDim }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ad spaces..." style={{ ...inputStyle, width: 260, paddingLeft: 34 }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {filtered.map((p) => {
          const sizeLabel = Array.isArray(p.sizes) && p.sizes[0] ? p.sizes[0] : `${p.width || 300}x${p.height || 250}`
          return (
            <div key={p.id} style={{ ...cardStyle(), display: "flex", flexDirection: "column", transition: "box-shadow 0.2s", boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <h4 style={{ fontSize: 15.5, fontWeight: 700, color: S.text, margin: 0 }}>{p.name}</h4>
                  <span style={{ fontSize: 12, color: S.textDim, textTransform: "capitalize" }}>{p.location} · {p.ad_type}</span>
                </div>
                <span style={{ background: "#F1F5F9", color: S.textMuted, borderRadius: 8, padding: "4px 9px", fontSize: 12, fontWeight: 600, fontFamily: "ui-monospace, monospace" }}>
                  {sizeLabel}
                </span>
              </div>

              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                {(Array.isArray(p.sizes) ? p.sizes : []).map((s, i) => (
                  <span key={i} style={{ background: "#DBEAFE", color: S.primary, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{s}</span>
                ))}
                <span style={{ background: "#EDE9FE", color: S.purple, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{p.ad_type}</span>
              </div>

              {p.description && <p style={{ fontSize: 12.5, color: S.textMuted, margin: "0 0 12px", lineHeight: 1.55 }}>{p.description}</p>}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, background: S.input, borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: S.text }}>{NGN(p.price_per_day)}</div>
                  <div style={{ fontSize: 11, color: S.textDim }}>per day</div>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: S.text }}>{NGN(p.cpm)}</div>
                  <div style={{ fontSize: 11, color: S.textDim }}>per 1k imp.</div>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: S.text }}>{fmt(p.est_impressions)}</div>
                  <div style={{ fontSize: 11, color: S.textDim }}>reach / mo</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", gap: 10 }}>
                <div style={{ display: "flex", gap: 14 }}>
                  <span style={{ fontSize: 12, color: S.textDim }}>
                    <Eye size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />{fmt(p.impressions)}
                  </span>
                  <span style={{ fontSize: 12, color: S.textDim }}>
                    <Users size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />{fmt(p.advertisers)} advertisers
                  </span>
                </div>
                <button onClick={() => onBuy(p)} style={{ ...btnPrimary, padding: "8px 18px", display: "flex", alignItems: "center", gap: 6 }}>
                  Buy <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ ...cardStyle({ gridColumn: "1 / -1" }), textAlign: "center", padding: 60, color: S.textDim }}>
            No ad spaces found.
          </div>
        )}
      </div>
    </div>
  )
}

/* ================== ADVERTISE (ORDER FLOW) ================== */

function AdvertiseTab({
  placements, preselected, userEmail, onSubmitted, onError,
}: {
  placements: Placement[]
  preselected: Placement | null
  userEmail: string | null
  onSubmitted: (msg: string) => void
  onError: (type: "success" | "error", text: string) => void
}) {
  const [placementId, setPlacementId] = useState<string | null>(preselected?.id || null)
  const [billingModel, setBillingModel] = useState<"per_day" | "impressions">("per_day")
  const [units, setUnits] = useState(7)
  const [brand, setBrand] = useState("")
  const [headline, setHeadline] = useState("")
  const [cta, setCta] = useState("Learn More")
  const [description, setDescription] = useState("")
  const [destinationUrl, setDestinationUrl] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [email, setEmail] = useState(userEmail || "")
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (preselected) setPlacementId(preselected.id)
  }, [preselected])

  const placement = placements.find((p) => p.id === placementId) || null

  const minUnits = placement ? (billingModel === "per_day" ? placement.min_days : 1) : 1
  const unitPrice = placement ? (billingModel === "per_day" ? Number(placement.price_per_day) : Number(placement.cpm)) : 0
  const total = unitPrice * Math.max(1, Math.floor(units))
  const estReach = placement
    ? billingModel === "per_day"
      ? Math.round((placement.est_impressions / 30) * Math.max(1, Math.floor(units)))
      : Math.max(1, Math.floor(units)) * 1000
    : 0

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed")
      setImageUrl(data.url)
    } catch (e: any) {
      onError("error", e.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!placement) { onError("error", "Select an ad space"); return }
    if (!brand.trim() || !headline.trim() || !destinationUrl.trim()) {
      onError("error", "Brand name, headline and destination URL are required")
      return
    }
    if (billingModel === "per_day" && Math.floor(units) < minUnits) {
      onError("error", `Minimum booking is ${minUnits} days for this ad space`)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/admin/ads/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "order",
          placement_id: placement.id,
          billing_model: billingModel,
          units: Math.floor(units),
          advertiser_name: brand.trim(),
          advertiser_email: email.trim() || null,
          headline: headline.trim(),
          cta_text: cta.trim() || "Learn More",
          description: description.trim(),
          destination_url: destinationUrl.trim(),
          ad_image_url: imageUrl.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to place order")
      setBrand(""); setHeadline(""); setDescription(""); setDestinationUrl(""); setImageUrl("")
      onSubmitted(data.message || "Order submitted!")
    } catch (e: any) {
      onError("error", e.message || "Failed to place order")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Step 1 — placement */}
        <div style={cardStyle()}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: S.primary, color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>1</span>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: S.text, margin: 0 }}>Choose your ad space</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, maxHeight: 300, overflowY: "auto", paddingRight: 4 }}>
            {placements.map((p) => {
              const selected = p.id === placementId
              return (
                <button
                  key={p.id}
                  onClick={() => setPlacementId(p.id)}
                  style={{
                    textAlign: "left", cursor: "pointer", background: selected ? "#EFF6FF" : S.input,
                    border: selected ? `2px solid ${S.primary}` : `1px solid ${S.border}`,
                    borderRadius: 12, padding: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: S.text }}>{p.name}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: S.primary, whiteSpace: "nowrap" }}>{NGN(p.price_per_day)}/d</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: S.textDim, marginTop: 4 }}>
                    {(Array.isArray(p.sizes) ? p.sizes : []).slice(0, 2).join(" · ")} · {fmt(p.est_impressions)}/mo
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Step 2 — schedule */}
        <div style={cardStyle()}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: S.primary, color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: S.text, margin: 0 }}>Set your schedule &amp; budget</h3>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            {(["per_day", "impressions"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setBillingModel(m); setUnits(m === "per_day" ? minUnits : 10) }}
                style={{
                  flex: 1, padding: "11px 14px", borderRadius: 10, cursor: "pointer", fontSize: 13.5, fontWeight: 600,
                  background: billingModel === m ? S.primary : "#fff",
                  color: billingModel === m ? "#fff" : S.textMuted,
                  border: billingModel === m ? `1px solid ${S.primary}` : `1px solid ${S.border}`,
                }}
              >
                {m === "per_day" ? "Per Day (₦)" : "Per 1,000 Impressions (₦)"}
              </button>
            ))}
          </div>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: S.textMuted, display: "block", marginBottom: 6 }}>
              {billingModel === "per_day" ? `Number of days (min ${minUnits})` : "Thousands of impressions (min 1)"}
            </label>
            <input
              type="number"
              min={minUnits}
              value={units}
              onChange={(e) => setUnits(parseInt(e.target.value) || minUnits)}
              style={inputStyle}
            />
            <p style={{ fontSize: 12, color: S.textDim, margin: "8px 0 0" }}>
              {billingModel === "per_day"
                ? `Estimated reach: ~${fmt(estReach)} visitors over ${Math.max(1, Math.floor(units))} day${Math.max(1, Math.floor(units)) > 1 ? "s" : ""}`
                : `Estimated reach: ~${fmt(estReach)} impressions`}
            </p>
          </div>
        </div>

        {/* Step 3 — creative */}
        <div style={cardStyle()}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: S.primary, color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>3</span>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: S.text, margin: 0 }}>Your ad creative</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>Brand / Company name *</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Acme Tech Ltd" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Ad headline *</label>
              <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Fastest hosting in Nigeria" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
            <div>
              <label style={labelStyle}>Button text</label>
              <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Learn More" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Destination URL *</label>
              <input value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="https://your-site.com" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>Short description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="One line about what you offer..." style={{ ...inputStyle, resize: "vertical" }} />
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>Banner image</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Paste image URL or upload" style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
              <button onClick={() => fileRef.current?.click()} style={btnSecondary} disabled={uploading}>
                <Upload size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                {uploading ? "Uploading..." : "Upload"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleUpload(f)
                }}
              />
            </div>
            {imageUrl && (
              <div style={{ marginTop: 10, border: `1px solid ${S.border}`, borderRadius: 10, overflow: "hidden", maxWidth: 420, background: S.input }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Ad preview" style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
            )}
            <p style={{ fontSize: 12, color: S.textDim, margin: "8px 0 0" }}>
              Recommended: 728x90 (leaderboard), 300x250 (rectangle) or 336x280 (in-content). PNG/JPG, max 2MB.
            </p>
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>Contact email (optional)</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ ...cardStyle(), position: "sticky", top: 80 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: S.text, margin: "0 0 14px" }}>Order Summary</h3>
        {!placement ? (
          <p style={{ color: S.textDim, fontSize: 13.5, margin: 0 }}>Select an ad space to see pricing.</p>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
              <SummaryRow label="Ad space" value={placement.name} />
              <SummaryRow label="Model" value={billingModel === "per_day" ? "Per day" : "Per 1,000 impressions"} />
              <SummaryRow label="Units" value={billingModel === "per_day" ? `${Math.max(1, Math.floor(units))} days` : `${fmt(Math.max(1, Math.floor(units)) * 1000)} impressions`} />
              <SummaryRow label="Unit price" value={NGN(unitPrice)} />
            </div>
            <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: S.text }}>Total</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: S.primary }}>{NGN(total)}</span>
              </div>
              <p style={{ fontSize: 12, color: S.textDim, margin: "6px 0 14px" }}>
                ~{fmt(estReach)} estimated impressions
              </p>
            </div>
            <button onClick={handleSubmit} disabled={submitting} style={{ ...btnPrimary, width: "100%", padding: "13px 20px", fontSize: 15, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "Submitting..." : "Place Order"}
            </button>
            <p style={{ fontSize: 11.5, color: S.textDim, margin: "10px 0 0", textAlign: "center", lineHeight: 1.5 }}>
              <ShieldCheck size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
              Our team reviews every order within 24 hours before it goes live.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 600, color: S.textMuted, display: "block", marginBottom: 6,
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={{ fontSize: 13, color: S.textMuted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: S.text, textAlign: "right" }}>{value}</span>
    </div>
  )
}

/* ================== CAMPAIGNS ================== */

function CampaignsTab({
  campaigns, filter, setFilter, isAdmin, onAction,
}: {
  campaigns: Campaign[]
  filter: string
  setFilter: (f: string) => void
  isAdmin: boolean
  onAction: (action: string, campaign: Campaign) => void
}) {
  const filters = ["all", "pending", "live", "approved", "paused", "rejected", "completed", "cancelled"]

  const handleReject = (c: Campaign) => {
    const note = window.prompt("Reason for rejection (shown to the advertiser):", "Creative does not meet our ad guidelines")
    if (note === null) return
    fetch("/admin/ads/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", campaign_id: c.id, note }),
    }).then((r) => r.json()).then((d) => {
      window.location.reload()
    })
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 19, fontWeight: 700, color: S.text, margin: 0 }}>Campaigns &amp; Orders</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                background: filter === f ? S.primary : "#fff", color: filter === f ? "#fff" : S.textMuted,
                border: filter === f ? `1px solid ${S.primary}` : `1px solid ${S.border}`,
              }}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {campaigns.map((c) => {
          const st = STATUS_META[c.status] || STATUS_META.draft
          const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : "0.00"
          return (
            <div key={c.id} style={cardStyle({ display: "flex", flexDirection: "column" })}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: S.text, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.headline || c.advertiser_name}
                  </h4>
                  <p style={{ fontSize: 12.5, color: S.textMuted, margin: "2px 0 0" }}>{c.advertiser_name}</p>
                </div>
                <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{st.label}</span>
              </div>

              {c.placements && (
                <p style={{ fontSize: 12, color: S.textDim, margin: "0 0 8px" }}>
                  <LayoutGrid size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                  {c.placements.name}
                </p>
              )}

              {c.description && (
                <p style={{ fontSize: 12.5, color: S.textMuted, margin: "0 0 10px", lineHeight: 1.5 }}>{c.description}</p>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, background: S.input, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: S.text }}>{fmt(c.impressions)}</div>
                  <div style={{ fontSize: 11, color: S.textDim }}>Impressions</div>
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: S.text }}>{fmt(c.clicks)}</div>
                  <div style={{ fontSize: 11, color: S.textDim }}>Clicks</div>
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: S.primary }}>{ctr}%</div>
                  <div style={{ fontSize: 11, color: S.textDim }}>CTR</div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: S.textMuted, marginBottom: 4 }}>
                <span>{c.billing_model === "per_day" ? `${c.units} day${c.units > 1 ? "s" : ""}` : `${fmt(c.units * 1000)} impressions`}</span>
                <span style={{ fontWeight: 600, color: S.text }}>{NGN(c.total_price)}</span>
              </div>
              {c.start_date && (
                <div style={{ fontSize: 12, color: S.textDim, marginBottom: 10 }}>
                  {String(c.start_date).slice(0, 10)}{c.end_date ? ` → ${String(c.end_date).slice(0, 10)}` : ""}
                </div>
              )}

              {c.review_note && (
                <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: S.amber, marginBottom: 10 }}>
                  <AlertCircle size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />
                  {c.review_note}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: "auto", flexWrap: "wrap" }}>
                {isAdmin && c.status === "pending" && (
                  <>
                    <button onClick={() => onAction("approve", c)} style={{ ...btnPrimary, flex: 1, padding: "8px 14px", background: S.green, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button onClick={() => handleReject(c)} style={{ ...btnSecondary, color: S.red, borderColor: "#FECACA", display: "flex", alignItems: "center", gap: 5 }}>
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                )}
                {isAdmin && c.status === "live" && (
                  <button onClick={() => onAction("pause", c)} style={{ ...btnSecondary, flex: 1, color: S.yellow, borderColor: "#FDE68A", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <PauseCircle size={14} /> Pause
                  </button>
                )}
                {isAdmin && c.status === "paused" && (
                  <button onClick={() => onAction("resume", c)} style={{ ...btnPrimary, flex: 1, padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <PlayCircle size={14} /> Resume
                  </button>
                )}
                {c.status === "draft" && (
                  <button onClick={() => onAction("delete", c)} style={{ ...btnSecondary, flex: 1, color: S.red, borderColor: "#FECACA", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <Trash2 size={14} /> Cancel
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {campaigns.length === 0 && (
          <div style={{ ...cardStyle({ gridColumn: "1 / -1" }), textAlign: "center", padding: 60, color: S.textDim }}>
            No campaigns here yet.
          </div>
        )}
      </div>
    </div>
  )
}

/* ================== REVENUE ================== */

function RevenueTab({
  revenue, totalRevenue, topSources,
}: {
  revenue: RevenueEntry[]
  totalRevenue: number
  topSources: { source: string; revenue: number; impressions: number }[]
}) {
  const totalImpressions = revenue.reduce((s, r) => s + (r.impressions || 0), 0)
  const totalClicks = revenue.reduce((s, r) => s + (r.clicks || 0), 0)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
        {[
          { label: "Total Revenue", value: NGN(totalRevenue), color: S.green, bg: "#DCFCE7" },
          { label: "Impressions", value: fmt(totalImpressions), color: S.primary, bg: "#DBEAFE" },
          { label: "Clicks", value: fmt(totalClicks), color: S.purple, bg: "#EDE9FE" },
          { label: "Sources", value: fmt(topSources.length), color: S.amber, bg: "#FEF3C7" },
        ].map((k) => (
          <div key={k.label} style={cardStyle({ display: "flex", alignItems: "center", gap: 12, padding: 16 })}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: k.color, fontSize: 16 }}>{k.label.charAt(0)}</div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 700, color: S.text, lineHeight: 1.2 }}>{k.value}</div>
              <div style={{ fontSize: 12, color: S.textDim }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={cardStyle({ padding: 0, overflow: "hidden" })}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${S.border}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: S.text, margin: 0 }}>Revenue Records</h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${S.border}`, background: S.input }}>
                {["Date", "Source", "Impressions", "Clicks", "Revenue", "CPM", "CPC"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: S.textMuted, fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {revenue.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${S.border}` }}>
                  <td style={{ padding: "12px 16px", color: S.text, fontSize: 13 }}>{r.date}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: "#DBEAFE", color: S.primary, borderRadius: 6, padding: "2px 8px", fontSize: 11.5, fontWeight: 600, textTransform: "capitalize" }}>{r.source}</span>
                  </td>
                  <td style={{ padding: "12px 16px", color: S.text, fontSize: 13 }}>{fmt(r.impressions)}</td>
                  <td style={{ padding: "12px 16px", color: S.text, fontSize: 13 }}>{fmt(r.clicks)}</td>
                  <td style={{ padding: "12px 16px", color: S.green, fontSize: 13, fontWeight: 700 }}>{NGN(r.revenue)}</td>
                  <td style={{ padding: "12px 16px", color: S.textMuted, fontSize: 13 }}>{NGN(r.cpm)}</td>
                  <td style={{ padding: "12px 16px", color: S.textMuted, fontSize: 13 }}>{NGN(r.cpc)}</td>
                </tr>
              ))}
              {revenue.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: S.textDim }}>No revenue data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ================== MANAGE (ADMIN) ================== */

function ManageTab({
  placements, isAdmin, onChanged, onError,
}: {
  placements: Placement[]
  isAdmin: boolean
  onChanged: () => void
  onError: (type: "success" | "error", text: string) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Placement | null>(null)
  const [form, setForm] = useState({
    name: "", position: "", location: "site", description: "", ad_type: "banner",
    sizes: "728x90", price_per_day: "0", cpm: "0", min_days: "7", min_budget: "0", est_impressions: "0",
  })

  const startCreate = () => {
    setEditing(null)
    setForm({ name: "", position: "", location: "site", description: "", ad_type: "banner", sizes: "728x90", price_per_day: "0", cpm: "0", min_days: "7", min_budget: "0", est_impressions: "0" })
    setShowForm(true)
  }

  const startEdit = (p: Placement) => {
    setEditing(p)
    setForm({
      name: p.name, position: p.position, location: p.location, description: p.description || "",
      ad_type: p.ad_type, sizes: (p.sizes || []).join(", "), price_per_day: String(p.price_per_day),
      cpm: String(p.cpm), min_days: String(p.min_days), min_budget: String(p.min_budget), est_impressions: String(p.est_impressions),
    })
    setShowForm(true)
  }

  const save = async () => {
    const payload = {
      ...form,
      sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
      price_per_day: parseFloat(form.price_per_day) || 0,
      cpm: parseFloat(form.cpm) || 0,
      min_days: parseInt(form.min_days) || 7,
      min_budget: parseFloat(form.min_budget) || 0,
      est_impressions: parseInt(form.est_impressions) || 0,
    }
    const res = await fetch("/admin/ads/api", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing
        ? { type: "placement", id: editing.id, ...payload, is_active: editing.is_active }
        : { action: "placement", ...payload }),
    })
    const data = await res.json()
    if (!res.ok) {
      onError("error", data.error || "Failed to save")
      return
    }
    setShowForm(false)
    onChanged()
  }

  const toggleActive = async (p: Placement) => {
    const res = await fetch("/admin/ads/api", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "placement", id: p.id, name: p.name, position: p.position, location: p.location,
        description: p.description || "", ad_type: p.ad_type, sizes: p.sizes || [],
        price_per_day: p.price_per_day, cpm: p.cpm, min_days: p.min_days, min_budget: p.min_budget,
        est_impressions: p.est_impressions, is_active: !p.is_active,
      }),
    })
    if (res.ok) onChanged()
    else onError("error", "Failed to update ad space")
  }

  const remove = async (p: Placement) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    const res = await fetch("/admin/ads/api", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "placement", id: p.id }),
    })
    if (res.ok) onChanged()
    else onError("error", "Failed to delete ad space")
  }

  if (!isAdmin) {
    return (
      <div style={{ ...cardStyle(), textAlign: "center", padding: 60, color: S.textDim }}>
        <Settings2 size={28} style={{ marginBottom: 10 }} />
        <p style={{ margin: 0 }}>Only administrators can manage ad space inventory.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 700, color: S.text, margin: 0 }}>Ad Space Inventory</h2>
          <p style={{ fontSize: 13, color: S.textMuted, margin: "3px 0 0" }}>Set pricing, sizes and availability for each sellable ad space.</p>
        </div>
        <button onClick={startCreate} style={btnPrimary}>
          <Plus size={15} style={{ marginRight: 6, verticalAlign: "-2px" }} /> New Ad Space
        </button>
      </div>

      <div style={cardStyle({ padding: 0, overflow: "hidden" })}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${S.border}`, background: S.input }}>
                {["Ad Space", "Position", "Sizes", "Price/Day", "CPM", "Reach/Mo", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: S.textMuted, fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {placements.map((p) => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${S.border}` }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: S.text }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: S.textDim, textTransform: "capitalize" }}>{p.location} · {p.ad_type}</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <code style={{ fontSize: 11.5, background: S.input, padding: "3px 7px", borderRadius: 6, color: S.textMuted }}>{p.position}</code>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: S.textMuted }}>{(p.sizes || []).join(", ")}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: S.text }}>{NGN(p.price_per_day)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: S.textMuted }}>{NGN(p.cpm)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: S.textMuted }}>{fmt(p.est_impressions)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      background: p.is_active ? "#DCFCE7" : "#F1F5F9",
                      color: p.is_active ? S.green : S.slate,
                      borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                    }}>
                      {p.is_active ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => startEdit(p)} style={{ ...btnSecondary, padding: "5px 11px", fontSize: 12 }}>Edit</button>
                      <button onClick={() => toggleActive(p)} style={{ ...btnSecondary, padding: "5px 11px", fontSize: 12 }}>{p.is_active ? "Hide" : "Show"}</button>
                      <button onClick={() => remove(p)} style={{ ...btnSecondary, padding: "5px 11px", fontSize: 12, color: S.red, borderColor: "#FECACA" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {placements.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: S.textDim }}>No ad spaces yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: S.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }} onClick={() => setShowForm(false)}>
          <div style={{ ...cardStyle({ width: 560, maxHeight: "85vh", overflow: "auto" }) }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: S.text, margin: "0 0 18px" }}>
              {editing ? "Edit Ad Space" : "New Ad Space"}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Homepage Leaderboard" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Position key *</label>
                <input value={form.position} onChange={(e) => setForm(f => ({ ...f, position: e.target.value }))} placeholder="e.g. home_top_banner" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <select value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} style={inputStyle}>
                  <option value="site">Site-wide</option>
                  <option value="homepage">Homepage</option>
                  <option value="articles">Articles</option>
                  <option value="category">Category</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Ad type</label>
                <select value={form.ad_type} onChange={(e) => setForm(f => ({ ...f, ad_type: e.target.value }))} style={inputStyle}>
                  <option value="banner">Banner</option>
                  <option value="native">Native</option>
                  <option value="infeed">In-Feed</option>
                  <option value="sticky">Sticky</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Sizes (comma-sep)</label>
                <input value={form.sizes} onChange={(e) => setForm(f => ({ ...f, sizes: e.target.value }))} placeholder="728x90, 300x250" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Price per day (₦)</label>
                <input type="number" value={form.price_per_day} onChange={(e) => setForm(f => ({ ...f, price_per_day: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>CPM (₦ / 1k impressions)</label>
                <input type="number" value={form.cpm} onChange={(e) => setForm(f => ({ ...f, cpm: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Min days</label>
                <input type="number" value={form.min_days} onChange={(e) => setForm(f => ({ ...f, min_days: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Min budget (₦)</label>
                <input type="number" value={form.min_budget} onChange={(e) => setForm(f => ({ ...f, min_budget: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Est. monthly impressions</label>
                <input type="number" value={form.est_impressions} onChange={(e) => setForm(f => ({ ...f, est_impressions: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={labelStyle}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={save} style={btnPrimary}>{editing ? "Save Changes" : "Create Ad Space"}</button>
              <button onClick={() => setShowForm(false)} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
