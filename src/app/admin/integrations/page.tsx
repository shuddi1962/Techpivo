"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Key, ExternalLink, Zap, Activity,
  CheckCircle2, XCircle, Globe, Settings,
} from "lucide-react"
import {
  XLogo, FacebookLogo, YouTubeLogo, TelegramLogo, LinkedInLogo,
  RedditLogo, WhatsAppLogo, MediumLogo, DevtoLogo, HashnodeLogo,
  FlipboardLogo, BingLogo, PerplexityLogo, GoogleNewsLogo,
  ResendLogo, IndexNowLogo, PexelsLogo, OpenRouterLogo,
  GoogleAIStudioLogo, PinterestLogo,
} from "@/components/integrations/platform-logos"
import type { SocialAccount } from "@/types/database"

interface Integration {
  id: string
  name: string
  logo: React.ReactNode
  category: "social" | "content" | "developer" | "traffic"
  timeline: string
  benefit: string
  connectUrl: string
  external: boolean
}

const integrations: Integration[] = [
  // ── SOCIAL PLATFORMS ──
  { id: "twitter", name: "Twitter / X", logo: <XLogo size={32} />, category: "social", timeline: "Day 1", benefit: "Free Social + auto-publish", connectUrl: "https://twitter.com/i/flow/login", external: true },
  { id: "facebook", name: "Facebook Page", logo: <FacebookLogo size={32} />, category: "social", timeline: "Day 1", benefit: "Free Social + auto-publish", connectUrl: "https://business.facebook.com", external: true },
  { id: "youtube_community", name: "YouTube Channel", logo: <YouTubeLogo size={32} />, category: "social", timeline: "Day 1", benefit: "Brand authority", connectUrl: "https://studio.youtube.com", external: true },
  { id: "telegram", name: "Telegram Channel", logo: <TelegramLogo size={32} />, category: "social", timeline: "Day 1", benefit: "Nigerian traffic", connectUrl: "https://telegram.org", external: true },
  { id: "linkedin", name: "LinkedIn Page", logo: <LinkedInLogo size={32} />, category: "social", timeline: "Day 1", benefit: "Professional traffic", connectUrl: "https://linkedin.com", external: true },
  { id: "reddit", name: "Reddit", logo: <RedditLogo size={32} />, category: "social", timeline: "Day 1", benefit: "Viral traffic spikes", connectUrl: "https://reddit.com/prefs/apps", external: true },
  { id: "whatsapp", name: "WhatsApp Channel", logo: <WhatsAppLogo size={32} />, category: "social", timeline: "Day 1", benefit: "Nigerian audience", connectUrl: "https://business.whatsapp.com", external: true },
  { id: "medium", name: "Medium", logo: <MediumLogo size={32} />, category: "social", timeline: "Week 1", benefit: "Crossposting", connectUrl: "https://medium.com/me/settings", external: true },
  { id: "devto", name: "Dev.to", logo: <DevtoLogo size={32} />, category: "social", timeline: "Week 1", benefit: "Developer traffic", connectUrl: "https://dev.to/settings", external: true },
  { id: "hashnode", name: "Hashnode", logo: <HashnodeLogo size={32} />, category: "social", timeline: "Week 1", benefit: "Developer traffic", connectUrl: "https://hashnode.com/settings", external: true },
  { id: "flipboard", name: "Flipboard", logo: <FlipboardLogo size={32} />, category: "social", timeline: "Week 1", benefit: "Passive traffic", connectUrl: "https://about.flipboard.com", external: true },
  { id: "pinterest", name: "Pinterest", logo: <PinterestLogo size={32} />, category: "social", timeline: "Week 1", benefit: "Visual traffic", connectUrl: "https://pinterest.com/business", external: true },

  // ── CONTENT & DISCOVERY ──
  { id: "bing_news", name: "Bing News PubHub", logo: <BingLogo size={32} />, category: "content", timeline: "Week 1", benefit: "News indexing", connectUrl: "https://pubhub.bing.com", external: true },
  { id: "perplexity", name: "Perplexity Publisher", logo: <PerplexityLogo size={32} />, category: "content", timeline: "Week 1", benefit: "AI search citations", connectUrl: "https://perplexity.com/publisher", external: true },
  { id: "google_news", name: "Google News Publisher", logo: <GoogleNewsLogo size={32} />, category: "content", timeline: "Month 3", benefit: "Major traffic boost", connectUrl: "https://news.google.com/publisher", external: true },

  // ── DEVELOPER TOOLS & API ──
  { id: "resend", name: "Resend", logo: <ResendLogo size={32} />, category: "developer", timeline: "Week 1", benefit: "Newsletter delivery", connectUrl: "https://resend.com", external: true },
  { id: "openrouter", name: "OpenRouter", logo: <OpenRouterLogo size={32} />, category: "developer", timeline: "Week 1", benefit: "AI fallback model", connectUrl: "https://openrouter.ai", external: true },
  { id: "google_ai_studio", name: "Google AI Studio", logo: <GoogleAIStudioLogo size={32} />, category: "developer", timeline: "Week 1", benefit: "Rotate Gemini key", connectUrl: "https://aistudio.google.com", external: true },
  { id: "pexels", name: "Pexels API", logo: <PexelsLogo size={32} />, category: "developer", timeline: "Week 1", benefit: "Article images", connectUrl: "https://pexels.com/api", external: true },
  { id: "indexnow", name: "IndexNow", logo: <IndexNowLogo size={32} />, category: "developer", timeline: "Week 1", benefit: "Instant Bing indexing", connectUrl: "https://indexnow.org", external: true },
]

const timelineColors: Record<string, string> = {
  "Day 1": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Week 1": "bg-blue-100 text-blue-700 border-blue-200",
  "Month 3": "bg-amber-100 text-amber-700 border-amber-200",
}

const categoryLabels: Record<string, string> = {
  social: "Social Platforms",
  content: "Content & Discovery",
  developer: "Developer Tools & APIs",
  traffic: "Traffic & Analytics",
}

const categoryIcons: Record<string, React.ReactNode> = {
  social: <Globe className="h-5 w-5 text-blue-500" />,
  content: <Activity className="h-5 w-5 text-emerald-500" />,
  developer: <Settings className="h-5 w-5 text-purple-500" />,
}

function ConnectionButton({ integration, account, onManage }: {
  integration: Integration
  account: SocialAccount | undefined
  onManage: () => void
}) {
  if (integration.category === "social") {
    if (account) {
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
          <Button variant="outline" size="sm" onClick={onManage}>
            Manage
          </Button>
        </div>
      )
    }
    return (
      <Button variant="default" size="sm" asChild>
        <a href={integration.connectUrl} target="_blank" rel="noopener noreferrer">
          Connect <ExternalLink className="h-3 w-3 ml-1" />
        </a>
      </Button>
    )
  }
  return (
    <Button variant="outline" size="sm" asChild>
      <a href={integration.connectUrl} target="_blank" rel="noopener noreferrer">
        Set up <ExternalLink className="h-3 w-3 ml-1" />
      </a>
    </Button>
  )
}

export default function AdminIntegrationsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [pageSpeedConfigured, setPageSpeedConfigured] = useState(false)
  const [statusLoading, setStatusLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    const supabase = createClient()

    supabase.from("social_accounts").select("*").order("platform").then(({ data }) => {
      if (data) setAccounts(data)
    })

    supabase.from("site_settings").select("*").then(({ data }) => {
      if (data) {
        const map: Record<string, any> = {}
        data.forEach((s) => { map[s.key] = s.value })
        setSettings(map)
      }
    })

    fetch("/api/admin/analytics/status")
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

  const hasSetting = (key: string) => !!(settings[key] || (key === "pagespeed" && pageSpeedConfigured))

  const filtered = activeTab === "all" ? integrations : integrations.filter((i) => i.category === activeTab)

  const categories = [...new Set(integrations.map((i) => i.category))]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">Integrations</h1>
        <p className="text-sm text-gray-500">Connect your platforms and services to enable auto-publishing and more</p>
      </div>

      {/* GUIDE */}
      <details className="group border rounded-lg bg-amber-50/50 border-amber-200 open:pb-4">
        <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer text-sm font-medium text-amber-900 hover:bg-amber-100/50 rounded-lg [&::-webkit-details-marker]:hidden">
          <span className="text-lg leading-none">📘</span>
          How to connect accounts — step-by-step guide
          <span className="ml-auto text-xs text-amber-600 group-open:hidden">Click to expand</span>
          <span className="ml-auto text-xs text-amber-600 hidden group-open:inline">Click to collapse</span>
        </summary>
        <div className="px-4 pt-2 space-y-3 text-sm text-amber-900/80">
          <div>
            <strong className="text-amber-900">1. Social Platforms</strong>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Create a business/creator account on the platform (e.g. Twitter/X, Facebook Page, LinkedIn Page).</li>
              <li>Go to the platform's developer portal and create an app to obtain API credentials (API key, API secret, OAuth tokens, etc.).</li>
              <li>For auto-publishing: the system stores tokens per platform in the <code className="px-1 bg-amber-100 rounded text-xs font-mono">social_accounts</code> table.</li>
              <li>Click <strong>"Connect"</strong> on the card — it opens the platform's sign-in/setup page.</li>
              <li>After authorising, come back and click <strong>"Manage"</strong> to configure auto-publish settings.</li>
            </ul>
          </div>
          <div>
            <strong className="text-amber-900">2. Content &amp; Discovery</strong>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Bing News PubHub — submit your site at <code className="px-1 bg-amber-100 rounded text-xs font-mono">pubhub.bing.com</code>. Requires site verification (use the meta tag or XML file).</li>
              <li>Perplexity Publisher — register your site to appear as an AI-search citation source.</li>
              <li>Google News Publisher — apply via Google News Publisher Center. Approval can take weeks.</li>
            </ul>
          </div>
          <div>
            <strong className="text-amber-900">3. Developer Tools &amp; API Keys</strong>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>OpenRouter — sign up at openrouter.ai, generate an API key, paste it in the field below.</li>
              <li>Google AI Studio — get a Gemini API key from aistudio.google.com.</li>
              <li>Pexels — register at pexels.com/api for a free API key (article images).</li>
              <li>Resend — create an account at resend.com for transactional email / newsletter delivery.</li>
              <li>IndexNow — auto-configured (no manual setup needed).</li>
            </ul>
          </div>
          <div>
            <strong className="text-amber-900">4. Environment Variables (Vercel)</strong>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Some services require env vars set directly in Vercel dashboard (e.g. <code className="px-1 bg-amber-100 rounded text-xs font-mono">PAGESPEED_API_KEY</code>, <code className="px-1 bg-amber-100 rounded text-xs font-mono">INDEXNOW_KEY</code>).</li>
              <li>Go to <strong>Vercel → Project → Settings → Environment Variables</strong> to add them.</li>
              <li>After adding, redeploy the site for changes to take effect.</li>
            </ul>
          </div>
          <p className="text-xs text-amber-700 border-t border-amber-200 pt-2 mt-3">
            💡 <strong>Tip:</strong> After connecting an account, post a test article to verify auto-publishing works before scheduling bulk content.
          </p>
        </div>
      </details>

      <Tabs defaultValue="all" onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="social">Social Platforms</TabsTrigger>
          <TabsTrigger value="content">Content & Discovery</TabsTrigger>
          <TabsTrigger value="developer">Developer Tools</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((integration) => {
              const account = accounts.find((a) => a.platform === integration.id)
              const isConnected = !!account || (integration.id === "openrouter" && hasSetting("openrouter_api_key"))

              return (
                <Card key={integration.id} className={`transition-shadow hover:shadow-md ${isConnected ? "ring-1 ring-green-200" : ""}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0">
                        {integration.logo}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-semibold text-gray-900 truncate">{integration.name}</span>
                          <Badge variant="outline" className={`shrink-0 text-[10px] font-medium ${timelineColors[integration.timeline] || ""}`}>
                            {integration.timeline}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">{integration.benefit}</p>
                        <div className="flex items-center gap-2">
                          <ConnectionButton
                            integration={integration}
                            account={account}
                            onManage={() => window.location.href = "/admin/social"}
                          />
                          {isConnected && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      <div className="border-t pt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Key className="h-5 w-5 text-indigo-500" />
          API Keys &amp; Tokens
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Manage your service credentials. Keys are stored encrypted in the database.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                OpenRouter API Key
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={settings.openrouter_api_key || ""}
                  onChange={(e) => updateSetting("openrouter_api_key", e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="flex-1 font-mono"
                />
                <Badge variant={settings.openrouter_api_key ? "default" : "secondary"}>
                  {settings.openrouter_api_key ? "Set" : "Not set"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                OpenRouter Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={settings.openrouter_model || ""}
                  onChange={(e) => updateSetting("openrouter_model", e.target.value)}
                  placeholder="mistralai/mixtral-8x7b-instruct"
                  className="flex-1 font-mono text-sm"
                />
                <Badge variant={settings.openrouter_model ? "default" : "secondary"}>
                  {settings.openrouter_model ? "Set" : "Not set"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-4 w-4 text-blue-500" />
                Google Analytics 4 ID
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={settings.ga4_measurement_id || ""}
                  onChange={(e) => updateSetting("ga4_measurement_id", e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                  className="flex-1 font-mono"
                />
                <Badge variant={settings.ga4_measurement_id ? "default" : "secondary"}>
                  {settings.ga4_measurement_id ? "Set" : "Not set"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-4 w-4 text-blue-500" />
                Google Tag Manager ID
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={settings.gtm_container_id || ""}
                  onChange={(e) => updateSetting("gtm_container_id", e.target.value)}
                  placeholder="GTM-XXXXXXX"
                  className="flex-1 font-mono text-sm"
                />
                <Badge variant={settings.gtm_container_id ? "default" : "secondary"}>
                  {settings.gtm_container_id ? "Set" : "Not set"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-4 w-4 text-green-500" />
                PostHog API Key
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={settings.posthog_api_key || ""}
                  onChange={(e) => updateSetting("posthog_api_key", e.target.value)}
                  placeholder="phc_..."
                  className="flex-1 font-mono"
                />
                <Badge variant={settings.posthog_api_key ? "default" : "secondary"}>
                  {settings.posthog_api_key ? "Set" : "Not set"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-4 w-4 text-green-500" />
                PostHog Host
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={settings.posthog_host || ""}
                  onChange={(e) => updateSetting("posthog_host", e.target.value)}
                  placeholder="https://us.i.posthog.com"
                  className="flex-1 font-mono text-sm"
                />
                <Badge variant={settings.posthog_host ? "default" : "secondary"}>
                  {settings.posthog_host ? "Set" : "Not set"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-4 w-4 text-orange-500" />
                Google Search Console Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={settings.google_search_console_verification || ""}
                  onChange={(e) => updateSetting("google_search_console_verification", e.target.value)}
                  placeholder="&lt;meta&gt; tag content"
                  className="flex-1 font-mono"
                />
                <Badge variant={settings.google_search_console_verification ? "default" : "secondary"}>
                  {settings.google_search_console_verification ? "Set" : "Not set"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-500" />
                Bing Webmaster Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={settings.bing_webmaster_verification || ""}
                  onChange={(e) => updateSetting("bing_webmaster_verification", e.target.value)}
                  placeholder="Verification code"
                  className="flex-1 font-mono"
                />
                <Badge variant={settings.bing_webmaster_verification ? "default" : "secondary"}>
                  {settings.bing_webmaster_verification ? "Set" : "Not set"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* EXTERNAL SERVICES */}
      <div className="border-t pt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          External Services
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          These services use server-side environment variables configured in Vercel.
          <a href="https://vercel.com/shuddi1962s-projects/techpivo/settings/environment-variables" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 ml-1 text-indigo-500 hover:underline">
            Manage in Vercel <ExternalLink className="h-3 w-3" />
          </a>
        </p>
        {statusLoading ? (
          <div className="text-sm text-gray-400">Checking connection status...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-lg shrink-0" style={{ background: "#FBBC0415" }}>
                    <Zap className="h-5 w-5" style={{ color: "#FBBC04" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">PageSpeed Insights</span>
                      {pageSpeedConfigured ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not configured
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">Performance, LCP, INP, CLS scores</p>
                    <code className="px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded text-[10px] font-mono text-gray-600">
                      PAGESPEED_API_KEY
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

function Search(props: any) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}
