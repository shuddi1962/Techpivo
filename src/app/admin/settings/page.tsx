"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({})

  useEffect(() => {
    const supabase = createClient()
    supabase.from("site_settings").select("*").then(({ data }) => {
      if (data) {
        const map: Record<string, any> = {}
        data.forEach((s) => { map[s.key] = s.value })
        setSettings(map)
      }
    })
  }, [])

  const updateSetting = async (key: string, value: any) => {
    const supabase = createClient()
    await supabase.from("site_settings").upsert({ key, value })
    setSettings({ ...settings, [key]: value })
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
                <Input value={settings[key] || ""} onChange={(e) => updateSetting(key, e.target.value)} />
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
                <Switch checked={!!settings[key]} onCheckedChange={(v) => updateSetting(key, v)} />
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
                  onChange={(e) => updateSetting(key, e.target.value)}
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
