"use client"

import type { ReactElement } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  XLogo, FacebookLogo, TelegramLogo, LinkedInLogo,
  RedditLogo, WhatsAppLogo, MediumLogo, DevtoLogo,
  HashnodeLogo, YouTubeLogo, PinterestLogo,
  FlipboardLogo, BingLogo, PerplexityLogo,
  GoogleNewsLogo, ResendLogo, IndexNowLogo, PexelsLogo,
  OpenRouterLogo, GoogleAIStudioLogo,
} from "@/components/integrations/platform-logos"

interface SocialConnectButtonProps {
  platform: string
  isConnected: boolean
  onConnect: () => void
}

const platformMap: Record<string, { label: string; icon: ReactElement; color: string }> = {
  twitter: { label: "Twitter / X", icon: <XLogo size={20} />, color: "#000000" },
  facebook: { label: "Facebook Page", icon: <FacebookLogo size={20} />, color: "#1877F2" },
  instagram: { label: "Instagram", icon: <PinterestLogo size={20} />, color: "#E4405F" },
  linkedin: { label: "LinkedIn Page", icon: <LinkedInLogo size={20} />, color: "#0A66C2" },
  pinterest: { label: "Pinterest", icon: <PinterestLogo size={20} />, color: "#E60023" },
  telegram: { label: "Telegram Channel", icon: <TelegramLogo size={20} />, color: "#0088CC" },
  whatsapp: { label: "WhatsApp Channel", icon: <WhatsAppLogo size={20} />, color: "#25D366" },
  reddit: { label: "Reddit", icon: <RedditLogo size={20} />, color: "#FF4500" },
  medium: { label: "Medium", icon: <MediumLogo size={20} />, color: "#000000" },
  devto: { label: "Dev.to", icon: <DevtoLogo size={20} />, color: "#0A0A0A" },
  hashnode: { label: "Hashnode", icon: <HashnodeLogo size={20} />, color: "#2962FF" },
  youtube_community: { label: "YouTube Channel", icon: <YouTubeLogo size={20} />, color: "#FF0000" },
  gmb: { label: "Google Business", icon: <GoogleLogo size={20} />, color: "#4285F4" },
  buffer: { label: "Buffer", icon: <BufferLogo />, color: "#168DEA" },
  hootsuite: { label: "Hootsuite", icon: <HootsuiteLogo />, color: "#FF4D4D" },
  flipboard: { label: "Flipboard", icon: <FlipboardLogo size={20} />, color: "#E12828" },
  bing_news: { label: "Bing News PubHub", icon: <BingLogo size={20} />, color: "#008373" },
  perplexity: { label: "Perplexity Publisher", icon: <PerplexityLogo size={20} />, color: "#1A3CFF" },
  google_news: { label: "Google News Publisher", icon: <GoogleNewsLogo size={20} />, color: "#4285F4" },
  resend: { label: "Resend", icon: <ResendLogo size={20} />, color: "#000000" },
  indexnow: { label: "IndexNow", icon: <IndexNowLogo size={20} />, color: "#F57C00" },
  pexels: { label: "Pexels API", icon: <PexelsLogo size={20} />, color: "#05A081" },
  openrouter: { label: "OpenRouter", icon: <OpenRouterLogo size={20} />, color: "#FF6B35" },
  google_ai_studio: { label: "Google AI Studio", icon: <GoogleAIStudioLogo size={20} />, color: "#4285F4" },
}

const fallback = { label: "Unknown Platform", icon: <div />, color: "#666" }

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 28 28" width={size} height={size} fill="none">
      <rect width="28" height="28" rx="4" fill="#4285F4" />
      <path d="M14 8a6 6 0 0 1 3.8 1.3l-1.6 1.6A3.7 3.7 0 0 0 14 10a4 4 0 0 0-3.8 2.8L8.3 11.5A6.8 6.8 0 0 1 14 8Z" fill="#fff" />
      <path d="M14 20a6.8 6.8 0 0 1-5.7-3.5l1.9-1.5A4 4 0 0 0 14 18c2 0 3.5-1.5 3.5-3.5 0-.3 0-.6-.2-.9H14v-2.2h6.2c.2.7.3 1.4.3 2.2 0 3.5-2.4 6.4-6.5 6.4Z" fill="#fff" />
    </svg>
  )
}

function BufferLogo() {
  return (
    <svg viewBox="0 0 28 28" width={20} height={20} fill="none">
      <rect width="28" height="28" rx="4" fill="#168DEA" />
      <path d="M14 8l8 4-8 4-8-4 8-4Zm0 8l8-4v2l-8 4-8-4v-2l8 4Zm0 4l8-4v2l-8 4-8-4v-2l8 4Z" fill="#fff" />
    </svg>
  )
}

function HootsuiteLogo() {
  return (
    <svg viewBox="0 0 28 28" width={20} height={20} fill="none">
      <rect width="28" height="28" rx="4" fill="#FF4D4D" />
      <path d="M8 6l4 4v8l-4 4V6Zm8 0l4 4v8l-4 4V6Z" fill="#fff" />
    </svg>
  )
}

export function SocialConnectButton({ platform, isConnected, onConnect }: SocialConnectButtonProps) {
  const config = platformMap[platform] ?? fallback

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-3 transition-colors",
        isConnected && "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md" style={{ background: config.color }}>
          {config.icon}
        </div>
        <div>
          <p className="text-sm font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">
            {isConnected ? "Connected" : "Not connected"}
          </p>
        </div>
      </div>
      <Button
        variant={isConnected ? "outline" : "default"}
        size="sm"
        onClick={onConnect}
      >
        {isConnected ? "Manage" : "Connect"}
      </Button>
    </div>
  )
}
