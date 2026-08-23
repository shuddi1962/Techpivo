"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GEMINI_MODEL_OPTIONS, GEMINI_MODEL_DEFAULT } from "@/lib/gemini-model"

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [error, setError] = useState("")
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const timers = useRef<Record<string, NodeJS.Timeout>>({})
  const dirtyRef = useRef<Set<string>>(new Set())
  const supabase = createClient()

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from("site_settings").select("*")
    if (data) {
      setSettings((prev) => {
        const map: Record<string, any> = {}
        data.forEach((s) => {
          map[s.key] = dirtyRef.current.has(s.key) ? prev[s.key] : s.value
        })
        return map
      })
      setLastSync(new Date())
    }
  }, [supabase])

  useEffect(() => {
    fetchSettings()
    const channel = supabase
      .channel(`settings_page_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => fetchSettings())
      .subscribe()
    const onFocus = () => fetchSettings()
    window.addEventListener("focus", onFocus)
    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener("focus", onFocus)
    }
  }, [supabase, fetchSettings])

  const saveSetting = useCallback(async (key: string, value: any) => {
    if (key === "site_url" && typeof value === "string" && value && !/^https?:\/\//.test(value)) {
      setError("site url must start with http:// or https://")
      return false
    }
    setError("")
    const { error } = await supabase.from("site_settings").upsert({ key, value })
    if (error) {
      console.error("Failed to save setting:", key, error)
      setError(`${key.replace(/_/g, " ")}: ${error.message}`)
      return false
    }
    setLastSync(new Date())
    return true
  }, [supabase])

  const updateLocalSetting = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleInputChange = (key: string, value: any) => {
    updateLocalSetting(key, value)
    dirtyRef.current = new Set(dirtyRef.current).add(key)
    setDirty(dirtyRef.current)
    if (timers.current[key]) clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => {
      saveSetting(key, value)
      dirtyRef.current = new Set(dirtyRef.current)
      dirtyRef.current.delete(key)
      setDirty(dirtyRef.current)
    }, 800)
  }

  const handleBlur = (key: string, value: any) => {
    if (timers.current[key]) clearTimeout(timers.current[key])
    saveSetting(key, value)
    dirtyRef.current = new Set(dirtyRef.current)
    dirtyRef.current.delete(key)
    setDirty(dirtyRef.current)
  }

  const handleToggle = (key: string, value: boolean) => {
    updateLocalSetting(key, value)
    saveSetting(key, value)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Site Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">{lastSync ? `Saved to DB · last sync ${lastSync.toLocaleTimeString()}` : ""}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 max-w-2xl">{error}</div>
      )}

      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader><CardTitle className="text-lg">General</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {["site_name", "site_tagline", "site_url"].map((key) => (
              <div key={key}>
                <Label className="text-sm capitalize mb-1 block">{key.replace(/_/g, " ")}</Label>
                <div className="relative">
                  <Input value={settings[key] || ""} onChange={(e) => handleInputChange(key, e.target.value)} onBlur={() => handleBlur(key, settings[key])} />
                  {dirty.has(key) && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-amber-500">unsaved</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">AI Writing Model</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm mb-1 block">Gemini model</Label>
              <Select
                value={typeof settings.gemini_model === "string" ? settings.gemini_model : GEMINI_MODEL_DEFAULT}
                onValueChange={(v) => handleInputChange("gemini_model", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GEMINI_MODEL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Applied in realtime to the next AI research / article write — no redeploy needed. If the selected model hits Google&apos;s free daily quota (429, resets ~8 AM WAT / midnight Pacific), the system auto-falls through Flash → Flash-Lite → 2.0 Flash automatically.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Features</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "enable_auto_ads", label: "Enable AdSense Auto Ads" },
              { key: "enable_interstitial", label: "Enable Interstitial Ads" },
              { key: "enable_exit_intent", label: "Enable Exit Intent Popup" },
              { key: "enable_push_notifications", label: "Enable Push Notifications" },
              { key: "infinite_scroll", label: "Enable Infinite Scroll" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label>{label}</Label>
                <Switch checked={!!settings[key]} onCheckedChange={(v) => handleToggle(key, v)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              API keys and secrets (OpenRouter, Resend, VAPID) are managed as environment variables on the hosting platform and are never stored in the database.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
