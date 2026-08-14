"use client"

import { useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { FxApprox } from "@/components/fx-approx"
import { useFx } from "@/lib/use-fx"
import {
  Store, LayoutGrid, Megaphone, ListChecks, TrendingUp, Settings2, BarChart3,
  Plus, Trash2, CheckCircle, XCircle, PauseCircle, PlayCircle, RefreshCw,
  Eye, MousePointerClick, Users, Wallet, Clock, ShieldCheck,
  ArrowRight, Image as ImageIcon, AlertCircle, Crown, Search, Video,
} from "lucide-react"
import {
  AreaChart, Area, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import {
  ADS_GOAL_LABELS, ADS_CTA_LABELS, ADS_FREQUENCY_LABELS, ADS_BILLING_LABELS,
  computeCampaignSpend, formatMoney,
} from "@/lib/ads"

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
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "spaces", label: "Ad Spaces", icon: LayoutGrid },
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
  min_bid_cpm: number
  min_bid_cpc: number
  supports_video: boolean
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
  goal: string | null
  cta_type: string | null
  target_audience: { countries?: string[]; devices?: string[]; interests?: string[] } | null
  currency: string | null
  fx_rate: number | null
  media_type: string | null
  video_url: string | null
  poster_url: string | null
  daily_budget: number | null
  bid_amount: number | null
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

interface DailyStat {
  date: string
  label: string
  impressions: number
  clicks: number
  revenue: number
}

interface TopCampaignStat {
  id: string
  name: string
  advertiser: string
  status: string
  impressions: number
  clicks: number
  ctr: number
  spend: number
}

interface PlacementStat {
  name: string
  impressions: number
  clicks: number
}

let channelCounter = 0

export default function AdminAdsPage() {
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const [activeTab, setActiveTab] = useState("marketplace")
  const [loading, setLoading] = useState(true)
  const [placements, setPlacements] = useState<Placement[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [revenue, setRevenue] = useState<RevenueEntry[]>([])
  const [daily, setDaily] = useState<DailyStat[]>([])
  const [topCampaigns, setTopCampaigns] = useState<TopCampaignStat[]>([])
  const [placementStats, setPlacementStats] = useState<PlacementStat[]>([])
  const [role, setRole] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [campaignFilter, setCampaignFilter] = useState("all")

  const isAdmin = role === "admin" || role === "editor"

  const showNotice = useCallback((type: "success" | "error", text: string) => {
    setNotice({ type, text })
    window.setTimeout(() => setNotice(null), 6000)
  }, [])

  const loadAll = useCallback(async () => {
    try {
      const [pl, cm, rv, an] = await Promise.all([
        fetch("/admin/ads/api?section=placements").then((r) => r.json()),
        fetch("/admin/ads/api?section=campaigns").then((r) => r.json()),
        fetch("/admin/ads/api?section=revenue").then((r) => r.json()),
        fetch("/admin/ads/api?section=analytics").then((r) => r.json()),
      ])
      if (pl.placements) setPlacements(pl.placements)
      if (cm.campaigns) setCampaigns(cm.campaigns)
      if (rv.revenue) setRevenue(rv.revenue)
      if (an.daily) setDaily(an.daily)
      if (an.top_campaigns) setTopCampaigns(an.top_campaigns)
      if (an.placement_stats) setPlacementStats(an.placement_stats)
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ad_campaign_daily_stats" },
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

  const startCampaign = useCallback((placement?: Placement) => {
    router.push(placement ? `/account/ads/new?placement=${placement.id}` : "/account/ads/new")
  }, [router])

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

  const totalCampaignSpend = campaigns.reduce((s, c) => s + computeCampaignSpend(c), 0)
  const combinedRevenue = totalRevenue + totalCampaignSpend

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
            <button onClick={() => startCampaign()} style={btnPrimary}>
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
            totalRevenue={combinedRevenue}
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
            onBuy={startCampaign}
          />
        )}

        {activeTab === "analytics" && (
          <AnalyticsTab
            daily={daily}
            topCampaigns={topCampaigns}
            placementStats={placementStats}
            campaigns={campaigns}
          />
        )}

            {activeTab === "spaces" && (
              <SpacesTab placements={activePlacements} onBuy={startCampaign} />
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
          <RevenueTab revenue={revenue} campaigns={campaigns} totalRevenue={combinedRevenue} topSources={topSources} />
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
  onBuy: (p?: Placement) => void
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
            Auction-based advertising, Google Ads style. You set your own daily budget and bid —
            we show your ad to the right audience and charge you only for what it delivers.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => props.onBuy()}
              style={{ background: "#fff", color: S.primary, border: "none", borderRadius: 10, padding: "11px 22px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              Start a Campaign
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
            { step: "1", title: "Pick an ad space", desc: "Browse our inventory — leaderboards, sidebars, in-content units — each with a minimum bid.", icon: LayoutGrid },
            { step: "2", title: "Set budget & bid", desc: "Choose CPM or CPC, set your own daily budget and bid above the floor. No fixed prices.", icon: Wallet },
            { step: "3", title: "Submit creative", desc: "Upload your banner or video, add your destination URL, and create your campaign in minutes.", icon: ImageIcon },
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
                        {c.advertiser_name} · {ADS_BILLING_LABELS[c.billing_model] || c.billing_model} · {c.units} day{c.units > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: S.text }}>{formatMoney(c.total_price, c.currency || "NGN")}</span>
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

/* ================== ANALYTICS ================== */

function AnalyticsTab({
  daily, topCampaigns, placementStats, campaigns,
}: {
  daily: DailyStat[]
  topCampaigns: TopCampaignStat[]
  placementStats: PlacementStat[]
  campaigns: Campaign[]
}) {
  const [range, setRange] = useState<14 | 30>(14)
  const data = daily.slice(-range)

  const totalImpressions = data.reduce((s, d) => s + d.impressions, 0)
  const totalClicks = data.reduce((s, d) => s + d.clicks, 0)
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0)
  const totalSpend = campaigns.reduce((s, c) => s + computeCampaignSpend(c), 0)
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

  const kpis: { label: string; value: string; color: string; bg: string; icon: any; fx?: ReactNode }[] = [
    { label: "Delivered Impressions", value: fmt(totalImpressions), color: S.primary, bg: "#DBEAFE", icon: Eye },
    { label: "Clicks", value: fmt(totalClicks), color: S.purple, bg: "#EDE9FE", icon: MousePointerClick },
    { label: "CTR", value: `${ctr.toFixed(2)}%`, color: S.yellow, bg: "#FEF9C3", icon: TrendingUp },
    { label: "Campaign Spend", value: NGN(totalSpend), color: S.green, bg: "#DCFCE7", icon: Wallet, fx: <FxApprox amount={totalSpend} from="NGN" /> },
    { label: "Ad Revenue", value: NGN(totalRevenue), color: "#0EA5E9", bg: "#E0F2FE", icon: Clock, fx: <FxApprox amount={totalRevenue} from="NGN" /> },
  ]

  const maxPlacementImps = Math.max(1, ...placementStats.map((p) => p.impressions))

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 700, color: S.text, margin: 0 }}>Delivery &amp; Revenue Analytics</h2>
          <p style={{ fontSize: 13, color: S.textMuted, margin: "3px 0 0" }}>
            Live tracking of impressions, clicks and spend — powered by per-day delivery stats.
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {([14, 30] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: "7px 16px", borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                background: range === r ? S.primary : "#fff", color: range === r ? "#fff" : S.textMuted,
                border: range === r ? `1px solid ${S.primary}` : `1px solid ${S.border}`,
              }}
            >
              Last {r} days
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14 }}>
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} style={cardStyle({ padding: 16, display: "flex", alignItems: "center", gap: 12 })}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={19} color={k.color} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: S.text, lineHeight: 1.2 }}>{k.value}</div>
                <div style={{ fontSize: 12, color: S.textDim }}>{k.label}</div>
                {k.fx && <div style={{ fontSize: 11, color: S.textDim, marginTop: 1 }}>{k.fx}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Delivery chart */}
      <div style={cardStyle()}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: S.text, margin: "0 0 14px" }}>Impressions &amp; clicks per day</h3>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={S.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: S.textDim }} interval={Math.ceil(range / 12)} tickLine={false} axisLine={{ stroke: S.border }} />
              <YAxis yAxisId="imps" tick={{ fontSize: 11, fill: S.textDim }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="clicks" orientation="right" tick={{ fontSize: 11, fill: S.textDim }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: `1px solid ${S.border}`, fontSize: 12.5 }}
                formatter={(value: any, name?: any) => [fmt(Number(value)), name === "impressions" ? "Impressions" : "Clicks"]}
              />
              <Legend wrapperStyle={{ fontSize: 12.5 }} />
              <Bar yAxisId="imps" dataKey="impressions" name="Impressions" fill={S.primary} radius={[3, 3, 0, 0]} maxBarSize={26} />
              <Line yAxisId="clicks" type="monotone" dataKey="clicks" name="Clicks" stroke={S.purple} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue chart */}
      <div style={cardStyle()}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: S.text, margin: "0 0 14px" }}>Revenue per day (ad networks)</h3>
        {data.every((d) => d.revenue === 0) ? (
          <p style={{ color: S.textDim, fontSize: 13.5, margin: 0, padding: "40px 0", textAlign: "center" }}>
            No network revenue recorded in this period. Campaign auction spend is shown in the Revenue tab.
          </p>
        ) : (
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={S.green} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={S.green} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={S.border} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: S.textDim }} interval={Math.ceil(range / 12)} tickLine={false} axisLine={{ stroke: S.border }} />
                <YAxis tick={{ fontSize: 11, fill: S.textDim }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: `1px solid ${S.border}`, fontSize: 12.5 }}
                  formatter={(value: any) => NGN(Number(value))}
                />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke={S.green} strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* Top campaigns */}
        <div style={cardStyle()}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: S.text, margin: "0 0 14px" }}>Top Campaigns by Impressions</h3>
          {topCampaigns.length === 0 ? (
            <p style={{ color: S.textDim, fontSize: 13.5, margin: 0 }}>No delivery yet — stats appear as campaigns serve ads.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {topCampaigns.map((c) => {
                const st = STATUS_META[c.status] || STATUS_META.draft
                const max = Math.max(1, ...topCampaigns.map((t) => t.impressions))
                return (
                  <div key={c.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: S.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: S.text }}>{fmt(c.impressions)}</span>
                        <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>{st.label}</span>
                      </span>
                    </div>
                    <div style={{ height: 7, borderRadius: 4, background: S.input, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.max(2, (c.impressions / max) * 100)}%`, background: S.primary, borderRadius: 4 }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: S.textDim, marginTop: 3 }}>
                      <span>{fmt(c.clicks)} clicks · {c.ctr.toFixed(2)}% CTR</span>
                      <span style={{ fontWeight: 600, color: S.green }}>{NGN(c.spend)} spent</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Placement performance */}
        <div style={cardStyle()}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: S.text, margin: "0 0 14px" }}>Placement Performance</h3>
          {placementStats.length === 0 ? (
            <p style={{ color: S.textDim, fontSize: 13.5, margin: 0 }}>No placement delivery recorded yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {placementStats.map((p) => {
                const ctrPct = p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(2) : "0.00"
                return (
                  <div key={p.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: S.text }}>{p.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: S.text }}>{fmt(p.impressions)} <span style={{ color: S.textDim, fontWeight: 500 }}>imps</span></span>
                    </div>
                    <div style={{ height: 7, borderRadius: 4, background: S.input, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.max(2, (p.impressions / maxPlacementImps) * 100)}%`, background: S.purple, borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 11.5, color: S.textDim, marginTop: 3 }}>
                      {fmt(p.clicks)} clicks · {ctrPct}% CTR
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

function SpacesTab({ placements, onBuy }: { placements: Placement[]; onBuy: (p?: Placement) => void }) {
  const fx = useFx()
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
          <p style={{ fontSize: 13, color: S.textMuted, margin: "3px 0 0" }}>
            Auction inventory — advertisers set their own budget &amp; bid. Minimum bids shown per space.
          </p>
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
                {p.supports_video && (
                  <span style={{ background: "#DCFCE7", color: S.green, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                    <Video size={11} /> Video
                  </span>
                )}
              </div>

              {p.description && <p style={{ fontSize: 12.5, color: S.textMuted, margin: "0 0 12px", lineHeight: 1.55 }}>{p.description}</p>}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, background: S.input, borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: S.text }}>{fx.format(p.min_bid_cpm, "NGN")}</div>
                  <div style={{ fontSize: 11, color: S.textDim }}>min CPM bid</div>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: S.text }}>{fx.format(p.min_bid_cpc, "NGN")}</div>
                  <div style={{ fontSize: 11, color: S.textDim }}>min CPC bid</div>
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
                  Advertise <ArrowRight size={14} />
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


const labelStyle: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 600, color: S.textMuted, display: "block", marginBottom: 6,
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

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{ background: "#EDE9FE", color: S.purple, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                  {ADS_GOAL_LABELS[c.goal || "impressions"] || c.goal}
                </span>
                <span style={{ background: "#DBEAFE", color: S.primary, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                  {ADS_CTA_LABELS[c.cta_type || "learn_more"] || c.cta_type}
                </span>
                <span style={{ background: "#F1F5F9", color: S.textMuted, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                  {c.media_type === "video" ? "Video" : "Image"}
                </span>
                <span style={{ background: "#F1F5F9", color: S.textMuted, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                  {ADS_BILLING_LABELS[c.billing_model] || c.billing_model}
                </span>
              </div>

              {c.description && (
                <p style={{ fontSize: 12.5, color: S.textMuted, margin: "0 0 10px", lineHeight: 1.5 }}>{c.description}</p>
              )}

              {c.target_audience && (c.target_audience.countries?.length || c.target_audience.devices?.length || c.target_audience.interests?.length) && (
                <p style={{ fontSize: 11.5, color: S.textDim, margin: "0 0 10px", lineHeight: 1.5 }}>
                  <Users size={11} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                  {[c.target_audience.countries?.join(", "), c.target_audience.devices?.join(", "), c.target_audience.interests?.join(", ")].filter(Boolean).join(" · ")}
                </p>
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
                <span>Bid {formatMoney(c.bid_amount || 0, c.currency || "NGN")} · {ADS_BILLING_LABELS[c.billing_model] || c.billing_model}</span>
                <span style={{ fontWeight: 600, color: S.text }}>Daily {formatMoney(c.daily_budget || c.budget || 0, c.currency || "NGN")}</span>
              </div>
              <div style={{ fontSize: 12, color: S.textDim, marginBottom: 4 }}>
                Spent {formatMoney(computeCampaignSpend(c), c.currency || "NGN")} of {formatMoney(c.total_price, c.currency || "NGN")}
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
  revenue, campaigns, totalRevenue, topSources,
}: {
  revenue: RevenueEntry[]
  campaigns: Campaign[]
  totalRevenue: number
  topSources: { source: string; revenue: number; impressions: number }[]
}) {
  const totalImpressions = revenue.reduce((s, r) => s + (r.impressions || 0), 0)
  const totalClicks = revenue.reduce((s, r) => s + (r.clicks || 0), 0)
  const campaignImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0)
  const campaignClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0)
  const campaignSpend = campaigns.reduce((s, c) => s + computeCampaignSpend(c), 0)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
        {[
          { label: "Total Revenue", value: NGN(totalRevenue), color: S.green, bg: "#DCFCE7" },
          { label: "Campaign Spend", value: NGN(campaignSpend), color: S.primary, bg: "#DBEAFE" },
          { label: "Impressions", value: fmt(totalImpressions + campaignImpressions), color: S.purple, bg: "#EDE9FE" },
          { label: "Clicks", value: fmt(totalClicks + campaignClicks), color: S.amber, bg: "#FEF3C7" },
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
          <h3 style={{ fontSize: 16, fontWeight: 700, color: S.text, margin: 0 }}>Campaign Spend (auction revenue)</h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${S.border}`, background: S.input }}>
                {["Campaign", "Billing", "Impressions", "Clicks", "Spend", "Budget"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: S.textMuted, fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const spend = computeCampaignSpend(c)
                return (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${S.border}` }}>
                    <td style={{ padding: "12px 16px", color: S.text, fontSize: 13, fontWeight: 600 }}>{c.headline || c.advertiser_name}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: "#F1F5F9", color: S.textMuted, borderRadius: 6, padding: "2px 8px", fontSize: 11.5, fontWeight: 600 }}>{ADS_BILLING_LABELS[c.billing_model] || c.billing_model}</span>
                    </td>
                    <td style={{ padding: "12px 16px", color: S.text, fontSize: 13 }}>{fmt(c.impressions)}</td>
                    <td style={{ padding: "12px 16px", color: S.text, fontSize: 13 }}>{fmt(c.clicks)}</td>
                    <td style={{ padding: "12px 16px", color: S.green, fontSize: 13, fontWeight: 700 }}>{formatMoney(spend, c.currency || "NGN")}</td>
                    <td style={{ padding: "12px 16px", color: S.textMuted, fontSize: 13 }}>
                      {formatMoney(c.total_price, c.currency || "NGN")}
                      <FxApprox amount={Number(c.total_price || 0)} from={c.currency || "NGN"} className={`block ${S.textDim}`} />
                    </td>
                  </tr>
                )
              })}
              {campaigns.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: S.textDim }}>No campaigns yet — spend appears here as ads deliver</td></tr>
              )}
            </tbody>
          </table>
        </div>
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
  const fx = useFx()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Placement | null>(null)
  const [form, setForm] = useState({
    name: "", position: "", location: "site", description: "", ad_type: "banner",
    sizes: "728x90", min_bid_cpm: "500", min_bid_cpc: "50", supports_video: false,
    est_impressions: "0",
  })

  const startCreate = () => {
    setEditing(null)
    setForm({ name: "", position: "", location: "site", description: "", ad_type: "banner", sizes: "728x90", min_bid_cpm: "500", min_bid_cpc: "50", supports_video: false, est_impressions: "0" })
    setShowForm(true)
  }

  const startEdit = (p: Placement) => {
    setEditing(p)
    setForm({
      name: p.name, position: p.position, location: p.location, description: p.description || "",
      ad_type: p.ad_type, sizes: (p.sizes || []).join(", "),
      min_bid_cpm: String(p.min_bid_cpm), min_bid_cpc: String(p.min_bid_cpc), supports_video: !!p.supports_video,
      est_impressions: String(p.est_impressions),
    })
    setShowForm(true)
  }

  const save = async () => {
    const payload = {
      ...form,
      sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
      min_bid_cpm: parseFloat(form.min_bid_cpm) || 500,
      min_bid_cpc: parseFloat(form.min_bid_cpc) || 50,
      supports_video: form.supports_video,
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
        min_bid_cpm: p.min_bid_cpm, min_bid_cpc: p.min_bid_cpc,
        supports_video: p.supports_video,
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
          <p style={{ fontSize: 13, color: S.textMuted, margin: "3px 0 0" }}>Set minimum bids (floors), sizes and availability for each sellable ad space.</p>
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
                {["Ad Space", "Position", "Sizes", "Min CPM", "Min CPC", "Status", "Actions"].map((h) => (
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
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: S.text }}>{fx.format(p.min_bid_cpm, "NGN")}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: S.text }}>{fx.format(p.min_bid_cpc, "NGN")}</td>
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
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: S.textDim }}>No ad spaces yet</td></tr>
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
                  <option value="display">Display</option>
                  <option value="video">Video</option>
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
                <label style={labelStyle}>Min CPM bid (₦ / 1k impressions)</label>
                <input type="number" min={0} value={form.min_bid_cpm} onChange={(e) => setForm(f => ({ ...f, min_bid_cpm: e.target.value }))} placeholder="e.g. 500" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Min CPC bid (₦ / click)</label>
                <input type="number" min={0} value={form.min_bid_cpc} onChange={(e) => setForm(f => ({ ...f, min_bid_cpc: e.target.value }))} placeholder="e.g. 50" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Est. monthly impressions</label>
                <input type="number" value={form.est_impressions} onChange={(e) => setForm(f => ({ ...f, est_impressions: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 22 }}>
                <input
                  id="supports-video"
                  type="checkbox"
                  checked={form.supports_video}
                  onChange={(e) => setForm(f => ({ ...f, supports_video: e.target.checked }))}
                  style={{ width: 17, height: 17, cursor: "pointer" }}
                />
                <label htmlFor="supports-video" style={{ ...labelStyle, margin: 0, cursor: "pointer" }}>
                  Supports video ads
                </label>
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
