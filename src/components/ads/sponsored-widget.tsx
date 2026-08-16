"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Star } from "lucide-react"

interface SponsoredCampaign {
  id: string
  advertiser_name: string | null
  headline: string | null
  description: string | null
  cta_text: string | null
  destination_url: string | null
  content_url: string | null
  ad_image_url: string | null
  media_type: string | null
}

export function SponsoredWidget() {
  const [campaign, setCampaign] = useState<SponsoredCampaign | null>(null)
  const lastTrackedRef = useRef<string | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const today = new Date().toISOString().slice(0, 10)

    const { data } = await supabase
      .from("ad_campaigns")
      .select("id, advertiser_name, headline, description, cta_text, destination_url, content_url, ad_image_url, media_type")
      .contains("positions", ["sponsored_article"])
      .eq("is_active", true)
      .in("status", ["approved", "live"])
      .gte("end_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data || data.media_type === "video") {
      setCampaign(null)
      return
    }
    setCampaign(data)
  }, [])

  useEffect(() => {
    load()
    const supabase = createClient()
    const channel = supabase
      .channel(`sponsored_widget_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_campaigns" }, () => {
        load()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  useEffect(() => {
    if (!campaign || lastTrackedRef.current === campaign.id) return
    lastTrackedRef.current = campaign.id
    const supabase = createClient()
    supabase.rpc("increment_campaign_impressions", { campaign_id: campaign.id }).then()
    supabase.rpc("increment_campaign_daily_stats", { p_campaign_id: campaign.id, p_kind: "impressions" }).then()
  }, [campaign])

  if (!campaign) return null

  const url = campaign.destination_url || campaign.content_url
  if (!url) return null

  const trackClick = () => {
    const supabase = createClient()
    supabase.rpc("increment_campaign_clicks", { campaign_id: campaign.id }).then()
    supabase.rpc("increment_campaign_daily_stats", { p_campaign_id: campaign.id, p_kind: "clicks" }).then()
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Star className="h-3.5 w-3.5 text-amber-500" aria-hidden />
        Sponsored
      </h3>
      {campaign.ad_image_url && (
        <div className="relative mb-3 h-36 w-full overflow-hidden rounded-lg">
          <Image src={campaign.ad_image_url} alt={campaign.headline || campaign.advertiser_name || "Sponsored article"} fill className="object-cover" />
        </div>
      )}
      <p className="text-sm font-semibold leading-snug">{campaign.headline || campaign.advertiser_name}</p>
      {campaign.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{campaign.description}</p>}
      <a
        href={url}
        target="_blank"
        rel="noopener"
        onClick={trackClick}
        className="mt-3 block rounded-lg bg-primary py-2 text-center text-sm font-medium text-white"
      >
        {campaign.cta_text || "Read Article"}
      </a>
    </div>
  )
}