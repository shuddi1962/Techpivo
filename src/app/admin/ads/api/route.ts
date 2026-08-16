import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@/lib/supabase/admin"
import { DEFAULT_FX_RATES, computeCampaignSpend } from "@/lib/ads"
import { getFxRatesPerNgn } from "@/lib/fx"

async function requireRole(allowed: string[] = ["admin", "editor"]) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" as const, status: 401 }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (!profile || !allowed.includes(profile.role)) return { error: "Forbidden" as const, status: 403 }
  return { supabase, user, profile }
}

// FX map: NGN per 1 unit of each currency — LIVE rates first (cached 6h), then site_settings overrides, then defaults
async function getFxRates(supabase: any): Promise<Record<string, number>> {
  let live: Record<string, number> = {}
  try {
    const { rates } = await getFxRatesPerNgn()
    live = rates
  } catch { /* live provider unreachable — fall through */ }
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "fx_rates")
      .maybeSingle()
    if (data?.value && typeof data.value === "object") {
      // site_settings acts as manual override on top of live rates
      return { ...DEFAULT_FX_RATES, ...live, ...data.value }
    }
  } catch (e) {
    console.error("Failed to load fx_rates:", e)
  }
  return { ...DEFAULT_FX_RATES, ...live }
}

const formatNGN = (n: number) => "₦" + Math.round(Number(n || 0)).toLocaleString()

async function generateCreative(
  placementName: string,
  brand: string,
  goal: string,
  audienceHint: string
) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const prompt = [
    "You are an expert digital ad copywriter for a technology news website called Techpivo.",
    "Create ONE high-performing display ad creative. Respond with STRICT JSON only, no markdown:",
    '{"headline":"...max 40 chars...","description":"...one punchy sentence, max 90 chars...","cta_type":"learn_more|buy_now|get_started|sign_up|subscribe|download|book_now|contact_us|try_free|shop_now|watch_video|read_more|apply_now|call_now"}',
    `Ad placement: ${placementName}`,
    `Advertiser: ${brand || "the advertiser"}`,
    `Campaign goal: ${goal || "more clicks"}`,
    `Audience: ${audienceHint || "tech enthusiasts"}`,
    "Rules: natural, benefit-led, no hype, no emojis in headline, CTA must match the goal.",
  ].join("\n")

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 200 },
    }),
  })
  if (!res.ok) return null
  const json = await res.json()
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return null
  try {
    const match = text.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(match ? match[0] : text)
    const validCtas = ["learn_more", "buy_now", "get_started", "sign_up", "subscribe", "download", "book_now", "contact_us", "try_free", "shop_now", "watch_video", "read_more", "apply_now", "call_now"]
    return {
      headline: String(parsed.headline || "").slice(0, 60),
      description: String(parsed.description || "").slice(0, 160),
      cta_type: validCtas.includes(parsed.cta_type) ? parsed.cta_type : "learn_more",
    }
  } catch (e) {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const section = searchParams.get("section") || "overview"
  const supabase = createClient()

  try {
    if (section === "placements") {
      const fx = await getFxRates(supabase)
      const { data } = await supabase
        .from("ad_placements")
        .select("*")
        .order("min_bid_cpm", { ascending: false })
      return NextResponse.json({ placements: data || [], fx_rates: fx })
    }

    if (section === "campaigns") {
      const { data: campaigns } = await supabase
        .from("ad_campaigns")
        .select("*, placements:ad_placements(name, position, ad_type, min_bid_cpm, min_bid_cpc, sizes)")
        .order("created_at", { ascending: false })
        .limit(100)
      return NextResponse.json({ campaigns: campaigns || [] })
    }

    if (section === "revenue") {
      const { data } = await supabase
        .from("ad_revenue")
        .select("*")
        .order("date", { ascending: false })
        .limit(100)
      return NextResponse.json({ revenue: data || [] })
    }

    if (section === "analytics") {
      const days = 30
      const fromIso = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10)

      const [{ data: dailyStats }, { data: revenueRows }] = await Promise.all([
        supabase
          .from("ad_campaign_daily_stats")
          .select("stat_date, impressions, clicks")
          .gte("stat_date", fromIso),
        supabase
          .from("ad_revenue")
          .select("date, impressions, clicks, revenue")
          .gte("date", fromIso),
      ])

      const dailyMap: Record<string, { date: string; label: string; impressions: number; clicks: number; revenue: number }> = {}
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000)
        const key = d.toISOString().slice(0, 10)
        dailyMap[key] = { date: key, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), impressions: 0, clicks: 0, revenue: 0 }
      }
      ;(dailyStats || []).forEach((r: any) => {
        const key = String(r.stat_date).slice(0, 10)
        if (dailyMap[key]) {
          dailyMap[key].impressions += r.impressions || 0
          dailyMap[key].clicks += r.clicks || 0
        }
      })
      ;(revenueRows || []).forEach((r: any) => {
        const key = String(r.date).slice(0, 10)
        if (dailyMap[key]) dailyMap[key].revenue += Number(r.revenue || 0)
      })

      const { data: campaigns } = await supabase
        .from("ad_campaigns")
        .select("id, advertiser_name, headline, status, impressions, clicks, billing_model, bid_amount, spend, placement_id, placements:ad_placements(name)")
        .order("impressions", { ascending: false })
        .limit(8)

      const topCampaigns = (campaigns || []).map((c: any) => ({
        id: c.id,
        name: c.headline || c.advertiser_name,
        advertiser: c.advertiser_name,
        status: c.status,
        impressions: c.impressions || 0,
        clicks: c.clicks || 0,
        ctr: (c.impressions || 0) > 0 ? ((c.clicks || 0) / (c.impressions || 0)) * 100 : 0,
        spend: computeCampaignSpend(c),
      }))

      const placementMap: Record<string, { name: string; impressions: number; clicks: number }> = {}
      ;(campaigns || []).forEach((c: any) => {
        const key = c.placement_id || "unassigned"
        const pname = c.placements?.name || "Unassigned"
        if (!placementMap[key]) placementMap[key] = { name: pname, impressions: 0, clicks: 0 }
        placementMap[key].impressions += c.impressions || 0
        placementMap[key].clicks += c.clicks || 0
      })
      const placementStats = Object.values(placementMap).sort((a, b) => b.impressions - a.impressions)

      return NextResponse.json({ daily: Object.values(dailyMap), top_campaigns: topCampaigns, placement_stats: placementStats })
    }

    // overview / marketplace stats
    const [placementsRes, campaignsRes, revenueRes] = await Promise.all([
      supabase.from("ad_placements").select("id, is_active, price_per_day, cpm, est_impressions, advertisers"),
      supabase.from("ad_campaigns").select("id, status, is_active, impressions, clicks, total_price, spend"),
      supabase.from("ad_revenue").select("impressions, clicks, revenue, source"),
    ])

    const placements = placementsRes.data || []
    const campaigns = campaignsRes.data || []
    const revenueRows = revenueRes.data || []

    const liveCampaigns = campaigns.filter((c) => c.status === "live" || c.status === "approved")
    const pendingCount = campaigns.filter((c) => c.status === "pending").length

    const totalImpressions = revenueRows.reduce((s, r) => s + (r.impressions || 0), 0)
    const totalClicks = revenueRows.reduce((s, r) => s + (r.clicks || 0), 0)
    const totalRevenue = revenueRows.reduce((s, r) => s + Number(r.revenue || 0), 0)
    const adRevenue = revenueRows
      .filter((r) => r.source !== "direct")
      .reduce((s, r) => s + Number(r.revenue || 0), 0)
    const directRevenue = revenueRows
      .filter((r) => r.source === "direct")
      .reduce((s, r) => s + Number(r.revenue || 0), 0)

    const campaignImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0)
    const campaignClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0)
    const totalImpressionsAll = totalImpressions + campaignImpressions
    const totalClicksAll = totalClicks + campaignClicks

    const sourceMap: Record<string, { revenue: number; impressions: number }> = {}
    for (const r of revenueRows) {
      const src = r.source || "other"
      if (!sourceMap[src]) sourceMap[src] = { revenue: 0, impressions: 0 }
      sourceMap[src].revenue += Number(r.revenue || 0)
      sourceMap[src].impressions += r.impressions || 0
    }
    const topSources = Object.entries(sourceMap)
      .map(([source, d]) => ({ source, ...d }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    const livePlacements = placements.filter((p) => p.is_active)

    return NextResponse.json({
      overview: {
        total_revenue: totalRevenue,
        ad_revenue: adRevenue,
        direct_revenue: directRevenue,
        total_impressions: totalImpressionsAll,
        total_clicks: totalClicksAll,
        avg_ctr: totalImpressionsAll > 0 ? (totalClicksAll / totalImpressionsAll) * 100 : 0,
        live_campaigns: liveCampaigns.length,
        pending_campaigns: pendingCount,
        total_campaigns: campaigns.length,
        active_placements: livePlacements.length,
        available_placements: placements.length,
        est_monthly_reach: livePlacements.reduce((s, p) => s + (p.est_impressions || 0), 0),
        top_sources: topSources,
      },
    })
  } catch (error) {
    console.error("Ads API GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = createClient()
  const body = await request.json()
  const { action } = body

  try {
    // ---- Create campaign (any authenticated user) — Google/Meta Ads style: set your own budget + bid ----
    if (action === "order" || action === "create") {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: "Please sign in to create a campaign" }, { status: 401 })

      const { placement_id, billing_model, daily_budget, bid_amount, duration_days, advertiser_name, headline, description, cta_text, destination_url, ad_image_url, advertiser_email,
        currency, goal, cta_type, target_audience, media_type, video_url, poster_url, content_url } = body

      if (!placement_id) return NextResponse.json({ error: "Select an ad space" }, { status: 400 })
      if (!advertiser_name || !headline || !destination_url) {
        return NextResponse.json({ error: "Brand name, headline and destination URL are required" }, { status: 400 })
      }

      const { data: placement } = await supabase
        .from("ad_placements")
        .select("id, name, position, ad_type, min_bid_cpm, min_bid_cpc, supports_video, est_impressions")
        .eq("id", placement_id)
        .eq("is_active", true)
        .maybeSingle()
      if (!placement) return NextResponse.json({ error: "Ad space not available" }, { status: 400 })

      // Sponsored article placements require a content URL (destination falls back to it)
      if (placement.ad_type === "sponsored_article") {
        if (!content_url || !/^https?:\/\/.+/i.test(String(content_url).trim())) {
          return NextResponse.json({ error: "A valid article URL is required for sponsored article placements" }, { status: 400 })
        }
      }

      const model = billing_model === "cpc" ? "cpc" : "cpm"
      const cur = String(currency || "NGN").toUpperCase()
      const fx = await getFxRates(supabase)
      const fxRate = Number(fx[cur] || 1) || 1

      // Bid must respect the placement's minimum floor (converted to the chosen currency)
      const floorNGN = model === "cpc" ? Number(placement.min_bid_cpc || 50) : Number(placement.min_bid_cpm || 500)
      const bid = Math.max(0, Number(bid_amount || 0))
      const bidNGN = bid * fxRate
      if (bidNGN < floorNGN) {
        const floorLabel = formatNGN(floorNGN)
        return NextResponse.json({
          error: model === "cpc"
            ? `Minimum CPC bid for this space is ${floorLabel} (₦${floorNGN.toLocaleString()})`
            : `Minimum CPM bid for this space is ${floorLabel} (₦${floorNGN.toLocaleString()})`,
        }, { status: 400 })
      }

      // Budget must at least cover one billing unit of the bid
      const budget = Math.max(0, Number(daily_budget || 0))
      const minBudget = bid
      if (budget < minBudget) {
        return NextResponse.json({ error: `Daily budget must be at least ${formatNGN(minBudget * fxRate)} to cover your bid` }, { status: 400 })
      }
      if (budget > 500000) {
        return NextResponse.json({ error: "Daily budget looks too high — contact support for large campaigns" }, { status: 400 })
      }

      // Validate video creative
      const isVideo = media_type === "video"
      if (isVideo && !placement.supports_video) {
        return NextResponse.json({ error: "This ad space does not support video ads" }, { status: 400 })
      }
      if (isVideo && !video_url) {
        return NextResponse.json({ error: "Video URL is required for video ads" }, { status: 400 })
      }

      const days = Math.min(90, Math.max(1, Math.floor(Number(duration_days) || 7)))
      const bidConverted = Math.round(bid * fxRate * 100) / 100
      const budgetConverted = Math.round(budget * fxRate * 100) / 100
      const totalPrice = Math.round(budgetConverted * days * 100) / 100
      const audience = target_audience && typeof target_audience === "object"
        ? { countries: Array.isArray(target_audience.countries) ? target_audience.countries : [], devices: Array.isArray(target_audience.devices) ? target_audience.devices : [], interests: Array.isArray(target_audience.interests) ? target_audience.interests : [] }
        : { countries: [], devices: [], interests: [] }

      const { data: campaign, error } = await supabase
        .from("ad_campaigns")
        .insert({
          user_id: user.id,
          advertiser_email: advertiser_email || user.email || null,
          advertiser_name,
          headline: headline || advertiser_name,
          description: description || "",
          cta_text: cta_text || "Learn More",
          ad_image_url: ad_image_url || null,
          destination_url,
          placement_id: placement.id,
          positions: [placement.position],
          billing_model: model,
          billing_frequency: "day",
          units: days,
          unit_price: bidConverted,
          total_price: totalPrice,
          budget: budgetConverted,
          daily_budget: budgetConverted,
          bid_amount: bidConverted,
          currency: cur,
          fx_rate: fxRate,
          goal: goal || "clicks",
          cta_type: cta_type || "learn_more",
          target_audience: audience,
          media_type: isVideo ? "video" : "image",
          video_url: isVideo ? video_url : null,
          poster_url: poster_url || null,
          content_url: placement.ad_type === "sponsored_article" ? String(content_url).trim() : null,
          start_date: new Date().toISOString().slice(0, 10),
          end_date: new Date(Date.now() + days * 86400000).toISOString().slice(0, 10),
          status: "pending",
          submitted_at: new Date().toISOString(),
          is_active: false,
        })
        .select("id, status, budget, daily_budget, bid_amount, billing_model, units, currency")
        .single()

      if (error) throw error

      return NextResponse.json({
        campaign,
        message: "Campaign submitted! It will go live once our team approves it.",
      })
    }

    // ---- AI creative generator (any authenticated user) ----
    if (action === "generate-creative") {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: "Please sign in to use the AI creative generator" }, { status: 401 })

      const { placement_id, brand, goal, audience_hint } = body
      let placementName = "Website banner"
      if (placement_id) {
        const { data: p } = await supabase.from("ad_placements").select("name").eq("id", placement_id).maybeSingle()
        if (p) placementName = p.name
      }
      const creative = await generateCreative(placementName, brand, goal, audience_hint)
      if (!creative) {
        return NextResponse.json({ error: "AI creative generation failed — try again in a moment" }, { status: 502 })
      }
      return NextResponse.json({ creative })
    }

    // ---- Admin/editor actions ----
    const auth = await requireRole()
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const adminClient = createAdminClient()

    if (action === "placement") {
      const { name, position, description, ad_type, sizes, min_bid_cpm, min_bid_cpc, est_impressions, supports_video, is_active } = body
      if (!name || !position) return NextResponse.json({ error: "Name and position are required" }, { status: 400 })
      const { data, error } = await adminClient
        .from("ad_placements")
        .insert({
          name,
          position,
          location: body.location || "site",
          description: description || "",
          ad_type: ad_type || "banner",
          sizes: Array.isArray(sizes) ? sizes : ["728x90"],
          min_bid_cpm: Number(min_bid_cpm) || 500,
          min_bid_cpc: Number(min_bid_cpc) || 50,
          supports_video: !!supports_video,
          price_per_day: Number(body.price_per_day) || 0,
          est_impressions: est_impressions || 0,
          is_active: is_active !== false,
        })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ placement: data })
    }

    if (action === "approve") {
      const { data: campaign } = await adminClient
        .from("ad_campaigns")
        .update({ status: "live", is_active: true, approved_at: new Date().toISOString(), review_note: null })
        .eq("id", body.campaign_id)
        .select("id, placement_id")
        .single()
      if (campaign?.placement_id) {
        const { error: rpcErr } = await adminClient.rpc("increment_ad_placement_advertisers", { p_placement_id: campaign.placement_id })
        if (rpcErr) console.error("Failed to bump placement advertisers:", rpcErr)
      }
      return NextResponse.json({ success: true, message: "Campaign approved and live" })
    }

    if (action === "reject") {
      await adminClient
        .from("ad_campaigns")
        .update({ status: "rejected", is_active: false, rejected_at: new Date().toISOString(), review_note: body.note || "Creative did not meet our ad guidelines" })
        .eq("id", body.campaign_id)
      return NextResponse.json({ success: true, message: "Campaign rejected" })
    }

    // Pause / resume — campaign owner can pause their own campaign, admins can pause any
    if (action === "pause" || action === "resume") {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()
      const isAdmin = profile?.role === "admin" || profile?.role === "editor"
      const toStatus = action === "pause" ? "paused" : "live"
      const toActive = action === "pause" ? false : true
      const { data: target } = await supabase
        .from("ad_campaigns")
        .select("user_id")
        .eq("id", body.campaign_id)
        .maybeSingle()
      if (!target) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
      if (!isAdmin && target.user_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const updater = isAdmin ? createAdminClient() : supabase
      const { error } = await updater
        .from("ad_campaigns")
        .update({ status: toStatus, is_active: toActive })
        .eq("id", body.campaign_id)
      if (error) throw error
      return NextResponse.json({
        success: true,
        message: action === "pause" ? "Campaign paused" : "Campaign resumed",
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("Ads API POST error:", error)
    return NextResponse.json({ error: error.message || "Failed to process request" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = await requireRole()
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const adminClient = createAdminClient()
  const body = await request.json()

  try {
    if (body.type === "placement") {
      const { data, error } = await adminClient
        .from("ad_placements")
        .update({
          name: body.name,
          position: body.position,
          location: body.location || "site",
          description: body.description || "",
          ad_type: body.ad_type,
          sizes: body.sizes,
          min_bid_cpm: Number(body.min_bid_cpm) || 500,
          min_bid_cpc: Number(body.min_bid_cpc) || 50,
          supports_video: !!body.supports_video,
          est_impressions: body.est_impressions || 0,
          is_active: body.is_active !== false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.id)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ placement: data })
    }
    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const body = await request.json()

  try {
    if (body.type === "campaign") {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
      const isAdmin = profile?.role === "admin" || profile?.role === "editor"
      let query = supabase.from("ad_campaigns").delete()
      if (!isAdmin) query = query.eq("user_id", user.id)
      const { error } = await query.eq("id", body.id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (body.type === "placement") {
      const auth = await requireRole()
      if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
      const adminClient = createAdminClient()
      const { error } = await adminClient.from("ad_placements").delete().eq("id", body.id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 })
  }
}
