"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { GEO_CACHE_KEY, GEO_CACHE_TTL_MS, GeoInfo } from "@/lib/geo"

let inFlight: Promise<GeoInfo | null> | null = null

export async function getGeoOnce(force = false): Promise<GeoInfo | null> {
  try {
    if (!force) {
      const cached = localStorage.getItem(GEO_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as { t: number; data: GeoInfo }
        if (Date.now() - parsed.t < GEO_CACHE_TTL_MS) return parsed.data
      }
    }
    if (inFlight) return inFlight
    inFlight = (async () => {
      const res = await fetch("/api/geo", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok || !data?.countryCode) return null
      const geo: GeoInfo = data
      try {
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ t: Date.now(), data: geo }))
      } catch { /* storage unavailable */ }
      return geo
    })().finally(() => { inFlight = null })
    return inFlight
  } catch {
    return null
  }
}

export function useGeoLocation() {
  const [geo, setGeo] = useState<GeoInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const result = await getGeoOnce()
    if (mounted.current) {
      setGeo(result)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    refresh().catch(() => {})
    return () => {
      mounted.current = false
    }
  }, [refresh])

  return { geo, loading, refresh }
}