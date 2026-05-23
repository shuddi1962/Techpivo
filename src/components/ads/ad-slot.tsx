"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { AdPosition } from "@/types/database"
import { cn } from "@/lib/utils"

interface AdSlotProps {
  position: AdPosition
  className?: string
}

interface AdData {
  id: string
  ad_code: string | null
  adsense_slot: string | null
}

export function AdSlot({ position, className }: AdSlotProps) {
  const [ad, setAd] = useState<AdData | null>(null)
  const [settings, setSettings] = useState<{ enable_auto_ads?: boolean; adsense_publisher_id?: string }>({})
  const [loading, setLoading] = useState(true)
  const recordedRef = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function load() {
      const [{ data: adData }, { data: settingsData }] = await Promise.all([
        supabase
          .from("ads")
          .select("id, ad_code, adsense_slot")
          .eq("position", position)
          .eq("is_active", true)
          .order("created_at")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("site_settings")
          .select("key, value")
          .in("key", ["enable_auto_ads", "adsense_publisher_id"]),
      ])

      if (cancelled) return
      if (adData) setAd(adData)
      if (settingsData) {
        const result: Record<string, any> = {}
        for (const row of settingsData) {
          result[row.key] = row.value
        }
        setSettings(result)
      }
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [position])

  useEffect(() => {
    if (!ad || recordedRef.current) return
    recordedRef.current = true

    const supabase = createClient()
    try {
      supabase.rpc("increment_ad_impressions", { ad_id: ad.id })
    } catch {
      // increment_ad_impressions RPC not available
    }
  }, [ad])

  const showAutoAds =
    settings.enable_auto_ads && settings.adsense_publisher_id

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center min-h-[90px] bg-muted/30 rounded-md border border-dashed",
          className
        )}
      >
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40">
          Loading...
        </span>
      </div>
    )
  }

  if (ad?.ad_code) {
    return (
      <div
        className={cn("ad-slot", className)}
        dangerouslySetInnerHTML={{ __html: ad.ad_code }}
      />
    )
  }

  if (showAutoAds && settings.adsense_publisher_id) {
    return (
      <div
        className={cn("ad-slot ad-slot--auto", className)}
        dangerouslySetInnerHTML={{
          __html: `
            <script async
              src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${settings.adsense_publisher_id}"
              crossorigin="anonymous"
            ></script>
            <ins class="adsbygoogle"
              style="display:block"
              data-ad-client="${settings.adsense_publisher_id}"
              ${ad?.adsense_slot ? `data-ad-slot="${ad.adsense_slot}"` : ""}
              data-ad-format="auto"
              data-full-width-responsive="true"
            ></ins>
            <script>(adsbygoogle = window.adsbygoogle || []).push({})</script>
          `,
        }}
      />
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center min-h-[90px] bg-muted/30 rounded-md border border-dashed",
        className
      )}
    >
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40">
        Advertisement
      </span>
    </div>
  )
}
