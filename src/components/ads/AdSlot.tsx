"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { AD_POSITIONS } from "@/lib/constants"
import { hasConsentFor } from "@/lib/consent"
import { getGeoOnce } from "@/lib/tools-geo"

interface AdSlotProps {
  positionKey: keyof typeof AD_POSITIONS
  className?: string
  preview?: boolean
}

interface SlotAd {
  id: string
  ad_code: string | null
}

interface CampaignAd {
  id: string
  advertiser_name: string
  ad_image_url: string | null
  destination_url: string | null
  ad_code: string | null
  media_type?: string | null
  video_url?: string | null
  poster_url?: string | null
  target_audience?: {
    countries?: string[]
    devices?: string[]
    interests?: string[]
  } | null
}

function detectDevice(): string {
  if (typeof navigator === "undefined") return "Desktop"
  const ua = navigator.userAgent || ""
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return "Tablet"
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "Mobile"
  return "Desktop"
}

function audienceAllows(c: CampaignAd, device: string, country: string | null): boolean {
  const ta = c.target_audience
  if (!ta) return true
  if (Array.isArray(ta.devices) && ta.devices.length && !ta.devices.includes(device)) return false
  if (
    country &&
    Array.isArray(ta.countries) &&
    ta.countries.length &&
    !ta.countries.some((name) => name.toLowerCase() === country.toLowerCase())
  ) return false
  return true
}
export function AdSlot({ positionKey, className, preview }: AdSlotProps) {
  const [slotAd, setSlotAd] = useState<SlotAd | null>(null)
  const [campaignAds, setCampaignAds] = useState<CampaignAd[]>([])
  const [placementSizes, setPlacementSizes] = useState<string[] | null>(null)
  const [settings, setSettings] = useState<{ enable_auto_ads?: boolean; adsense_publisher_id?: string }>({})
  const [loading, setLoading] = useState(true)
  const [currentCampaignIndex, setCurrentCampaignIndex] = useState(0)
  const recordedRef = useRef(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastTrackedCampaignRef = useRef<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    const supabase = createClient()
    const today = new Date().toISOString().slice(0, 10)

    const [slotRes, campaignsRes, placementRes, settingsRes] = await Promise.all([
      supabase
        .from("ads")
        .select("id, ad_code")
        .eq("position", positionKey)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("ad_campaigns")
        .select("id, advertiser_name, ad_image_url, destination_url, ad_code, media_type, video_url, poster_url, target_audience")
        .contains("positions", [positionKey])
        .eq("is_active", true)
        .in("status", ["approved", "live"])
        .gte("end_date", today),
      supabase
        .from("ad_placements")
        .select("position, sizes, supports_video")
        .eq("position", positionKey)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["enable_auto_ads", "adsense_publisher_id"]),
    ])

    if (!mountedRef.current) return
    if (slotRes.data) setSlotAd(slotRes.data)
    if (campaignsRes.data) {
      const allCampaigns = campaignsRes.data as CampaignAd[]
      // Banner-or-video choice: the advertiser picks the creative type, and the
      // placement decides whether video is even allowed (supports_video). Video
      // campaigns only serve on video-capable placements; images serve anywhere.
      const supportsVideo = placementRes.data?.supports_video !== false
      const device = detectDevice()
      let country: string | null = null
      try {
        const geo = await getGeoOnce()
        country = geo?.country || null
      } catch {
        country = null
      }
      if (mountedRef.current) {
        setCampaignAds(
          allCampaigns.filter((c) => (supportsVideo || c.media_type !== "video") && audienceAllows(c, device, country)),
        )
      }
    }
    if (placementRes.data) setPlacementSizes(placementRes.data.sizes)
    if (settingsRes.data) {
      const result: Record<string, any> = {}
      for (const row of settingsRes.data) {
        result[row.key] = row.value
      }
      setSettings(result)
    }
    setLoading(false)
  }, [positionKey])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`adslot_${positionKey}_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ad_campaigns" },
        () => {
          refresh()
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ads" },
        () => {
          refresh()
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh])

  useEffect(() => {
    if (campaignAds.length <= 1) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setCurrentCampaignIndex((prev) => (prev + 1) % campaignAds.length)
    }, 20000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [campaignAds.length])

  useEffect(() => {
    if (!slotAd || recordedRef.current || preview) return
    recordedRef.current = true
    const supabase = createClient()
    supabase.rpc("increment_ad_impressions", { ad_id: slotAd.id }).then()
  }, [slotAd, preview])

  useEffect(() => {
    if (preview) return
    const campaign = campaignAds[currentCampaignIndex]
    if (!campaign) return
    if (lastTrackedCampaignRef.current === campaign.id) return
    lastTrackedCampaignRef.current = campaign.id
    const supabase = createClient()
    supabase.rpc("increment_campaign_impressions", { campaign_id: campaign.id }).then()
    supabase.rpc("increment_campaign_daily_stats", { p_campaign_id: campaign.id, p_kind: "impressions" }).then()
  }, [campaignAds, currentCampaignIndex, preview])

  const trackCampaignClick = (campaignId: string) => {
    if (preview) return
    const supabase = createClient()
    supabase.rpc("increment_campaign_clicks", { campaign_id: campaignId }).then()
    supabase.rpc("increment_campaign_daily_stats", { p_campaign_id: campaignId, p_kind: "clicks" }).then()
  }

  const marketingConsent = hasConsentFor("marketing")
  const showAutoAds = settings.enable_auto_ads && settings.adsense_publisher_id && marketingConsent

  if (loading) return null

  // Follow the placement's declared size (first entry, e.g. "728x90") — creatives
  // are width-capped at the placement width and height-capped so they never blow out of their space.
  const designSize = (() => {
    const raw = Array.isArray(placementSizes) ? placementSizes[0] : undefined
    if (!raw) return null
    const [w, h] = String(raw).toLowerCase().split("x").map((n) => parseInt(n, 10))
    if (!w || !h || w <= 0 || h <= 0) return null
    return { w, h }
  })()

  const sizeBox = designSize
    ? { maxWidth: designSize.w, height: designSize.h, width: "100%" as const }
    : { width: "100%" as const }
  const adCodeBox = designSize
    ? { maxWidth: designSize.w, maxHeight: designSize.h, width: "100%" as const }
    : { width: "100%" as const }

  const campaign = campaignAds[currentCampaignIndex]

  // Render campaign ad (shown alongside slot ad, or alone)
  const renderCampaign = () => {
    if (!campaign) return null

    if (campaign.media_type === "video" && campaign.video_url) {
      return (
        <div className="ad-campaign">
          {preview && (
            <span className="text-[9px] uppercase tracking-wider text-primary block mb-0.5">
              Campaign: {campaign.advertiser_name}
            </span>
          )}
          <div className="mx-auto" style={sizeBox}>
            <video
              src={campaign.video_url}
              poster={campaign.poster_url || undefined}
              controls
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full h-full rounded-md object-cover"
              onClick={() => trackCampaignClick(campaign.id)}
            />
          </div>
        </div>
      )
    }

    if (campaign.ad_image_url) {
      return (
        <div className="ad-campaign">
          {preview && (
            <span className="text-[9px] uppercase tracking-wider text-primary block mb-0.5">
              Campaign: {campaign.advertiser_name}
            </span>
          )}
          {campaign.destination_url ? (
            <a href={preview ? "#" : campaign.destination_url} target="_blank" rel="noopener" onClick={() => trackCampaignClick(campaign.id)}>
              <span className="block mx-auto" style={sizeBox}>
                <Image src={campaign.ad_image_url} alt={campaign.advertiser_name} width={designSize?.w || 800} height={designSize?.h || 450} className="w-full h-full object-cover" />
              </span>
            </a>
          ) : (
            <span className="block mx-auto" style={sizeBox}>
              <Image src={campaign.ad_image_url} alt={campaign.advertiser_name} width={designSize?.w || 800} height={designSize?.h || 450} className="w-full h-full object-cover" />
            </span>
          )}
        </div>
      )
    }

    if (campaign.ad_code) {
      return (
        <div className="ad-campaign">
          {preview && (
            <span className="text-[9px] uppercase tracking-wider text-primary block mb-0.5">
              Campaign: {campaign.advertiser_name}
            </span>
          )}
          <div className="mx-auto" style={adCodeBox} dangerouslySetInnerHTML={{ __html: campaign.ad_code }} />
        </div>
      )
    }

    // No creative yet (e.g. missing image): render a clean text ad in the same
    // fixed box so the slot never collapses or looks broken during rotation.
    return (
      <div className="ad-campaign">
        {preview && (
          <span className="text-[9px] uppercase tracking-wider text-primary block mb-0.5">
            Campaign: {campaign.advertiser_name}
          </span>
        )}
        {campaign.destination_url ? (
          <a
            href={preview ? "#" : campaign.destination_url}
            target="_blank"
            rel="noopener"
            onClick={() => trackCampaignClick(campaign.id)}
            className="block mx-auto flex items-center justify-center rounded-md bg-muted text-center text-sm font-medium text-foreground hover:bg-muted/80"
            style={sizeBox}
          >
            {campaign.advertiser_name}
          </a>
        ) : (
          <div
            className="block mx-auto flex items-center justify-center rounded-md bg-muted text-center text-sm font-medium text-foreground"
            style={sizeBox}
          >
            {campaign.advertiser_name}
          </div>
        )}
      </div>
    )
  }

  const renderAdSense = () => (
    <div
      dangerouslySetInnerHTML={{
        __html: `
          <script async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${settings.adsense_publisher_id}"
            crossorigin="anonymous"
          ></script>
          <ins class="adsbygoogle"
            style="display:block"
            data-ad-client="${settings.adsense_publisher_id}"
            data-ad-format="auto"
            data-full-width-responsive="true"
          ></ins>
          <script>(adsbygoogle = window.adsbygoogle || []).push({})</script>
        `,
      }}
    />
  )

  // Admin preview sees the full picture: legacy slot ads (ads table), campaigns,
  // and AdSense fallback — so ad_code is vetted before it ever ships.
  if (preview) {
    return (
      <div className={cn("ad-slot", className)}>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5 block">
          Slot: {AD_POSITIONS[positionKey]}
        </span>
        {slotAd?.ad_code && (
          <div className="mx-auto" style={adCodeBox} dangerouslySetInnerHTML={{ __html: slotAd.ad_code }} />
        )}
        {campaign ? (
          <div className={slotAd?.ad_code ? "mt-2 border-t pt-2" : "mt-1"}>
            {renderCampaign()}
            {campaignAds.length > 1 && (
              <div className="flex justify-center gap-1 mt-1">
                {campaignAds.map((_, i) => (
                  <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentCampaignIndex ? "bg-primary" : "bg-muted-foreground/30"}`} />
                ))}
              </div>
            )}
          </div>
        ) : showAutoAds ? (
          <div className="mt-1">{renderAdSense()}</div>
        ) : (
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 block mt-1">
            No active campaign — preview
          </span>
        )}
      </div>
    )
  }

  // Public: approved/live campaigns win their slot; AdSense auto-ads fill slots
  // with no eligible campaign (only when enabled + publisher id + consent).
  // Rotation is invisible by design (Google-style): ads swap in place in the
  // same fixed-size box — no dots, no size change, no layout shift.
  if (campaign) {
    return (
      <div className={cn("ad-slot", className)}>
        {renderCampaign()}
      </div>
    )
  }

  if (showAutoAds) {
    return <div className={cn("ad-slot", className)}>{renderAdSense()}</div>
  }

  // Nothing to render — hide the slot entirely (no placeholder box)
  return null
}
