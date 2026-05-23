"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Save } from "lucide-react"

export default function AdminSeoPage() {
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

  const stringFields = [
    { key: "site_name", label: "Site Name" },
    { key: "site_tagline", label: "Tagline" },
    { key: "default_meta_description", label: "Default Meta Description" },
    { key: "default_og_image", label: "Default OG Image URL" },
    { key: "ga4_measurement_id", label: "Google Analytics 4 ID" },
    { key: "gtm_container_id", label: "Google Tag Manager ID" },
    { key: "google_search_console_verification", label: "Search Console Verification" },
    { key: "bing_webmaster_verification", label: "Bing Webmaster Verification" },
    { key: "adsense_publisher_id", label: "AdSense Publisher ID" },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">SEO Settings</h1>

      <div className="space-y-6">
        {stringFields.map((field) => (
          <Card key={field.key}>
            <CardContent className="p-4">
              <label className="text-sm font-medium mb-1 block">{field.label}</label>
              <div className="flex gap-2">
                <Input
                  value={settings[field.key] || ""}
                  onChange={(e) => updateSetting(field.key, e.target.value)}
                  placeholder={field.label}
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader><CardTitle className="text-lg">Schema Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Auto-generate Breadcrumb Schema</Label>
              <Switch
                checked={settings.schema_breadcrumb === true}
                onCheckedChange={(v) => updateSetting("schema_breadcrumb", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto-generate Article Schema</Label>
              <Switch
                checked={settings.schema_article === true}
                onCheckedChange={(v) => updateSetting("schema_article", v)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
