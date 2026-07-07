"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Key, ExternalLink, Zap, Activity,
  CheckCircle2, XCircle, Globe, ThumbsUp,
} from "lucide-react"
import {
  XLogo, FacebookLogo, YouTubeLogo, TelegramLogo, LinkedInLogo,
  RedditLogo, WhatsAppLogo, MediumLogo, DevtoLogo, HashnodeLogo,
  FlipboardLogo, BingLogo, PerplexityLogo, GoogleNewsLogo,
  ResendLogo, IndexNowLogo, PexelsLogo, OpenRouterLogo,
  GoogleAIStudioLogo, PinterestLogo,
} from "@/components/integrations/platform-logos"
import type { SocialAccount } from "@/types/database"

interface CredentialField {
  key: string
  label: string
  placeholder: string
  type: "text" | "password"
}

interface Integration {
  id: string
  name: string
  logo: React.ReactNode
  category: "social" | "content" | "developer" | "traffic"
  timeline: string
  benefit: string
  followUrl?: string
  credsUrl?: string
  fields: CredentialField[]
  hasAutoPublish: boolean
  guide: string[]
}

const integrations: Integration[] = [
  // ── SOCIAL PLATFORMS ──
  {
    id: "twitter", name: "Twitter / X", logo: <XLogo size={32} />, category: "social", timeline: "Day 1", benefit: "Follow & auto-publish",
    followUrl: "https://twitter.com", credsUrl: "https://developer.twitter.com/en/portal/dashboard",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "Consumer API Key", type: "password" },
      { key: "api_secret", label: "API Secret", placeholder: "Consumer API Secret", type: "password" },
      { key: "access_token", label: "Access Token", placeholder: "Access Token", type: "password" },
      { key: "access_token_secret", label: "Access Token Secret", placeholder: "Access Token Secret", type: "password" },
    ], hasAutoPublish: true,
    guide: [
      "Go to Twitter Developer Portal and sign in with your X account",
      "Create a new Project & App (free tier works)",
      "Under \"Keys and Tokens\", copy your API Key and API Secret",
      "Generate Access Token and Access Token Secret (read+write permissions)",
      "Paste all four values into the fields below",
    ],
  },
  {
    id: "facebook", name: "Facebook Page", logo: <FacebookLogo size={32} />, category: "social", timeline: "Day 1", benefit: "Follow & auto-publish",
    followUrl: "https://facebook.com", credsUrl: "https://developers.facebook.com/apps",
    fields: [
      { key: "page_id", label: "Page ID", placeholder: "Facebook Page ID", type: "text" },
      { key: "page_access_token", label: "Page Access Token", placeholder: "Page Access Token", type: "password" },
    ], hasAutoPublish: true,
    guide: [
      "Go to Facebook Developers and create a new app (Business type)",
      "Add the Facebook Login product and configure your page",
      "Find your Page ID: open your Facebook page → About → Page ID",
      "Generate a Page Access Token in Graph API Explorer with page_manage_posts permission",
      "Paste Page ID and Access Token below",
    ],
  },
  {
    id: "youtube_community", name: "YouTube Channel", logo: <YouTubeLogo size={32} />, category: "social", timeline: "Day 1", benefit: "Brand authority",
    followUrl: "https://youtube.com", credsUrl: "https://console.cloud.google.com/apis/credentials",
    fields: [
      { key: "channel_id", label: "Channel ID", placeholder: "YouTube Channel ID", type: "text" },
      { key: "api_key", label: "API Key", placeholder: "YouTube Data API Key", type: "password" },
    ], hasAutoPublish: false,
    guide: [
      "Go to Google Cloud Console and create or select a project",
      "Enable the YouTube Data API v3 from the API Library",
      "Go to Credentials → Create Credentials → API Key",
      "Find your Channel ID: open YouTube → your channel → URL has /channel/CHANNEL_ID",
      "Paste Channel ID and API Key below",
    ],
  },
  {
    id: "telegram", name: "Telegram Channel", logo: <TelegramLogo size={32} />, category: "social", timeline: "Day 1", benefit: "Nigerian traffic",
    followUrl: "https://t.me", credsUrl: "https://t.me/BotFather",
    fields: [
      { key: "bot_token", label: "Bot Token", placeholder: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", type: "password" },
      { key: "chat_id", label: "Chat ID", placeholder: "-1001234567890", type: "text" },
    ], hasAutoPublish: true,
    guide: [
      "Open Telegram and search for @BotFather",
      "Send /newbot and follow prompts to create a bot",
      "Copy the bot token (format: 123456:ABC-DEF...)",
      "Add your bot as an admin to your channel",
      "Send any message in the channel, then visit https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates to find your chat_id",
      "Paste Bot Token and Chat ID below",
    ],
  },
  {
    id: "linkedin", name: "LinkedIn Page", logo: <LinkedInLogo size={32} />, category: "social", timeline: "Day 1", benefit: "Professional traffic",
    followUrl: "https://linkedin.com", credsUrl: "https://www.linkedin.com/developers/apps",
    fields: [
      { key: "client_id", label: "Client ID", placeholder: "LinkedIn App Client ID", type: "text" },
      { key: "client_secret", label: "Client Secret", placeholder: "LinkedIn App Client Secret", type: "password" },
      { key: "access_token", label: "Access Token", placeholder: "LinkedIn Access Token", type: "password" },
    ], hasAutoPublish: true,
    guide: [
      "Go to LinkedIn Developers and create a new app",
      "Request the following OAuth 2.0 scopes: w_member_social, rw_organization_admin",
      "Copy your Client ID and Client Secret from the Auth tab",
      "Generate an Access Token via OAuth 2.0 flow (use LinkedIn's OAuth Token Generator for testing)",
      "Paste Client ID, Client Secret and Access Token below",
    ],
  },
  {
    id: "reddit", name: "Reddit", logo: <RedditLogo size={32} />, category: "social", timeline: "Day 1", benefit: "Viral traffic spikes",
    followUrl: "https://reddit.com", credsUrl: "https://www.reddit.com/prefs/apps",
    fields: [
      { key: "client_id", label: "Client ID", placeholder: "Reddit App Client ID", type: "text" },
      { key: "client_secret", label: "Client Secret", placeholder: "Reddit App Client Secret", type: "password" },
      { key: "refresh_token", label: "Refresh Token", placeholder: "Reddit Refresh Token", type: "password" },
    ], hasAutoPublish: true,
    guide: [
      "Go to Reddit App Preferences → Apps → Create App",
      "Select \"script\" type, give it a name, set redirect URI to http://localhost:8080",
      "Copy the Client ID (under the app name) and Client Secret",
      "Generate a Refresh Token using a tool like reddit-oauth-helper (requires read+submit+edit scope)",
      "Paste Client ID, Client Secret and Refresh Token below",
    ],
  },
  {
    id: "whatsapp", name: "WhatsApp Channel", logo: <WhatsAppLogo size={32} />, category: "social", timeline: "Day 1", benefit: "Nigerian audience",
    followUrl: "https://whatsapp.com/channel", credsUrl: "https://developers.facebook.com/apps",
    fields: [
      { key: "phone_number_id", label: "Phone Number ID", placeholder: "WhatsApp Phone Number ID", type: "text" },
      { key: "access_token", label: "Access Token", placeholder: "WhatsApp Access Token", type: "password" },
    ], hasAutoPublish: true,
    guide: [
      "Go to Facebook Developers → Create App → Business → WhatsApp",
      "Set up a WhatsApp Business Account and add a phone number",
      "From the WhatsApp dashboard, copy your Phone Number ID",
      "Generate a permanent Access Token (System User token with whatsapp_business_messaging permission)",
      "Paste Phone Number ID and Access Token below",
    ],
  },
  {
    id: "medium", name: "Medium", logo: <MediumLogo size={32} />, category: "social", timeline: "Week 1", benefit: "Crossposting",
    followUrl: "https://medium.com", credsUrl: "https://medium.com/me/settings/security",
    fields: [
      { key: "integration_token", label: "Integration Token", placeholder: "Medium Integration Token", type: "password" },
    ], hasAutoPublish: true,
    guide: [
      "Log in to Medium and go to Settings → Security and apps",
      "Scroll down to \"Integration tokens\"",
      "Enter a token name (e.g. \"Techpivo auto-publish\") and click \"Get integration token\"",
      "Copy the generated token and paste it below",
    ],
  },
  {
    id: "devto", name: "Dev.to", logo: <DevtoLogo size={32} />, category: "social", timeline: "Week 1", benefit: "Developer traffic",
    followUrl: "https://dev.to", credsUrl: "https://dev.to/settings/account",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "Dev.to API Key", type: "password" },
    ], hasAutoPublish: true,
    guide: [
      "Log in to Dev.to and go to Settings → Account",
      "Scroll down to the \"API Key\" section",
      "Click \"Generate API Key\" or copy your existing key",
      "Paste the API Key below",
    ],
  },
  {
    id: "hashnode", name: "Hashnode", logo: <HashnodeLogo size={32} />, category: "social", timeline: "Week 1", benefit: "Developer traffic",
    followUrl: "https://hashnode.com", credsUrl: "https://hashnode.com/settings/developer",
    fields: [
      { key: "personal_access_token", label: "Personal Access Token", placeholder: "Hashnode PAT", type: "password" },
    ], hasAutoPublish: true,
    guide: [
      "Log in to Hashnode and go to Settings → Developer",
      "Click \"Generate Personal Access Token\"",
      "Give it a name and select the required scopes (publish posts)",
      "Copy the generated token and paste it below",
    ],
  },
  {
    id: "flipboard", name: "Flipboard", logo: <FlipboardLogo size={32} />, category: "social", timeline: "Week 1", benefit: "Passive traffic",
    followUrl: "https://flipboard.com", fields: [], hasAutoPublish: false,
    guide: [
      "No API credentials needed — simply follow the Flipboard link above to share your content",
    ],
  },
  {
    id: "pinterest", name: "Pinterest", logo: <PinterestLogo size={32} />, category: "social", timeline: "Week 1", benefit: "Visual traffic",
    followUrl: "https://pinterest.com", credsUrl: "https://developers.pinterest.com/apps",
    fields: [
      { key: "access_token", label: "Access Token", placeholder: "Pinterest Access Token", type: "password" },
    ], hasAutoPublish: true,
    guide: [
      "Go to Pinterest Developers and create a new app",
      "Submit your app for review (required for write access)",
      "Once approved, generate an Access Token with pins:read and pins:write scopes",
      "Paste the Access Token below",
    ],
  },

  // ── CONTENT & DISCOVERY ──
  {
    id: "bing_news", name: "Bing News PubHub", logo: <BingLogo size={32} />, category: "content", timeline: "Week 1", benefit: "News indexing",
    credsUrl: "https://pubhub.bing.com",
    fields: [
      { key: "site_url", label: "Site URL", placeholder: "https://yoursite.com", type: "text" },
    ], hasAutoPublish: false,
    guide: [
      "Go to Bing PubHub and sign in with a Microsoft account",
      "Click \"Submit your site\" and enter your site URL",
      "Verify site ownership using a meta tag or XML file upload",
      "Once verified, your articles will appear in Bing News",
    ],
  },
  {
    id: "perplexity", name: "Perplexity Publisher", logo: <PerplexityLogo size={32} />, category: "content", timeline: "Week 1", benefit: "AI search citations",
    credsUrl: "https://perplexity.com/publisher",
    fields: [], hasAutoPublish: false,
    guide: [
      "Go to Perplexity Publisher page",
      "Register your site URL to appear as a citation source in Perplexity AI search results",
      "No API credentials required",
    ],
  },
  {
    id: "google_news", name: "Google News Publisher", logo: <GoogleNewsLogo size={32} />, category: "content", timeline: "Month 3", benefit: "Major traffic boost",
    credsUrl: "https://news.google.com/publisher",
    fields: [
      { key: "publication_url", label: "Publication URL", placeholder: "https://news.google.com/publications/...", type: "text" },
    ], hasAutoPublish: false,
    guide: [
      "Go to Google News Publisher Center",
      "Apply to add your publication (approval can take weeks)",
      "Once approved, configure your publication settings",
      "Your articles will automatically appear in Google News",
    ],
  },

  // ── DEVELOPER TOOLS & API ──
  {
    id: "resend", name: "Resend", logo: <ResendLogo size={32} />, category: "developer", timeline: "Week 1", benefit: "Newsletter delivery",
    credsUrl: "https://resend.com/api-keys",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "re_...", type: "password" },
    ], hasAutoPublish: false,
    guide: [
      "Go to Resend Dashboard and sign in or create an account",
      "Navigate to API Keys section",
      "Create a new API Key (select the appropriate permissions)",
      "Copy the key (format: re_...) and paste it below",
    ],
  },
  {
    id: "openrouter", name: "OpenRouter", logo: <OpenRouterLogo size={32} />, category: "developer", timeline: "Week 1", benefit: "AI fallback model",
    credsUrl: "https://openrouter.ai/keys",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "sk-or-v1-...", type: "password" },
      { key: "model", label: "Model", placeholder: "mistralai/mixtral-8x7b-instruct", type: "text" },
    ], hasAutoPublish: false,
    guide: [
      "Go to OpenRouter.ai and sign in or create an account",
      "Navigate to the API Keys page",
      "Click \"Create Key\" and copy the generated key (format: sk-or-v1-...)",
      "Choose your preferred model (default: mistralai/mixtral-8x7b-instruct)",
      "Paste the API Key and set your model name below",
    ],
  },
  {
    id: "google_ai_studio", name: "Google AI Studio", logo: <GoogleAIStudioLogo size={32} />, category: "developer", timeline: "Week 1", benefit: "Rotate Gemini key",
    credsUrl: "https://aistudio.google.com/apikey",
    fields: [
      { key: "api_key", label: "Gemini API Key", placeholder: "AIza...", type: "password" },
    ], hasAutoPublish: false,
    guide: [
      "Go to Google AI Studio and sign in with your Google account",
      "Click \"Get API Key\" in the left sidebar",
      "Create a new API key in Google Cloud (or use an existing project)",
      "Copy the key (format: AIza...) and paste it below",
    ],
  },
  {
    id: "pexels", name: "Pexels API", logo: <PexelsLogo size={32} />, category: "developer", timeline: "Week 1", benefit: "Article images",
    credsUrl: "https://www.pexels.com/api",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "Pexels API Key", type: "password" },
    ], hasAutoPublish: false,
    guide: [
      "Go to Pexels API page and click \"Join Free\" or sign in",
      "Once signed in, your API key is displayed on the dashboard",
      "Copy the API key and paste it below",
    ],
  },
  {
    id: "indexnow", name: "IndexNow", logo: <IndexNowLogo size={32} />, category: "developer", timeline: "Week 1", benefit: "Instant Bing indexing",
    credsUrl: "https://www.indexnow.org",
    fields: [
      { key: "key", label: "IndexNow Key", placeholder: "Auto-configured", type: "password" },
    ], hasAutoPublish: false,
    guide: [
      "IndexNow is auto-configured when you deploy to production",
      "The key is generated and set as an environment variable (INDEXNOW_KEY)",
      "No manual setup needed — Bing will automatically be notified of new content",
    ],
  },
]

const timelineColors: Record<string, string> = {
  "Day 1": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Week 1": "bg-blue-100 text-blue-700 border-blue-200",
  "Month 3": "bg-amber-100 text-amber-700 border-amber-200",
}

export default function AdminIntegrationsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [pageSpeedConfigured, setPageSpeedConfigured] = useState(false)
  const [statusLoading, setStatusLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [credForms, setCredForms] = useState<Record<string, Record<string, string>>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

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

  const saveCredentials = async (integration: Integration) => {
    const form = credForms[integration.id] || {}
    const supabase = createClient()

    setSaving((prev) => ({ ...prev, [integration.id]: true }))

    const { account_name, ...credValues } = form
    const existing = accounts.find((a) => a.platform === integration.id)

    if (existing) {
      await supabase.from("social_accounts").update({
        credentials: { ...existing.credentials, ...credValues },
        account_name: account_name || existing.account_name,
      }).eq("id", existing.id)
    } else {
      const { data } = await supabase.from("social_accounts").insert({
        platform: integration.id,
        account_name: account_name || integration.name,
        credentials: credValues,
        is_active: true,
        auto_publish: false,
        post_delay_minutes: 0,
      }).select().single()

      if (data) {
        setAccounts((prev) => [...prev, data as SocialAccount])
      }
    }

    setExpanded((prev) => ({ ...prev, [integration.id]: false }))
    setSaving((prev) => ({ ...prev, [integration.id]: false }))
  }

  const deleteAccount = async (id: string) => {
    const supabase = createClient()
    await supabase.from("social_accounts").delete().eq("id", id)
    setAccounts((prev) => prev.filter((a) => a.id !== id))
  }

  const toggleAutoPublish = async (id: string, value: boolean) => {
    const supabase = createClient()
    await supabase.from("social_accounts").update({ auto_publish: value }).eq("id", id)
    setAccounts((prev) => prev.map((a) => a.id === id ? { ...a, auto_publish: value } : a))
  }

  const filtered = activeTab === "all" ? integrations : integrations.filter((i) => i.category === activeTab)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">Integrations</h1>
        <p className="text-sm text-gray-500">Connect your platforms and services to enable auto-publishing and more</p>
      </div>

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
              const isConnected = !!account
              const isExpanded = expanded[integration.id]
              const form = credForms[integration.id] || {}
              const isSaving = saving[integration.id]

              const setFormValue = (key: string, value: string) => {
                setCredForms((prev) => ({
                  ...prev,
                  [integration.id]: { ...(prev[integration.id] || {}), [key]: value },
                }))
              }

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

                        <div className="flex flex-wrap items-center gap-2">
                          {(integration.followUrl || account?.credentials?.follow_url) && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={account?.credentials?.follow_url || integration.followUrl!} target="_blank" rel="noopener noreferrer">
                                <ThumbsUp className="h-3 w-3 mr-1" />
                                Follow
                              </a>
                            </Button>
                          )}
                          {isConnected ? (
                            <>
                              <Badge className="bg-green-100 text-green-700 border-green-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Connected
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCredForms((prev) => ({
                                    ...prev,
                                    [integration.id]: account?.credentials || {},
                                  }))
                                  setExpanded((prev) => ({ ...prev, [integration.id]: !isExpanded }))
                                }}
                              >
                                Manage
                              </Button>
                              {!isExpanded && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => deleteAccount(account.id)}
                                >
                                  Disconnect
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setCredForms((prev) => ({
                                  ...prev,
                                  [integration.id]: {},
                                }))
                                setExpanded((prev) => ({ ...prev, [integration.id]: true }))
                              }}
                            >
                              Connect
                            </Button>
                          )}
                        </div>
                        {isConnected && integration.hasAutoPublish && (
                          <div className="flex items-center justify-between mt-3 pt-3 border-t">
                            <span className="text-xs text-gray-600">Auto-publish articles</span>
                            <Switch
                              checked={account?.auto_publish ?? false}
                              onCheckedChange={(v) => toggleAutoPublish(account!.id, v)}
                            />
                          </div>
                        )}
                        {isConnected && integration.id === 'facebook' && (
                          <div className="mt-3 pt-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={async () => {
                                try {
                                  setSaving((prev) => ({ ...prev, ['test_facebook']: true }))
                                  const res = await fetch('/api/admin/social/test-post', { method: 'POST' })
                                  const data = await res.json()
                                  if (data.success) {
                                    alert(`✅ Test post published!\n\nPost ID: ${data.postId}\nView: ${data.url}`)
                                  } else {
                                    alert(`❌ Failed: ${data.error}`)
                                  }
                                } catch (e: any) {
                                  alert(`❌ Error: ${e.message}`)
                                } finally {
                                  setSaving((prev) => ({ ...prev, ['test_facebook']: false }))
                                }
                              }}
                              disabled={saving['test_facebook']}
                            >
                              {saving['test_facebook'] ? 'Posting...' : 'Send Test Post → Facebook'}
                            </Button>
                          </div>
                        )}

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t space-y-4">
                            <details className="group bg-blue-50/50 border border-blue-200 rounded-lg open:pb-3">
                              <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer text-xs font-medium text-blue-800 hover:bg-blue-100/50 rounded-lg [&::-webkit-details-marker]:hidden">
                                <span>Guide</span>
                                <span className="ml-auto text-blue-500 group-open:hidden">Show steps</span>
                                <span className="ml-auto text-blue-500 hidden group-open:inline">Hide steps</span>
                              </summary>
                              <ol className="px-3 pt-1 space-y-1.5">
                                {integration.guide.map((step, i) => (
                                  <li key={i} className="text-xs text-blue-900/80 flex gap-2">
                                    <span className="shrink-0 font-medium text-blue-600">{i + 1}.</span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </details>

                            {integration.credsUrl && (
                              <Button variant="outline" size="sm" asChild className="w-full">
                                <a href={integration.credsUrl} target="_blank" rel="noopener noreferrer">
                                  Get credentials <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              </Button>
                            )}

                            <Input
                              placeholder="Account name (optional)"
                              value={form.account_name || ""}
                              onChange={(e) => setFormValue("account_name", e.target.value)}
                              className="text-sm"
                            />
                            {integration.followUrl && (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Your profile/follow URL</label>
                                <Input
                                  type="text"
                                  placeholder={integration.followUrl}
                                  value={form.follow_url || ""}
                                  onChange={(e) => setFormValue("follow_url", e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                            )}
                            {integration.fields.length > 0 && (
                              <div className="space-y-3">
                                <p className="text-xs font-medium text-gray-700">API Credentials</p>
                                {integration.fields.map((field) => (
                                  <div key={field.key}>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                                    <Input
                                      type={field.type}
                                      placeholder={field.placeholder}
                                      value={form[field.key] || ""}
                                      onChange={(e) => setFormValue(field.key, e.target.value)}
                                      className="text-sm font-mono"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2 pt-1">
                              <Button
                                size="sm"
                                onClick={() => saveCredentials(integration)}
                                disabled={isSaving}
                              >
                                {isSaving ? "Saving..." : isConnected ? "Update" : "Save"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpanded((prev) => ({ ...prev, [integration.id]: false }))}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
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
          Analytics &amp; Verification
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Site-wide tracking and verification credentials.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <SearchIcon className="h-4 w-4 text-orange-500" />
                Google Search Console Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={settings.google_search_console_verification || ""}
                  onChange={(e) => updateSetting("google_search_console_verification", e.target.value)}
                  placeholder="meta tag content"
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
                <SearchIcon className="h-4 w-4 text-blue-500" />
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

function SearchIcon(props: any) {
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
