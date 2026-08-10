import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@/lib/supabase/admin"
import { DEFAULT_FX_RATES } from "@/lib/ads"

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

// FX map: NGN per 1 unit of each currency (live from site_settings, fallback defaults)
async function getFxRates(supabase: any): Promise<Record<string, number>> {
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "fx_rates")
      .maybeSingle()
    if (data?.value && typeof data.value === "object") {
      return { ...DEFAULT_FX_RATES, ...data.value }
    }
  } catch (e) {
    console.error("Failed to load fx_rates:", e)
  }
  return { ...DEFAULT_FX_RATES }
}

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
        .order("price_per_day", { ascending: false })
      return NextResponse.json({ placements: data || [], fx_rates: fx })
    }

    if (section === "campaigns") {
      const { data: campaigns } = await supabase
        .from("ad_campaigns")
        .select("*, placements:ad_placements(name, position, price_per_day, cpm, sizes)")
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
    // ---- Place order (any authenticated user) ----
    if (action === "order") {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: "Please sign in to place an ad order" }, { status: 401 })

      const { placement_id, billing_model, units, advertiser_name, headline, description, cta_text, destination_url, ad_image_url, advertiser_email,
        currency, billing_frequency, goal, cta_type, target_audience, media_type, video_url, poster_url } = body

      if (!placement_id) return NextResponse.json({ error: "Select an ad space" }, { status: 400 })
      if (!advertiser_name || !headline || !destination_url) {
        return NextResponse.json({ error: "Brand name, headline and destination URL are required" }, { status: 400 })
      }

      const { data: placement } = await supabase
        .from("ad_placements")
        .select("id, name, position, price_per_day, price_per_week, price_per_month, cpm, min_days, min_budget, supports_video")
        .eq("id", placement_id)
        .eq("is_active", true)
        .maybeSingle()
      if (!placement) return NextResponse.json({ error: "Ad space not available" }, { status: 400 })

      const freq = ["day", "week", "month"].includes(billing_frequency) ? billing_frequency : "day"
      const isImpressions = billing_model === "impressions"

      // Base price in NGN, depending on frequency
      let basePrice: number
      if (isImpressions) {
        basePrice = Number(placement.cpm)
      } else if (freq === "week") {
        basePrice = Number(placement.price_per_week) || Math.round(Number(placement.price_per_day) * 7 * 0.85)
      } else if (freq === "month") {
        basePrice = Number(placement.price_per_month) || Math.round(Number(placement.price_per_day) * 30 * 0.75)
      } else {
        basePrice = Number(placement.price_per_day)
      }

      const minUnits = isImpressions
        ? 1
        : freq === "week"
          ? Math.max(1, Math.ceil(Number(placement.min_days || 7) / 7))
          : freq === "month"
            ? 1
            : Math.max(1, Number(placement.min_days || 1))
      const u = Math.max(1, Math.floor(Number(units) || 1))
      if (u < minUnits) {
        return NextResponse.json({
          error: isImpressions
            ? "Minimum is 1,000 impressions"
            : `Minimum booking is ${minUnits} ${freq}${minUnits > 1 ? "s" : ""} for this ad space`,
        }, { status: 400 })
      }

      // Validate video creative
      const isVideo = media_type === "video"
      if (isVideo && !placement.supports_video) {
        return NextResponse.json({ error: "This ad space does not support video ads" }, { status: 400 })
      }
      if (isVideo && !video_url) {
        return NextResponse.json({ error: "Video URL is required for video ads" }, { status: 400 })
      }

      // Multi-currency: convert NGN base price with the live fx rate
      const cur = String(currency || "NGN").toUpperCase()
      const fx = await getFxRates(supabase)
      const fxRate = Number(fx[cur] || 1)
      const unitPrice = Math.round(basePrice * fxRate * 100) / 100
      const totalPrice = Math.round(unitPrice * u * 100) / 100
      const minBudget = Number(placement.min_budget || 0)
      const daySpan = isImpressions ? 7 : freq === "week" ? u * 7 : freq === "month" ? u * 30 : u
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
          billing_model: isImpressions ? "impressions" : freq === "week" ? "per_week" : freq === "month" ? "per_month" : "per_day",
          billing_frequency: freq,
          units: u,
          unit_price: unitPrice,
          total_price: totalPrice,
          budget: Math.max(totalPrice, minBudget),
          currency: cur,
          fx_rate: fxRate,
          goal: goal || "impressions",
          cta_type: cta_type || "learn_more",
          target_audience: audience,
          media_type: isVideo ? "video" : "image",
          video_url: isVideo ? video_url : null,
          poster_url: poster_url || null,
          start_date: new Date().toISOString().slice(0, 10),
          end_date: new Date(Date.now() + Math.max(1, daySpan) * 86400000).toISOString().slice(0, 10),
          status: "pending",
          submitted_at: new Date().toISOString(),
          is_active: false,
        })
        .select("id, status, total_price, billing_model, units, unit_price, currency")
        .single()

      if (error) throw error

      return NextResponse.json({
        campaign,
        message: "Order submitted! It will go live once our team approves it.",
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
      const { name, position, description, ad_type, sizes, price_per_day, price_per_week, price_per_month, cpm, min_days, min_budget, est_impressions, supports_video, is_active } = body
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
          price_per_day: price_per_day || 0,
          price_per_week: price_per_week || 0,
          price_per_month: price_per_month || 0,
          supports_video: !!supports_video,
          cpm: cpm || 0,
          min_days: min_days || 7,
          min_budget: min_budget || 0,
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

    if (action === "pause") {
      await adminClient
        .from("ad_campaigns")
        .update({ status: "paused", is_active: false })
        .eq("id", body.campaign_id)
      return NextResponse.json({ success: true, message: "Campaign paused" })
    }

    if (action === "resume") {
      await adminClient
        .from("ad_campaigns")
        .update({ status: "live", is_active: true })
        .eq("id", body.campaign_id)
      return NextResponse.json({ success: true, message: "Campaign resumed" })
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
          price_per_day: body.price_per_day || 0,
          price_per_week: body.price_per_week || 0,
          price_per_month: body.price_per_month || 0,
          supports_video: !!body.supports_video,
          cpm: body.cpm || 0,
          min_days: body.min_days || 7,
          min_budget: body.min_budget || 0,
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
