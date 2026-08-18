"use client"

import { useEffect, useState, useRef, useCallback } from "react"
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
const ROTATE_MS = 20000

export function PopupAd() {
  const [campaigns, setCampaigns] = useState<PopupCampaign[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const lastTrackedRef = useRef<string | null>(null)

  const campaign = campaigns.length > 0 ? campaigns[currentIndex % campaigns.length] : null

  const load = useCallback(async () => {
    const supabase = createClient()
    const today = new Date().toISOString().slice(0, 10)

    const { data } = await supabase
      .from("ad_campaigns")
      .select("id, advertiser_name, headline, description, cta_text, destination_url, ad_image_url, media_type, video_url, poster_url")
      .contains("positions", ["popup_toast"])
      .eq("is_active", true)
      .in("status", ["approved", "live"])
      .gte("end_date", today)
      .order("created_at", { ascending: false })
      .limit(20)

    const eligible = (data || []).filter((c) => c.media_type !== "video")
    const notDismissed = eligible.filter((c) => !localStorage.getItem(DISMISS_PREFIX + c.id))
    setCampaigns(notDismissed)
    setCurrentIndex(0)
    if (notDismissed.length === 0) setVisible(false)
  }, [])

  useEffect(() => {
    load()
    const supabase = createClient()
    const channel = supabase
      .channel(`popup_ad_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_campaigns" }, () => {
        load()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  useEffect(() => {
    if (!campaign || visible) return
    const t = window.setTimeout(() => setVisible(true), 6000)
    return () => window.clearTimeout(t)
  }, [campaign, visible])

  useEffect(() => {
    if (campaigns.length <= 1) return
    const t = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % campaigns.length)
    }, ROTATE_MS)
    return () => window.clearInterval(t)
  }, [campaigns.length])

  useEffect(() => {
    if (!visible || !campaign || lastTrackedRef.current === campaign.id) return
    lastTrackedRef.current = campaign.id
    const supabase = createClient()
    supabase.rpc("increment_campaign_impressions", { campaign_id: campaign.id }).then()
    supabase.rpc("increment_campaign_daily_stats", { p_campaign_id: campaign.id, p_kind: "impressions" }).then()
  }, [visible, campaign])

  if (!campaign || !visible) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_PREFIX + campaign.id, new Date().toISOString())
    const remaining = campaigns.filter((c) => c.id !== campaign.id)
    setCampaigns(remaining)
    setCurrentIndex(0)
    if (remaining.length === 0) setVisible(false)
  }

  const trackClick = () => {
    const supabase = createClient()
    supabase.rpc("increment_campaign_clicks", { campaign_id: campaign.id }).then()
    supabase.rpc("increment_campaign_daily_stats", { p_campaign_id: campaign.id, p_kind: "clicks" }).then()
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

      <div className="flex flex-col p-4">
        <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Sponsored</p>
        <p className="text-sm font-semibold leading-snug line-clamp-2">{campaign.headline || campaign.advertiser_name}</p>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{campaign.description || ""}</p>
        {campaign.destination_url ? (
          <a
            href={campaign.destination_url}
            target="_blank"
            rel="noopener"
            onClick={trackClick}
            className="mt-3 block rounded-lg bg-primary py-2 text-center text-sm font-medium text-white"
          >
            {campaign.cta_text || "Learn More"}
          </a>
        ) : (
          <div className="mt-3 rounded-lg bg-primary py-2 text-center text-sm font-medium text-white">
            {campaign.cta_text || "Learn More"}
          </div>
        )}
      </div>
    </div>
  )
}