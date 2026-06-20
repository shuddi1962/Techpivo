"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExternalLink, CheckCircle2, RefreshCw } from "lucide-react"
import { SOCIAL_PLATFORMS } from "@/lib/constants"
import type { SocialAccount } from "@/types/database"
import {
  XLogo, FacebookLogo, YouTubeLogo, TelegramLogo, LinkedInLogo,
  RedditLogo, WhatsAppLogo, MediumLogo, DevtoLogo, HashnodeLogo,
  PinterestLogo, FlipboardLogo, BingLogo, PerplexityLogo,
  GoogleNewsLogo, ResendLogo, IndexNowLogo, PexelsLogo,
  OpenRouterLogo, GoogleAIStudioLogo,
} from "@/components/integrations/platform-logos"

const platformConfig: Record<string, { label: string; logo: React.ReactNode; color: string }> = {
  twitter: { label: "Twitter / X", logo: <XLogo size={24} />, color: "#000000" },
  facebook: { label: "Facebook Page", logo: <FacebookLogo size={24} />, color: "#1877F2" },
  instagram: { label: "Instagram", logo: <PinterestLogo size={24} />, color: "#E4405F" },
  linkedin: { label: "LinkedIn Page", logo: <LinkedInLogo size={24} />, color: "#0A66C2" },
  pinterest: { label: "Pinterest", logo: <PinterestLogo size={24} />, color: "#E60023" },
  telegram: { label: "Telegram Channel", logo: <TelegramLogo size={24} />, color: "#0088CC" },
  whatsapp: { label: "WhatsApp Channel", logo: <WhatsAppLogo size={24} />, color: "#25D366" },
  reddit: { label: "Reddit", logo: <RedditLogo size={24} />, color: "#FF4500" },
  medium: { label: "Medium", logo: <MediumLogo size={24} />, color: "#000000" },
  devto: { label: "Dev.to", logo: <DevtoLogo size={24} />, color: "#0A0A0A" },
  hashnode: { label: "Hashnode", logo: <HashnodeLogo size={24} />, color: "#2962FF" },
  youtube_community: { label: "YouTube Channel", logo: <YouTubeLogo size={24} />, color: "#FF0000" },
  gmb: { label: "Google Business", logo: <FlipboardLogo size={24} />, color: "#4285F4" },
  flipboard: { label: "Flipboard", logo: <FlipboardLogo size={24} />, color: "#E12828" },
  bing_news: { label: "Bing News PubHub", logo: <BingLogo size={24} />, color: "#008373" },
  perplexity: { label: "Perplexity Publisher", logo: <PerplexityLogo size={24} />, color: "#1A3CFF" },
  google_news: { label: "Google News Publisher", logo: <GoogleNewsLogo size={24} />, color: "#4285F4" },
  resend: { label: "Resend", logo: <ResendLogo size={24} />, color: "#000000" },
  indexnow: { label: "IndexNow", logo: <IndexNowLogo size={24} />, color: "#F57C00" },
  pexels: { label: "Pexels API", logo: <PexelsLogo size={24} />, color: "#05A081" },
  openrouter: { label: "OpenRouter", logo: <OpenRouterLogo size={24} />, color: "#FF6B35" },
  google_ai_studio: { label: "Google AI Studio", logo: <GoogleAIStudioLogo size={24} />, color: "#4285F4" },
}

const connectUrls: Record<string, string> = {
  twitter: "https://twitter.com/i/flow/login",
  facebook: "https://business.facebook.com",
  instagram: "https://www.instagram.com",
  linkedin: "https://www.linkedin.com",
  pinterest: "https://www.pinterest.com/business",
  telegram: "https://telegram.org",
  whatsapp: "https://business.whatsapp.com",
  reddit: "https://www.reddit.com/prefs/apps",
  medium: "https://medium.com/me/settings",
  devto: "https://dev.to/settings",
  hashnode: "https://hashnode.com/settings",
  youtube_community: "https://studio.youtube.com",
  gmb: "https://business.google.com",
  flipboard: "https://about.flipboard.com",
  bing_news: "https://pubhub.bing.com",
  perplexity: "https://perplexity.com/publisher",
  google_news: "https://news.google.com/publisher",
  resend: "https://resend.com",
  indexnow: "https://indexnow.org",
  pexels: "https://www.pexels.com/api",
  openrouter: "https://openrouter.ai",
  google_ai_studio: "https://aistudio.google.com",
}

export default function AdminSocialPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [activeTab, setActiveTab] = useState("accounts")

  useEffect(() => {
    const supabase = createClient()

    supabase.from("social_accounts").select("*").order("platform").then(({ data }) => {
      if (data) setAccounts(data)
    })

    const channel = supabase
      .channel("social_accounts_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_accounts" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setAccounts((prev) => [...prev, payload.new as SocialAccount])
        } else if (payload.eventType === "UPDATE") {
          setAccounts((prev) => prev.map((a) => (a.id === payload.new.id ? payload.new as SocialAccount : a)))
        } else if (payload.eventType === "DELETE") {
          setAccounts((prev) => prev.filter((a) => a.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const toggleAutoPublish = async (id: string, value: boolean) => {
    const supabase = createClient()
    const { error } = await supabase.from("social_accounts").update({ auto_publish: value }).eq("id", id)
    if (error) console.error("Failed to update auto_publish:", error)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Social Media</h1>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Real-time sync active
        </span>
      </div>

      <Tabs defaultValue="accounts" onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SOCIAL_PLATFORMS.map((platform) => {
              const account = accounts.find((a) => a.platform === platform)
              const config = platformConfig[platform] || { label: platform, logo: null, color: "#666" }
              const connectUrl = connectUrls[platform] || "#"

              return (
                <Card key={platform}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
                          style={{ background: config.color }}
                        >
                          {config.logo}
                        </div>
                        <div>
                          <p className="font-medium">{config.label}</p>
                          {account && <p className="text-xs text-muted-foreground">{account.account_name}</p>}
                        </div>
                      </div>
                      <Badge variant={account ? "default" : "secondary"}>
                        {account ? "Connected" : "Not Connected"}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant={account ? "outline" : "default"} size="sm" className="flex-1" asChild>
                        <a href={connectUrl} target="_blank" rel="noopener noreferrer">
                          {account ? "Manage" : "Connect"}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    </div>
                    {account && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <span className="text-xs text-muted-foreground">Auto-publish</span>
                        <Switch checked={account.auto_publish} onCheckedChange={(v) => toggleAutoPublish(account.id, v)} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="queue">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground text-center py-8">
                Social post queue. Configure accounts to start scheduling.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader><CardTitle className="text-lg">Post Templates</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Available variables: {`{title}`}, {`{excerpt_50}`}, {`{excerpt_100}`}, {`{link}`}, {`{hashtags}`}, {`{category}`}, {`{author}`}, {`{reading_time}`}
              </p>
              <div className="space-y-3">
                {SOCIAL_PLATFORMS.slice(0, 5).map((platform) => (
                  <div key={platform} className="p-3 border rounded-lg">
                    <p className="text-sm font-medium capitalize mb-2">{platform.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      Default: New post: {`{title}`} — {`{excerpt_50}`} {`{link}`} {`{hashtags}`}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
