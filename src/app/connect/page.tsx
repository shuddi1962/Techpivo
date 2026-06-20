"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ExternalLink, CheckCircle2, XCircle, ArrowRight, Users, Share2, Zap, Globe, Search, Settings, BarChart3 } from "lucide-react"
import type { SocialAccount } from "@/types/database"
import {
  XLogo, FacebookLogo, YouTubeLogo, TelegramLogo, LinkedInLogo,
  RedditLogo, WhatsAppLogo, MediumLogo, DevtoLogo, HashnodeLogo,
  FlipboardLogo, BingLogo, PerplexityLogo, GoogleNewsLogo,
  ResendLogo, IndexNowLogo, PexelsLogo, OpenRouterLogo,
  GoogleAIStudioLogo,
} from "@/components/integrations/platform-logos"

interface PlatformDef {
  id: string
  name: string
  logo: React.ReactNode
  color: string
  timeline: string
  benefit: string
  category: "social" | "content" | "traffic" | "developer"
  connectUrl: string
  description: string
}

const platforms: PlatformDef[] = [
  { id: "twitter", name: "Twitter / X", logo: <XLogo size={28} />, color: "#000000", timeline: "Day 1", benefit: "FreeSocial + auto-publish", category: "social", connectUrl: "https://twitter.com/i/flow/login", description: "Share articles instantly to your X/Twitter feed" },
  { id: "facebook", name: "Facebook Page", logo: <FacebookLogo size={28} />, color: "#1877F2", timeline: "Day 1", benefit: "FreeSocial + auto-publish", category: "social", connectUrl: "https://business.facebook.com", description: "Auto-post to your Facebook Page" },
  { id: "youtube_community", name: "YouTube Channel", logo: <YouTubeLogo size={28} />, color: "#FF0000", timeline: "Day 1", benefit: "Brand authority", category: "social", connectUrl: "https://studio.youtube.com", description: "Cross-post to YouTube Community" },
  { id: "telegram", name: "Telegram Channel", logo: <TelegramLogo size={28} />, color: "#0088CC", timeline: "Day 1", benefit: "Nigerian traffic", category: "social", connectUrl: "https://telegram.org", description: "Broadcast to your Telegram audience" },
  { id: "linkedin", name: "LinkedIn Page", logo: <LinkedInLogo size={28} />, color: "#0A66C2", timeline: "Day 1", benefit: "Professional traffic", category: "social", connectUrl: "https://www.linkedin.com", description: "Share with professionals and B2B audience" },
  { id: "reddit", name: "Reddit", logo: <RedditLogo size={28} />, color: "#FF4500", timeline: "Day 1", benefit: "Viral traffic spikes", category: "social", connectUrl: "https://www.reddit.com/prefs/apps", description: "Submit to relevant subreddits" },
  { id: "whatsapp", name: "WhatsApp Channel", logo: <WhatsAppLogo size={28} />, color: "#25D366", timeline: "Day 1", benefit: "Nigerian audience", category: "social", connectUrl: "https://business.whatsapp.com", description: "Broadcast to WhatsApp followers" },
  { id: "medium", name: "Medium", logo: <MediumLogo size={28} />, color: "#000000", timeline: "Week 1", benefit: "Crossposting", category: "content", connectUrl: "https://medium.com/me/settings", description: "Republish full articles on Medium" },
  { id: "devto", name: "Dev.to", logo: <DevtoLogo size={28} />, color: "#0A0A0A", timeline: "Week 1", benefit: "Developer traffic", category: "content", connectUrl: "https://dev.to/settings", description: "Cross-post to dev.to community" },
  { id: "hashnode", name: "Hashnode", logo: <HashnodeLogo size={28} />, color: "#2962FF", timeline: "Week 1", benefit: "Developer traffic", category: "content", connectUrl: "https://hashnode.com/settings", description: "Republish on your Hashnode blog" },
  { id: "flipboard", name: "Flipboard", logo: <FlipboardLogo size={28} />, color: "#E12828", timeline: "Week 1", benefit: "Passive traffic", category: "content", connectUrl: "https://about.flipboard.com", description: "Curate articles into Flipboard magazines" },
  { id: "bing_news", name: "Bing News PubHub", logo: <BingLogo size={28} />, color: "#008373", timeline: "Week 1", benefit: "News indexing", category: "content", connectUrl: "https://pubhub.bing.com", description: "Get indexed in Bing News" },
  { id: "perplexity", name: "Perplexity Publisher", logo: <PerplexityLogo size={28} />, color: "#1A3CFF", timeline: "Week 1", benefit: "AI search citations", category: "content", connectUrl: "https://perplexity.com/publisher", description: "Get cited in Perplexity AI answers" },
  { id: "google_news", name: "Google News Publisher", logo: <GoogleNewsLogo size={28} />, color: "#4285F4", timeline: "Month 3", benefit: "Major traffic boost", category: "traffic", connectUrl: "https://news.google.com/publisher", description: "Appear in Google News results" },
  { id: "resend", name: "Resend", logo: <ResendLogo size={28} />, color: "#000000", timeline: "Week 1", benefit: "Newsletter", category: "developer", connectUrl: "https://resend.com", description: "Send newsletters via Resend API" },
  { id: "indexnow", name: "IndexNow", logo: <IndexNowLogo size={28} />, color: "#F57C00", timeline: "Week 1", benefit: "Instant Bing indexing", category: "developer", connectUrl: "https://indexnow.org", description: "Instantly index content on Bing" },
  { id: "pexels", name: "Pexels API", logo: <PexelsLogo size={28} />, color: "#05A081", timeline: "Week 1", benefit: "Article images", category: "developer", connectUrl: "https://www.pexels.com/api", description: "Auto-fetch images for articles" },
  { id: "openrouter", name: "OpenRouter", logo: <OpenRouterLogo size={28} />, color: "#FF6B35", timeline: "Week 1", benefit: "AI fallback model", category: "developer", connectUrl: "https://openrouter.ai", description: "AI model fallback for content generation" },
  { id: "google_ai_studio", name: "Google AI Studio", logo: <GoogleAIStudioLogo size={28} />, color: "#4285F4", timeline: "Week 1", benefit: "Rotate Gemini key", category: "developer", connectUrl: "https://aistudio.google.com", description: "Multi-key Gemini rotation for reliability" },
]

const categoryConfig = {
  social: { label: "Social Platforms", icon: Share2, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800" },
  content: { label: "Content & Discovery", icon: Globe, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800" },
  traffic: { label: "Traffic & Growth", icon: BarChart3, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800" },
  developer: { label: "Developer Tools & APIs", icon: Settings, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800" },
}

const timelineColors: Record<string, string> = {
  "Day 1": "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700",
  "Week 1": "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700",
  "Month 3": "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700",
}

export default function ConnectPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.from("social_accounts").select("*").order("platform").then(({ data }) => {
      if (data) setAccounts(data)
      setLoading(false)
    })

    const channel = supabase
      .channel("connect_page_social")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_accounts" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setAccounts((prev) => [...prev, payload.new as SocialAccount])
        } else if (payload.eventType === "UPDATE") {
          setAccounts((prev) => prev.map((a) => (a.id === (payload.new as SocialAccount).id ? payload.new as SocialAccount : a)))
        } else if (payload.eventType === "DELETE") {
          setAccounts((prev) => prev.filter((a) => a.id !== (payload.old as SocialAccount).id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const toggleAutoPublish = async (id: string, value: boolean) => {
    const supabase = createClient()
    await supabase.from("social_accounts").update({ auto_publish: value }).eq("id", id)
  }

  const categories = ["social", "content", "traffic", "developer"] as const

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-[#0a0a0a] dark:to-[#111]">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            One-click connections — real-time sync
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-gray-900 via-amber-600 to-gray-900 dark:from-white dark:via-amber-400 dark:to-white bg-clip-text text-transparent">
            Connect Your Platforms
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Link all your social media, publishing, and developer tools in one place.
            Every new article is automatically published to every connected platform.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-amber-500">{platforms.length}</p>
              <p className="text-xs text-muted-foreground">Available Platforms</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-emerald-500">{accounts.filter((a) => a.is_active).length}</p>
              <p className="text-xs text-muted-foreground">Connected</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-500">{accounts.filter((a) => a.auto_publish).length}</p>
              <p className="text-xs text-muted-foreground">Auto-Publishing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-500">{accounts.reduce((s, a) => s + a.total_posts_sent, 0)}</p>
              <p className="text-xs text-muted-foreground">Total Posts Sent</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Syncing your platforms...</p>
          </div>
        ) : (
          <div className="space-y-16">
            {categories.map((cat) => {
              const catPlatforms = platforms.filter((p) => p.category === cat)
              const cfg = categoryConfig[cat]
              const Icon = cfg.icon
              const catAccounts = accounts.filter((a) => catPlatforms.some((p) => p.id === a.platform))

              return (
                <section key={cat}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`p-2.5 rounded-xl ${cfg.bg} ${cfg.border} border`}>
                      <Icon className={`h-5 w-5 ${cfg.color}`} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{cfg.label}</h2>
                      <p className="text-sm text-muted-foreground">
                        {catAccounts.length} of {catPlatforms.length} connected
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {catPlatforms.map((platform) => {
                      const account = accounts.find((a) => a.platform === platform.id)
                      const isConnected = !!account

                      return (
                        <Card
                          key={platform.id}
                          className={`group transition-all duration-300 hover:shadow-lg ${
                            isConnected ? "ring-2 ring-emerald-300 dark:ring-emerald-700" : ""
                          }`}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start gap-4">
                              <div
                                className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0 transition-transform group-hover:scale-110"
                                style={{ background: platform.color }}
                              >
                                {platform.logo}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <span className="font-semibold text-sm truncate">{platform.name}</span>
                                  <Badge variant="outline" className={`shrink-0 text-[10px] font-medium ${timelineColors[platform.timeline] || ""}`}>
                                    {platform.timeline}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground mb-1">{platform.description}</p>
                                <div className="flex items-center gap-1.5 mb-3">
                                  <Zap className="h-3 w-3 text-amber-500" />
                                  <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                    {platform.benefit}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isConnected ? (
                                    <>
                                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Connected
                                      </Badge>
                                      <Button variant="outline" size="sm" asChild>
                                        <a href={platform.connectUrl} target="_blank" rel="noopener noreferrer">
                                          Manage <ExternalLink className="h-3 w-3 ml-1" />
                                        </a>
                                      </Button>
                                    </>
                                  ) : (
                                    <Button size="sm" asChild>
                                      <a href={platform.connectUrl} target="_blank" rel="noopener noreferrer">
                                        Connect <ExternalLink className="h-3 w-3 ml-1" />
                                      </a>
                                    </Button>
                                  )}
                                </div>
                                {isConnected && (
                                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-dashed">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Zap className="h-3 w-3" />
                                      Auto-publish
                                    </span>
                                    <Switch
                                      checked={account.auto_publish}
                                      onCheckedChange={(v) => toggleAutoPublish(account.id, v)}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-20 text-center p-12 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 border border-amber-200 dark:border-amber-800">
          <Users className="h-10 w-10 mx-auto text-amber-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Ready to amplify your reach?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Connect your platforms and every article you publish will automatically be shared everywhere. Set it once, publish forever.
          </p>
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Real-time sync</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Auto-publish</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Database backed</span>
          </div>
        </div>
      </div>
    </div>
  )
}
