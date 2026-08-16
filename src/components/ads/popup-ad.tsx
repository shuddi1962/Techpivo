"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { X } from "lucide-react"

interface PopupCampaign {
  id: string
  advertiser_name: string | null
  headline: string | null
  description: string | null
  cta_text: string | null
  destination_url: string | null
  ad_image_url: string | null
  media_type: string | null
  video_url: string | null
  poster_url: string | null
}

const DISMISS_PREFIX = "tp_popup_dismiss_"

export function PopupAd() {
  const [campaign, setCampaign] = useState<PopupCampaign | null>(null)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const recordedRef = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    const today = new Date().toISOString().slice(0, 10)

    supabase
      .from("ad_campaigns")
      .select("id, advertiser_name, headline, description, cta_text, destination_url, ad_image_url, media_type, video_url, poster_url")
      .contains("positions", ["popup_toast"])
      .eq("is_active", true)
      .in("status", ["approved", "live"])
      .gte("end_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then((res) => {
        if (cancelled || !res.data) return
        if (localStorage.getItem(DISMISS_PREFIX + res.data.id)) {
          setDismissed(true)
          return
        }
        setCampaign(res.data)
        const t = window.setTimeout(() => setVisible(true), 6000)
        return () => window.clearTimeout(t)
      })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!visible || !campaign || recordedRef.current) return
    recordedRef.current = true
    const supabase = createClient()
    supabase.rpc("increment_campaign_impressions", { campaign_id: campaign.id }).then()
    supabase.rpc("increment_campaign_daily_stats", { campaign_id: campaign.id, kind: "impressions" }).then()
  }, [visible, campaign])

  if (!campaign || !visible || dismissed) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_PREFIX + campaign.id, new Date().toISOString())
    setDismissed(true)
  }

  const trackClick = () => {
    const supabase = createClient()
    supabase.rpc("increment_campaign_clicks", { campaign_id: campaign.id }).then()
    supabase.rpc("increment_campaign_daily_stats", { campaign_id: campaign.id, kind: "clicks" }).then()
  }

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[300px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
      <button
        onClick={dismiss}
        aria-label="Dismiss advertisement"
        className="absolute top-2 right-2 z-10 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
      >
        <X size={14} />
      </button>

      {campaign.media_type === "video" && campaign.video_url ? (
        <video
          src={campaign.video_url}
          poster={campaign.poster_url || undefined}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          className="h-40 w-full object-cover"
        />
      ) : campaign.ad_image_url ? (
        <div className="relative h-40 w-full">
          <Image src={campaign.ad_image_url} alt={campaign.headline || campaign.advertiser_name || "Advertisement"} fill className="object-cover" />
        </div>
      ) : null}

      <div className="p-4">
        <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Sponsored</p>
        <p className="text-sm font-semibold leading-snug">{campaign.headline || campaign.advertiser_name}</p>
        {campaign.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{campaign.description}</p>
        )}
        {campaign.destination_url && (
          <a
            href={campaign.destination_url}
            target="_blank"
            rel="noopener"
            onClick={trackClick}
            className="mt-3 block rounded-lg bg-primary py-2 text-center text-sm font-medium text-white"
          >
            {campaign.cta_text || "Learn More"}
          </a>
        )}
      </div>
    </div>
  )
}