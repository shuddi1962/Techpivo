"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  ADS_CURRENCIES, ADS_GOALS, ADS_CTA_TYPES,
  ADS_AUDIENCE_COUNTRIES, ADS_AUDIENCE_DEVICES, ADS_AUDIENCE_INTERESTS,
  ADS_CTA_LABELS, formatMoney, DEFAULT_FX_RATES,
} from "@/lib/ads"

const S = {
  primary: "#0D9488",
  primaryDark: "#0F766E",
  border: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#475569",
  textDim: "#94A3B8",
  input: "#F8FAFC",
  bg: "#FFFFFF",
  overlay: "rgba(15,23,42,0.4)",
}

interface Placement {
  id: string
  name: string
  location: string
  position: string
  description: string | null
  ad_type: string
  sizes: string[]
  is_active: boolean
  min_bid_cpm: number
  min_bid_cpc: number
  supports_video: boolean
  est_impressions: number
  advertisers: number
}

let channelCounter = 0

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

const labelStyle: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 600, color: S.textMuted, display: "block", marginBottom: 6,
}

export default function AdvertisePage() {
  const router = useRouter()
  const [placements, setPlacements] = useState<Placement[]>([])
  const [fxRates, setFxRates] = useState<Record<string, number>>(DEFAULT_FX_RATES)
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState("NGN")
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  // campaign settings
  const [placementId, setPlacementId] = useState<string | null>(null)
  const [billingModel, setBillingModel] = useState<"cpm" | "cpc">("cpm")
  const [bidAmount, setBidAmount] = useState("")
  const [dailyBudget, setDailyBudget] = useState("")
  const [durationDays, setDurationDays] = useState(7)
  const [goal, setGoal] = useState("clicks")
  const [ctaType, setCtaType] = useState("learn_more")
  const [brand, setBrand] = useState("")
  const [headline, setHeadline] = useState("")
  const [cta, setCta] = useState("Learn More")
  const [description, setDescription] = useState("")
  const [destinationUrl, setDestinationUrl] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [email, setEmail] = useState("")
  const [mediaType, setMediaType] = useState<"image" | "video">("image")
  const [videoUrl, setVideoUrl] = useState("")
  const [posterUrl, setPosterUrl] = useState("")
  const [countries, setCountries] = useState<string[]>([])
  const [devices, setDevices] = useState<string[]>([])
  const [interests, setInterests] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabaseRef = useRef(createClient())

  const load = useCallback(async () => {
    try {
      const supabase = supabaseRef.current
      const [pl, fx] = await Promise.all([
        supabase.from("ad_placements").select("*").eq("is_active", true).order("min_bid_cpm", { ascending: false }),
        supabase.from("site_settings").select("value").eq("key", "fx_rates").maybeSingle(),
      ])
      if (pl.data) setPlacements(pl.data)
      const fxVal = fx.data?.value
      if (fxVal && typeof fxVal === "object") setFxRates({ ...DEFAULT_FX_RATES, ...fxVal })
    } catch (e) {
      console.error("Failed to load ad placements:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const supabase = supabaseRef.current
    load()
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user))

    const channel = supabase.channel(`advertise_placements_${++channelCounter}`)
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_placements" }, () => load())
      .subscribe()

    const poll = setInterval(load, 60000)
    return () => {
      channel.unsubscribe().then(() => supabase.removeChannel(channel))
      clearInterval(poll)
    }
  }, [load])

  const placement = placements.find((p) => p.id === placementId) || null
  const fx = Number(fxRates[currency] || 1) || 1

  // Auction math — bid must clear the placement's NGN floor (converted to chosen currency)
  const floorNGN = billingModel === "cpc" ? (placement?.min_bid_cpc ?? 50) : (placement?.min_bid_cpm ?? 500)
  const floorInCurrency = Math.round((floorNGN / fx) * 100) / 100
  const bid = parseFloat(bidAmount) || 0
  const budget = parseFloat(dailyBudget) || 0
  const bidNGN = bid * fx
  const bidOk = bid > 0 && bidNGN >= floorNGN
  const budgetOk = budget >= bid
  const days = Math.max(1, Math.min(90, Math.floor(durationDays) || 1))
  const total = Math.round(budget * days * 100) / 100
  const estReach = placement ? Math.round((placement.est_impressions / 30) * days) : 0

  const toggleChip = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((c) => c !== value) : [...list, value])
  }

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    window.setTimeout(() => setMessage(null), 7000)
  }

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
      showMsg("error", e.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const generateCreative = async () => {
    if (!brand.trim()) { showMsg("error", "Enter your brand name first so the AI can write for it"); return }
    setGenerating(true)
    try {
      const res = await fetch("/admin/ads/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-creative",
          placement_id: placement?.id || null,
          brand: brand.trim(),
          goal,
          audience_hint: [countries.join(", "), devices.join(", "), interests.join(", ")].filter(Boolean).join(" · ") || "tech enthusiasts",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Generation failed")
      setHeadline(data.creative.headline)
      setDescription(data.creative.description)
      setCtaType(data.creative.cta_type)
      setCta(ADS_CTA_LABELS[data.creative.cta_type] || "Learn More")
      showMsg("success", "AI creative generated — review and tweak below")
    } catch (e: any) {
      showMsg("error", e.message || "AI generation failed")
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async () => {
    if (!signedIn) {
      window.location.href = "/login?next=/advertise"
      return
    }
    if (!placement) { showMsg("error", "Select an ad space"); return }
    if (!bidOk) { showMsg("error", `Your ${billingModel.toUpperCase()} bid must be at least ${formatMoney(floorInCurrency, currency)} for this space`); return }
    if (!budgetOk) { showMsg("error", "Daily budget must be at least your bid amount"); return }
    if (!brand.trim() || !headline.trim() || !destinationUrl.trim()) {
      showMsg("error", "Brand name, headline and destination URL are required")
      return
    }
    if (mediaType === "video") {
      if (!placement.supports_video) { showMsg("error", "This ad space does not support video ads"); return }
      if (!videoUrl.trim()) { showMsg("error", "Video URL is required for video ads"); return }
    } else if (!imageUrl.trim()) {
      showMsg("error", "Upload or paste a banner image for your ad")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/admin/ads/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          placement_id: placement.id,
          billing_model: billingModel,
          bid_amount: bid,
          daily_budget: budget,
          duration_days: days,
          currency,
          goal,
          cta_type: ctaType,
          advertiser_name: brand.trim(),
          advertiser_email: email.trim() || null,
          headline: headline.trim(),
          cta_text: cta.trim() || "Learn More",
          description: description.trim(),
          destination_url: destinationUrl.trim(),
          ad_image_url: mediaType === "image" ? imageUrl.trim() || null : null,
          target_audience: { countries, devices, interests },
          media_type: mediaType,
          video_url: mediaType === "video" ? videoUrl.trim() || null : null,
          poster_url: mediaType === "video" ? posterUrl.trim() || null : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create campaign")
      if (data.campaign?.id) {
        router.push(`/account/ads/${data.campaign.id}`)
        return
      }
      setBrand(""); setHeadline(""); setDescription(""); setDestinationUrl(""); setImageUrl(""); setVideoUrl(""); setPosterUrl("")
      setCountries([]); setDevices([]); setInterests([])
      showMsg("success", data.message || "Campaign submitted! Our team will approve it within 24 hours.")
      document.getElementById("placements")?.scrollIntoView({ behavior: "smooth" })
    } catch (e: any) {
      showMsg("error", e.message || "Failed to create campaign")
    } finally {
      setSubmitting(false)
    }
  }

  const pickPlacement = (p: Placement) => {
    setPlacementId(p.id)
    if (!p.supports_video && mediaType === "video") {
      setMediaType("image")
    }
    document.getElementById("order")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="w-full">
      {/* Hero */}
      <div className="relative overflow-hidden mb-12 min-h-[340px] flex items-center">
        <Image src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg" alt="Advertise with us" width={1200} height={675} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative z-10 px-6 md:px-12 lg:px-16 py-16 text-white max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/25 rounded-full px-4 py-1.5 text-sm mb-5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Self-serve ad marketplace — your budget, your bid
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Advertise With Us</h1>
          <p className="text-lg text-white/85 max-w-2xl">
            Put your brand in front of developers, IT pros and gadget buyers. Pick an ad space,
            set your own daily budget and bid — no fixed fees, approved within 24 hours.
          </p>
          <div className="flex flex-wrap gap-3 mt-7">
            <a
              href="#placements"
              style={{ background: S.primary, borderRadius: 10, padding: "12px 24px", fontWeight: 600, fontSize: 14.5, color: "#fff", textDecoration: "none" }}
            >
              Browse Ad Spaces
            </a>
            <a
              href="#order"
              style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 10, padding: "12px 24px", fontWeight: 600, fontSize: 14.5, color: "#fff", textDecoration: "none" }}
            >
              Start Your Campaign
            </a>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-12 lg:px-16 pb-16">
        {/* Trust stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "20,000+", desc: "Monthly tech readers" },
            { label: "11", desc: "Content categories" },
            { label: "24h", desc: "Approval turnaround" },
            { label: "10", desc: "Currencies supported" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border rounded-xl p-6 text-center">
              <div className="font-bold text-2xl mb-1" style={{ color: S.primary }}>{stat.label}</div>
              <div className="text-sm text-muted-foreground">{stat.desc}</div>
            </div>
          ))}
        </div>

        {/* Currency selector */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <h2 id="placements" className="text-2xl font-bold" style={{ scrollMarginTop: 100 }}>Available Ad Spaces</h2>
            <p className="text-sm text-muted-foreground">Minimum bids per space, updated live in your currency. You decide what you pay.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: S.textMuted }}>Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ ...inputStyle, width: 240, cursor: "pointer" }}>
              {ADS_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Placements grid (realtime) */}
        {loading ? (
          <div style={{ border: `1px dashed ${S.border}`, borderRadius: 14, padding: 60, textAlign: "center", color: S.textDim }}>
            Loading ad spaces...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
            {placements.map((p) => {
              const floor = billingModel === "cpc" ? p.min_bid_cpc : p.min_bid_cpm
              const floorCur = Math.round((floor / fx) * 100) / 100
              const selected = p.id === placementId
              return (
                <div
                  key={p.id}
                  onClick={() => pickPlacement(p)}
                  style={{
                    background: S.bg, border: selected ? `2px solid ${S.primary}` : `1px solid ${S.border}`,
                    borderRadius: 14, padding: 20, cursor: "pointer", transition: "box-shadow 0.2s, border 0.2s",
                    boxShadow: selected ? `0 4px 20px rgba(13,148,136,0.15)` : "0 1px 3px rgba(15,23,42,0.05)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: S.text, margin: 0 }}>{p.name}</h3>
                      <span style={{ fontSize: 12, color: S.textDim, textTransform: "capitalize" }}>{p.location}</span>
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                      {p.supports_video && (
                        <span style={{ background: "#DCFCE7", color: "#16A34A", borderRadius: 6, padding: "2px 8px", fontSize: 10.5, fontWeight: 700 }}>VIDEO</span>
                      )}
                      <span style={{ background: "#F1F5F9", color: S.textMuted, borderRadius: 6, padding: "2px 8px", fontSize: 10.5, fontWeight: 700, fontFamily: "ui-monospace, monospace" }}>
                        {(Array.isArray(p.sizes) && p.sizes[0]) || "300x250"}
                      </span>
                    </div>
                  </div>

                  {p.description && (
                    <p style={{ fontSize: 12.5, color: S.textMuted, margin: "0 0 12px", lineHeight: 1.55 }}>{p.description}</p>
                  )}

                  <div style={{ display: "flex", gap: 8, background: S.input, borderRadius: 10, padding: "10px 12px", marginBottom: 12, alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: S.text }}>From {formatMoney(floorCur, currency)}</div>
                      <div style={{ fontSize: 11, color: S.textDim }}>min {billingModel.toUpperCase()} bid</div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: S.textMuted, whiteSpace: "nowrap" }}>
                      ~{Number(p.est_impressions).toLocaleString()} reach/mo
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: S.textDim }}>
                      {p.advertisers || 0} advertisers running
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: S.primary }}>
                      {selected ? "✓ Selected" : "Select →"}
                    </span>
                  </div>
                </div>
              )
            })}
            {placements.length === 0 && (
              <div style={{ gridColumn: "1 / -1", border: `1px dashed ${S.border}`, borderRadius: 14, padding: 60, textAlign: "center", color: S.textDim }}>
                No ad spaces available right now — check back soon.
              </div>
            )}
          </div>
        )}

        {/* Order form */}
        <div id="order" style={{ scrollMarginTop: 100, marginBottom: 16 }}>
          <h2 className="text-2xl font-bold mb-1">Build Your Campaign</h2>
          <p className="text-sm text-muted-foreground mb-6">Pick a space above or choose one here — set your bid, budget and duration.</p>
        </div>

        {message && (
          <div style={{
            background: message.type === "success" ? "#DCFCE7" : "#FEE2E2",
            border: `1px solid ${message.type === "success" ? "#86EFAC" : "#FECACA"}`,
            color: message.type === "success" ? "#166534" : "#991B1B",
            borderRadius: 10, padding: "12px 16px", fontSize: 13.5, fontWeight: 500, marginBottom: 18,
          }}>
            {message.text}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 20, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Placement */}
            <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 14, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: S.text, margin: "0 0 12px" }}>1 · Ad space</h3>
              {placement ? (
                <div style={{ background: S.input, borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: S.text }}>{placement.name}</div>
                    <div style={{ fontSize: 12, color: S.textDim }}>min {formatMoney(Math.round((floorNGN / fx) * 100) / 100, currency)} {billingModel.toUpperCase()} · ~{Number(placement.est_impressions).toLocaleString()} reach/mo</div>
                  </div>
                  <button onClick={() => setPlacementId(null)} style={{ background: "none", border: `1px solid ${S.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12.5, color: S.textMuted, cursor: "pointer" }}>
                    Change
                  </button>
                </div>
              ) : (
                <div style={{ color: S.textDim, fontSize: 13.5 }}>Select an ad space from the grid above.</div>
              )}
            </div>

            {/* Budget & bidding */}
            <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 14, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: S.text, margin: "0 0 12px" }}>2 · Budget, bid &amp; audience</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>How do you want to pay?</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["cpm", "cpc"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setBillingModel(m)}
                        style={{
                          flex: 1, padding: "10px 12px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
                          background: billingModel === m ? S.primary : "#fff",
                          color: billingModel === m ? "#fff" : S.textMuted,
                          border: billingModel === m ? `1px solid ${S.primary}` : `1px solid ${S.border}`,
                        }}
                      >
                        {m.toUpperCase()}
                        <span style={{ display: "block", fontSize: 10.5, fontWeight: 500, opacity: 0.85 }}>
                          {m === "cpm" ? "per 1,000 impressions" : "per click"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Currency</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                    {ADS_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Bid amount ({billingModel.toUpperCase()})</label>
                  <input
                    type="number"
                    min={0}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={placement ? `Min ${formatMoney(floorInCurrency, currency)}` : "Select an ad space first"}
                    disabled={!placement}
                    style={inputStyle}
                  />
                  {placement && (
                    <p style={{ fontSize: 11.5, margin: "6px 0 0", color: bidOk ? "#16A34A" : "#D97706" }}>
                      Minimum bid for this space: {formatMoney(floorInCurrency, currency)} ({floorNGN.toLocaleString()}₦)
                    </p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Daily budget ({currency})</label>
                  <input
                    type="number"
                    min={0}
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(e.target.value)}
                    placeholder="e.g. 5000"
                    style={inputStyle}
                  />
                  {bid > 0 && (
                    <p style={{ fontSize: 11.5, margin: "6px 0 0", color: budgetOk ? "#16A34A" : "#D97706" }}>
                      {budgetOk ? "Covers your bid" : `Must be at least your bid (${formatMoney(bid, currency)})`}
                    </p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Duration (days)</label>
                  <input type="number" min={1} max={90} value={durationDays} onChange={(e) => setDurationDays(parseInt(e.target.value) || 7)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Campaign goal</label>
                  <select value={goal} onChange={(e) => setGoal(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                    {ADS_GOALS.map((g) => (
                      <option key={g.value} value={g.value}>{g.icon} {g.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Call to action</label>
                  <select value={ctaType} onChange={(e) => { setCtaType(e.target.value); setCta(ADS_CTA_LABELS[e.target.value] || e.target.value) }} style={{ ...inputStyle, cursor: "pointer" }}>
                    {ADS_CTA_TYPES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 16, borderTop: `1px solid ${S.border}`, paddingTop: 14 }}>
                <label style={labelStyle}>Target audience (optional)</label>
                {[
                  { label: "Countries", list: countries, set: setCountries, options: ADS_AUDIENCE_COUNTRIES },
                  { label: "Devices", list: devices, set: setDevices, options: [...ADS_AUDIENCE_DEVICES] as string[] },
                  { label: "Interests", list: interests, set: setInterests, options: [...ADS_AUDIENCE_INTERESTS] as string[] },
                ].map((group) => (
                  <div key={group.label} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: S.textMuted, marginBottom: 6 }}>
                      {group.label} — <span style={{ color: S.textDim, fontWeight: 500 }}>{group.list.length ? group.list.join(", ") : "All"}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {group.options.map((opt) => {
                        const active = group.list.includes(opt)
                        return (
                          <button
                            key={opt}
                            onClick={() => toggleChip(group.list, group.set, opt)}
                            style={{
                              padding: "5px 11px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                              background: active ? S.primary : "#fff",
                              color: active ? "#fff" : S.textMuted,
                              border: active ? `1px solid ${S.primary}` : `1px solid ${S.border}`,
                            }}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Creative */}
            <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: S.text, margin: 0 }}>3 · Your ad creative</h3>
                <button
                  onClick={generateCreative}
                  disabled={generating}
                  style={{
                    background: "#F5F3FF", color: "#7C3AED", border: "1px solid #DDD6FE", borderRadius: 9,
                    padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", opacity: generating ? 0.6 : 1,
                  }}
                >
                  ✨ {generating ? "Writing..." : "AI Generate Creative"}
                </button>
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

              {/* Media type */}
              <div style={{ marginTop: 14 }}>
                <label style={labelStyle}>Creative type</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setMediaType("image")}
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
                      background: mediaType === "image" ? S.primary : "#fff",
                      color: mediaType === "image" ? "#fff" : S.textMuted,
                      border: mediaType === "image" ? `1px solid ${S.primary}` : `1px solid ${S.border}`,
                    }}
                  >
                    🖼 Image banner
                  </button>
                  <button
                    onClick={() => setMediaType("video")}
                    disabled={!placement?.supports_video}
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 10, cursor: placement?.supports_video ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600,
                      background: mediaType === "video" ? S.primary : "#fff",
                      color: mediaType === "video" ? "#fff" : placement?.supports_video ? S.textMuted : S.textDim,
                      border: mediaType === "video" ? `1px solid ${S.primary}` : `1px solid ${S.border}`,
                      opacity: placement?.supports_video ? 1 : 0.55,
                    }}
                  >
                    🎬 Video ad
                  </button>
                </div>
                {!placement?.supports_video && mediaType === "video" && (
                  <p style={{ fontSize: 12, color: S.textDim, margin: "8px 0 0" }}>Select a video-capable ad space (marked VIDEO) to enable video ads.</p>
                )}
              </div>

              {mediaType === "video" ? (
                <div style={{ marginTop: 14 }}>
                  <label style={labelStyle}>Video URL (MP4 / WebM) *</label>
                  <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://cdn.example.com/ad.mp4" style={inputStyle} />
                  <div style={{ marginTop: 10 }}>
                    <label style={labelStyle}>Poster image URL (thumbnail, optional)</label>
                    <input value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} placeholder="https://cdn.example.com/poster.jpg" style={inputStyle} />
                  </div>
                  <p style={{ fontSize: 12, color: S.textDim, margin: "8px 0 0" }}>Recommended max 30s, MP4/WebM, ~5MB.</p>
                </div>
              ) : (
                <div style={{ marginTop: 14 }}>
                  <label style={labelStyle}>Banner image *</label>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Paste image URL or upload" style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ background: S.input, color: S.textMuted, border: `1px solid ${S.border}`, borderRadius: 10, padding: "9px 16px", cursor: "pointer", fontSize: 13 }}>
                      {uploading ? "Uploading..." : "Upload"}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
                  </div>
                  {imageUrl && (
                    <div style={{ marginTop: 10, border: `1px solid ${S.border}`, borderRadius: 10, overflow: "hidden", maxWidth: 420, background: S.input }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="Ad preview" style={{ width: "100%", height: "auto", display: "block" }} />
                    </div>
                  )}
                  <p style={{ fontSize: 12, color: S.textDim, margin: "8px 0 0" }}>Recommended: 728x90, 300x250 or 336x280. PNG/JPG, max 2MB.</p>
                </div>
              )}

              <div style={{ marginTop: 14 }}>
                <label style={labelStyle}>Contact email (optional)</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 14, padding: 20, position: "sticky", top: 100 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: S.text, margin: "0 0 14px" }}>Campaign Summary</h3>
            {!placement ? (
              <p style={{ color: S.textDim, fontSize: 13.5, margin: 0 }}>Select an ad space to see your campaign plan.</p>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                  <SummaryRow label="Ad space" value={placement.name} />
                  <SummaryRow label="Billing" value={`${billingModel.toUpperCase()} ${billingModel === "cpm" ? "(1,000 imps)" : "(per click)"}`} />
                  <SummaryRow label="Bid" value={formatMoney(bid, currency)} />
                  <SummaryRow label="Daily budget" value={formatMoney(budget, currency)} />
                  <SummaryRow label="Duration" value={`${days} day${days > 1 ? "s" : ""}`} />
                  <SummaryRow label="Goal" value={ADS_GOALS.find((g) => g.value === goal)?.label || goal} />
                  <SummaryRow label="CTA" value={ADS_CTA_LABELS[ctaType] || cta} />
                  {(countries.length > 0 || devices.length > 0 || interests.length > 0) && (
                    <SummaryRow label="Audience" value={[countries.join(", "), devices.join(", "), interests.join(", ")].filter(Boolean).slice(0, 2).join(" · ")} />
                  )}
                </div>
                <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: S.text }}>Total budget</span>
                    <span style={{ fontSize: 24, fontWeight: 800, color: S.primary }}>{formatMoney(total, currency)}</span>
                  </div>
                  <p style={{ fontSize: 12, color: S.textDim, margin: "6px 0 14px" }}>~{Number(estReach).toLocaleString()} estimated impressions · you only pay for what delivers, up to your daily cap</p>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    width: "100%", padding: "13px 20px", fontSize: 15, fontWeight: 700, borderRadius: 10, cursor: "pointer",
                    background: S.primary, color: "#fff", border: "none", opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? "Submitting..." : signedIn ? `Submit Campaign in ${currency}` : "Sign in to launch campaign"}
                </button>
                {!signedIn && (
                  <p style={{ fontSize: 12, color: S.textDim, margin: "10px 0 0", textAlign: "center" }}>
                    <Link href="/login?next=/advertise" style={{ color: S.primary, fontWeight: 600 }}>Sign in</Link> or{" "}
                    <Link href="/signup" style={{ color: S.primary, fontWeight: 600 }}>create a free account</Link> to launch.
                  </p>
                )}
                <p style={{ fontSize: 11.5, color: S.textDim, margin: "10px 0 0", textAlign: "center", lineHeight: 1.5 }}>
                  Our team reviews every campaign within 24 hours before it goes live. No payment is taken at this stage.
                </p>
              </>
            )}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-16 mb-14">
          <h2 className="text-2xl font-bold mb-6">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {[
              { step: "1", title: "Pick an ad space", desc: "Browse placements — leaderboards, sidebars, in-content and video units. Each shows its minimum bid." },
              { step: "2", title: "Set budget & bid", desc: "Choose currency, your bid (CPM or CPC), daily budget, duration, campaign goal and target audience." },
              { step: "3", title: "Submit creative", desc: "Upload your banner or video — or let our AI write the ad copy for you in one click." },
              { step: "4", title: "Approved & live", desc: "Our team reviews within 24 hours. Once approved, your ad starts serving with live stats in your account." },
            ].map((s) => (
              <div key={s.step} className="bg-card border rounded-xl p-6">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mb-3" style={{ background: S.primary }}>{s.step}</div>
                <h3 className="font-bold mb-1.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-card border rounded-2xl p-8 mb-14">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-5">
            {[
              { q: "How does bidding work?", a: "Each ad space has a minimum bid (CPM — per 1,000 impressions — or CPC — per click). You set a bid at or above that floor, plus a daily budget that covers it. Higher bids win more delivery; you only pay for what actually serves, up to your daily cap." },
              { q: "When do I pay?", a: "No payment is collected when you submit. Our team reviews your campaign and confirms it before we arrange payment — usually within 24 hours." },
              { q: "Which currencies do you support?", a: "We support NGN, USD, EUR, GBP, GHS, KES, ZAR, CAD, AUD and INR. Minimum bids are converted live at published rates when you set up your campaign." },
              { q: "Can I run video ads?", a: "Yes. Ad spaces marked VIDEO support video creatives (MP4/WebM, max 30s recommended). Upload the video URL and an optional poster image." },
              { q: "What targeting options are available?", a: "You can request targeting by country, device and interest (category). We apply it best-effort when your campaign goes live." },
              { q: "Can I see my campaign performance?", a: "Every campaign tracks impressions, clicks, CTR and spend in real time — with a 14-day performance chart in your account, plus Pause/Resume whenever you like." },
              { q: "What if my creative is rejected?", a: "We'll send you the reason and you can fix and resubmit. Common issues: low-res images, misleading claims or off-topic content." },
            ].map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold mb-1" style={{ color: S.text }}>{f.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <section className="rounded-2xl p-10 text-center text-white" style={{ background: "linear-gradient(120deg, #0F766E 0%, #0D9488 60%, #14B8A6 100%)" }}>
          <h2 className="text-2xl font-bold mb-3">Ready to Get Started?</h2>
          <p className="mb-6 opacity-90">Launch your campaign in minutes — or talk to our ads team for a custom proposal.</p>
          <div className="flex justify-center gap-3 flex-wrap">
            <a href="#placements" className="inline-flex items-center bg-white font-semibold px-6 py-3 rounded-lg" style={{ color: S.primaryDark }}>
              Browse Ad Spaces
            </a>
            <a href="mailto:ads@techpivo.com" className="inline-flex items-center border border-white/40 px-6 py-3 rounded-lg font-medium hover:bg-white/10 transition-colors">
              ads@techpivo.com
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={{ fontSize: 13, color: S.textMuted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: S.text, textAlign: "right" }}>{value}</span>
    </div>
  )
}
