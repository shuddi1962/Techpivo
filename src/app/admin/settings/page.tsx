"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const timers = useRef<Record<string, NodeJS.Timeout>>({})
  const supabase = createClient()

  useEffect(() => {
    supabase.from("site_settings").select("*").then(({ data }) => {
      if (data) {
        const map: Record<string, any> = {}
        data.forEach((s) => { map[s.key] = s.value })
        setSettings(map)
      }
    })
  }, [supabase])

  const saveSetting = useCallback(async (key: string, value: any) => {
    await supabase.from("site_settings").upsert({ key, value })
  }, [supabase])

  const updateLocalSetting = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleInputChange = (key: string, value: any) => {
    updateLocalSetting(key, value)
    setDirty((prev) => new Set(prev).add(key))
    if (timers.current[key]) clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => {
      saveSetting(key, value)
      setDirty((prev) => { const next = new Set(prev); next.delete(key); return next })
    }, 800)
  }

  const handleBlur = (key: string, value: any) => {
    if (timers.current[key]) clearTimeout(timers.current[key])
    saveSetting(key, value)
    setDirty((prev) => { const next = new Set(prev); next.delete(key); return next })
  }

  const handleToggle = (key: string, value: boolean) => {
    updateLocalSetting(key, value)
    saveSetting(key, value)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Site Settings</h1>

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
          <CardHeader><CardTitle className="text-lg">Integrations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "openrouter_api_key", label: "OpenRouter API Key" },
              { key: "openrouter_model", label: "OpenRouter Model" },
              { key: "resend_api_key", label: "Resend API Key (Email)" },
              { key: "vapid_public_key", label: "VAPID Public Key" },
            ].map(({ key, label }) => (
              <div key={key}>
                <Label className="text-sm mb-1 block">{label}</Label>
                <Input
                  type="password"
                  value={settings[key] || ""}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  onBlur={() => handleBlur(key, settings[key])}
                  className="font-mono"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
