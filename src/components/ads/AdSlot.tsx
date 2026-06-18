"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { AD_POSITIONS } from "@/lib/constants"
import { hasConsentFor } from "@/lib/consent"

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
}

export function AdSlot({ positionKey, className, preview }: AdSlotProps) {
  const [slotAd, setSlotAd] = useState<SlotAd | null>(null)
  const [campaignAds, setCampaignAds] = useState<CampaignAd[]>([])
  const [settings, setSettings] = useState<{ enable_auto_ads?: boolean; adsense_publisher_id?: string }>({})
  const [loading, setLoading] = useState(true)
  const [currentCampaignIndex, setCurrentCampaignIndex] = useState(0)
  const recordedRef = useRef(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function load() {
      const [slotRes, campaignsRes, settingsRes] = await Promise.all([
        supabase
          .from("ads")
          .select("id, ad_code")
          .eq("position", positionKey)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("ad_campaigns")
          .select("id, advertiser_name, ad_image_url, destination_url, ad_code")
          .contains("positions", [positionKey])
          .eq("is_active", true),
        supabase
          .from("site_settings")
          .select("key, value")
          .in("key", ["enable_auto_ads", "adsense_publisher_id"]),
      ])

      if (cancelled) return
      if (slotRes.data) setSlotAd(slotRes.data)
      if (campaignsRes.data) setCampaignAds(campaignsRes.data)
      if (settingsRes.data) {
        const result: Record<string, any> = {}
        for (const row of settingsRes.data) {
          result[row.key] = row.value
        }
        setSettings(result)
      }
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [positionKey])

  useEffect(() => {
    if (campaignAds.length <= 1) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setCurrentCampaignIndex((prev) => (prev + 1) % campaignAds.length)
    }, 8000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [campaignAds.length])

  useEffect(() => {
    if (!slotAd || recordedRef.current) return
    recordedRef.current = true
    const supabase = createClient()
    supabase.rpc("increment_ad_impressions", { ad_id: slotAd.id }).then()
  }, [slotAd])

  const marketingConsent = hasConsentFor("marketing")
  const showAutoAds = settings.enable_auto_ads && settings.adsense_publisher_id && marketingConsent

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center min-h-[90px] bg-muted/30 rounded-md border border-dashed", className)}>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40">Loading...</span>
      </div>
    )
  }

  const campaign = campaignAds[currentCampaignIndex]

  // Render campaign ad (shown alongside slot ad, or alone)
  const renderCampaign = () => {
    if (!campaign) return null

    if (campaign.ad_image_url) {
      return (
        <div className="ad-campaign">
          {preview && (
            <span className="text-[9px] uppercase tracking-wider text-primary block mb-0.5">
              Campaign: {campaign.advertiser_name}
            </span>
          )}
          {campaign.destination_url ? (
            <a href={preview ? "#" : campaign.destination_url} target="_blank" rel="noopener">
              <img src={campaign.ad_image_url} alt={campaign.advertiser_name} className="max-w-full h-auto" />
            </a>
          ) : (
            <img src={campaign.ad_image_url} alt={campaign.advertiser_name} className="max-w-full h-auto" />
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
          <div dangerouslySetInnerHTML={{ __html: campaign.ad_code }} />
        </div>
      )
    }

    return null
  }

  // Slot ad with ad_code
  if (slotAd?.ad_code) {
    return (
      <div className={cn("ad-slot", className)}>
        {preview && (
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5 block">
            Slot: {AD_POSITIONS[positionKey]}
          </span>
        )}
        <div dangerouslySetInnerHTML={{ __html: slotAd.ad_code }} />
        {campaignAds.length > 0 && (
          <div className="mt-2 border-t pt-2">
            {renderCampaign()}
            {campaignAds.length > 1 && (
              <div className="flex justify-center gap-1 mt-1">
                {campaignAds.map((_, i) => (
                  <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentCampaignIndex ? "bg-primary" : "bg-muted-foreground/30"}`} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Campaign ads only (no slot ad)
  if (campaign) {
    return (
      <div className={cn("ad-slot", className)}>
        {renderCampaign()}
        {campaignAds.length > 1 && (
          <div className="flex justify-center gap-1 mt-1">
            {campaignAds.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentCampaignIndex ? "bg-primary" : "bg-muted-foreground/30"}`} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Auto-ads fallback
  if (showAutoAds) {
    return (
      <div className={cn("ad-slot ad-slot--auto", className)}>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 block text-center mb-1">Advertisement</span>
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
      </div>
    )
  }

  return (
    <div className={cn("flex items-center justify-center min-h-[90px] bg-muted/30 rounded-md border border-dashed", className)}>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40">Advertisement</span>
    </div>
  )
}
