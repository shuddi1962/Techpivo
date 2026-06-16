"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Key, ExternalLink, Zap, Activity,
  CheckCircle2, XCircle,
} from "lucide-react"

const integrationFields = [
  { key: "openrouter_api_key", label: "OpenRouter API Key", placeholder: "sk-or-v1-..." },
  { key: "ga4_measurement_id", label: "Google Analytics 4 ID (frontend)", placeholder: "G-XXXXXXXXXX" },
  { key: "gtm_container_id", label: "Google Tag Manager ID", placeholder: "GTM-XXXXXXX" },
  { key: "google_search_console_verification", label: "Search Console Verification Meta", placeholder: "<meta> tag content" },
  { key: "bing_webmaster_verification", label: "Bing Webmaster Verification", placeholder: "Verification code" },
  { key: "openrouter_model", label: "OpenRouter Model", placeholder: "mistralai/mixtral-8x7b-instruct" },
  { key: "posthog_api_key", label: "PostHog API Key (public)", placeholder: "phc_..." },
  { key: "posthog_host", label: "PostHog Host", placeholder: "https://us.i.posthog.com" },
]

function PageSpeedCard({ configured }: { configured: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-lg shrink-0" style={{ background: '#FBBC0415' }}>
            <Zap className="h-5 w-5" style={{ color: '#FBBC04' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900">PageSpeed Insights</span>
              {configured ? (
                <Badge variant="default" className="bg-[#34A853] hover:bg-[#2D9248]">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not configured
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-2">Performance, LCP, INP, CLS scores</p>
            <div className="flex flex-wrap gap-1.5">
              <code className="px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded text-[10px] font-mono text-gray-600">
                PAGESPEED_API_KEY
              </code>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminIntegrationsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [pageSpeedConfigured, setPageSpeedConfigured] = useState(false)
  const [statusLoading, setStatusLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.from("site_settings").select("*").then(({ data }) => {
      if (data) {
        const map: Record<string, any> = {}
        data.forEach((s) => { map[s.key] = s.value })
        setSettings(map)
      }
    })

    fetch('/api/admin/analytics/status')
      .then((r) => r.json())
      .then((d) => setPageSpeedConfigured(!!d.pageSpeed))
      .catch(() => setPageSpeedConfigured(false))
      .finally(() => setStatusLoading(false))
  }, [])

  const updateSetting = async (key: string, value: any) => {
    const supabase = createClient()
    await supabase.from("site_settings").upsert({ key, value })
    setSettings({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Integrations</h1>
        <p className="text-sm text-gray-500">Manage third‑party service connections and API keys</p>
      </div>

      {/* PAGESPEED */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#4285F4]" />
          External Services
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          These services use server‑side environment variables configured in Vercel. 
          <a href="https://vercel.com/shuddi1962s-projects/techpivo/settings/environment-variables" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 ml-1 text-[#6366F1] hover:underline">
            Manage in Vercel <ExternalLink className="h-3 w-3" />
          </a>
        </p>
        {statusLoading ? (
          <div className="text-sm text-gray-400">Checking connection status...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PageSpeedCard configured={pageSpeedConfigured} />
          </div>
        )}
      </div>

      {/* SITE INTEGRATION KEYS */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Key className="h-5 w-5 text-[#6366F1]" />
          Site Keys &amp; Tokens
        </h2>
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
    </div>
  )
}
