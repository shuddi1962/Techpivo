"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Key, ExternalLink } from "lucide-react"

const integrationFields = [
  { key: "openrouter_api_key", label: "OpenRouter API Key", placeholder: "sk-or-v1-..." },
  { key: "ga4_measurement_id", label: "Google Analytics 4 ID", placeholder: "G-XXXXXXXXXX" },
  { key: "gtm_container_id", label: "Google Tag Manager ID", placeholder: "GTM-XXXXXXX" },
  { key: "google_search_console_verification", label: "Search Console Verification Meta", placeholder: "<meta> tag content" },
  { key: "bing_webmaster_verification", label: "Bing Webmaster Verification", placeholder: "Verification code" },
  { key: "openrouter_model", label: "OpenRouter Model", placeholder: "mistralai/mixtral-8x7b-instruct" },
]

export default function AdminIntegrationsPage() {
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
      <h1 className="text-3xl font-bold mb-6">Integrations</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrationFields.map((field) => (
          <Card key={field.key}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-4 w-4" />
                {field.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={settings[field.key] || ""}
                  onChange={(e) => updateSetting(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="flex-1 font-mono"
                />
                <Badge variant={settings[field.key] ? "default" : "secondary"}>
                  {settings[field.key] ? "Set" : "Not set"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
