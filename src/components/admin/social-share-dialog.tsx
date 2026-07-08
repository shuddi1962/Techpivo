"use client"

import { useState, useEffect } from "react"
import { X, Share2, Check, ExternalLink, Copy, Image as ImageIcon, Loader2 } from "lucide-react"
import { SITE_URL } from "@/lib/constants"

interface PostData {
  id: string
  title: string
  slug: string
  excerpt?: string
  featured_image?: string
  tags?: string[]
}

interface PlatformConfig {
  id: string
  name: string
  color: string
  url: string
  icon: React.ReactNode
}

const platforms: PlatformConfig[] = [
  {
    id: "facebook",
    name: "Facebook",
    color: "#1877F2",
    url: "https://facebook.com",
    icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  },
  {
    id: "instagram",
    name: "Instagram",
    color: "#E4405F",
    url: "https://instagram.com",
    icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
  },
  {
    id: "threads",
    name: "Threads",
    color: "#101010",
    url: "https://threads.net",
    icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.25 0C8.062 0 4.598 1.042 2.134 3.297.54 4.771.002 6.626.002 9.094c0 2.721 1.001 4.893 2.986 6.544 1.127.935 2.685 1.588 4.629 1.946-.148.385-.23.798-.23 1.232 0 1.546.862 2.945 2.107 3.675-.463.102-.972.16-1.519.16-3.011 0-5.624-1.001-7.626-2.713l.002 4.105c1.899 1.705 5.193 2.992 8.955 2.992 3.27 0 5.815-1.102 7.63-3.094 1.637-1.803 2.462-4.264 2.462-7.377v-.31c.675-.341 1.256-.763 1.74-1.27 1.208-1.261 1.736-2.815 1.736-4.499 0-2.638-1.204-4.795-3.482-6.288C19.108.739 15.892 0 12.25 0zm1.17 10.856c.713.14 2.442.497 3.152-.112.542-.465.579-1.325.142-1.889-.175-.225-.429-.358-.716-.398-.112-.016-.217-.024-.314-.024-1.402 0-2.918 1.197-2.264 2.423zm-6.697-.694c-.698 0-1.268.566-1.268 1.263v.25c0 .7.57 1.266 1.268 1.266.699 0 1.266-.566 1.266-1.265v-.25c0-.698-.567-1.264-1.266-1.264z"/></svg>,
  },
  {
    id: "twitter",
    name: "X / Twitter",
    color: "#000000",
    url: "https://x.com",
    icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    color: "#0A66C2",
    url: "https://linkedin.com",
    icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  },
  {
    id: "telegram",
    name: "Telegram",
    color: "#0088CC",
    url: "https://web.telegram.org",
    icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    color: "#25D366",
    url: "https://web.whatsapp.com",
    icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>,
  },
  {
    id: "reddit",
    name: "Reddit",
    color: "#FF4500",
    url: "https://reddit.com/submit",
    icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.51 9.08a1.83 1.83 0 0 1 1.83 1.83c0 .68-.37 1.27-.92 1.58.03.13.04.27.04.41 0 2.78-2.98 5.03-6.66 5.03s-6.66-2.25-6.66-5.03c0-.14.02-.28.04-.41a1.83 1.83 0 0 1-.92-1.58 1.83 1.83 0 0 1 3.63-.6c1-.7 2.35-1.14 3.85-1.2l.66-3.1a.38.38 0 0 1 .45-.31l2.17.47a1.29 1.29 0 0 1 1.2-.88 1.3 1.3 0 0 1 1.29 1.29 1.3 1.3 0 0 1-1.3 1.3c-.6 0-1.1-.4-1.24-.95l-1.92-.42-.6 2.82c1.52.06 2.88.5 3.89 1.2a1.83 1.83 0 0 1 1.62-.92zm-5.5 3.23c-.7 0-1.43.28-2 .73-.3.24-.35.7-.1 1.01.24.31.7.36 1.01.1.37-.29.78-.44 1.19-.44.7 0 1.1.3 1.2.44.3.25.76.2 1.01-.1.24-.31.2-.77-.1-1.01-.6-.45-1.3-.73-2.21-.73zm-1.83 2.2c-.49.54-.7 1.24-.46 1.93.36 1.03 1.63 1.7 2.98 1.7s2.62-.67 2.98-1.7c.24-.69.03-1.4-.46-1.93-.48-.52-1.26-.86-2.52-.86s-2.04.34-2.52.86zm6.38.48a1.03 1.03 0 1 0 0 2.06 1.03 1.03 0 1 0 0-2.06zm-10.88 0a1.03 1.03 0 1 0 0 2.06 1.03 1.03 0 1 0 0-2.06z"/></svg>,
  },
  {
    id: "pinterest",
    name: "Pinterest",
    color: "#E60023",
    url: "https://pinterest.com/pin/create/button",
    icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.936 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.67.968-2.916 2.171-2.916 1.024 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.011-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/></svg>,
  },
]

const STOP_WORDS = new Set(["a","an","the","for","to","is","are","and","or","of","in","on","at","with","from","by","its","it","as","be","but","not","this","that","was","were","has","had","have","can","will","all","get","got","new","how","what","why","who","you","your","our","their","about","into","over","after","than","then","also","just","very","too","much","more","most","some","any","each","every","own","same","such","may","than","when","which","while","other","only","still","been","being","make","made","said","does","used","use","using"]])

function autoHashtags(title: string, count: number): string[] {
  const words = title.replace(/[^a-zA-Z0-9\s.-]/g, "").split(/\s+/)
  const meaningful = words.filter(w => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()))
  const seen = new Set<string>()
  return meaningful.filter(w => {
    const key = w.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, count).map(w => "#" + w.replace(/[^a-zA-Z0-9]/g, ""))
}

function captionFor(platform: string, title: string, excerpt: string, url: string, tags: string[]): string {
  const fallbackTags = tags.length > 0 ? tags : autoHashtags(title, 3)
  const hashtags = fallbackTags.slice(0, 3).map(t => "#" + t.replace(/\s+/g, "")).join(" ")

  switch (platform) {
    case "facebook":
      return `${title}\n\n${excerpt.slice(0, 200)}${excerpt.length > 200 ? "..." : ""}\n\n${hashtags}\n\nRead full story in the comments:\n${url}`
    case "instagram":
      return `${title}\n\n${excerpt.slice(0, 300)}${excerpt.length > 300 ? "..." : ""}\n\n${fallbackTags.slice(0, 15).map(t => "#" + t.replace(/\s+/g, "")).join(" ")}\n\n${url}`
    case "threads":
      return `${excerpt.slice(0, 120)}${excerpt.length > 120 ? "..." : ""}\n\n${title}\n\n${url}`
    case "twitter":
      return `${title.slice(0, 100)}${title.length > 100 ? "..." : ""}\n\n${excerpt.slice(0, 120)}${excerpt.length > 120 ? "..." : ""}\n\n${url}\n\n${fallbackTags.slice(0, 2).map(t => "#" + t.replace(/\s+/g, "")).join(" ")}`
    case "linkedin":
      return `${title}\n\n${excerpt.slice(0, 300)}${excerpt.length > 300 ? "..." : ""}\n\n${hashtags}\n\nRead more: ${url}`
    case "telegram":
      return `${title}\n\n${excerpt.slice(0, 250)}${excerpt.length > 250 ? "..." : ""}\n\n${fallbackTags.slice(0, 3).map(t => "#" + t.replace(/\s+/g, "")).join(" ")}\n\n${url}`
    case "reddit":
      return `${title}\n\n${excerpt.slice(0, 300)}${excerpt.length > 300 ? "..." : ""}\n\n${url}`
    case "pinterest":
      return `${title}\n\n${excerpt.slice(0, 200)}${excerpt.length > 200 ? "..." : ""}\n\n${hashtags}\n\n${url}`
    default:
      return `${title}\n\n${excerpt}\n\nRead more: ${url}`
  }
}

interface SocialShareDialogProps {
  open: boolean
  onClose: () => void
  post: PostData
}

export function SocialShareDialog({ open, onClose, post }: SocialShareDialogProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [imageLoading, setImageLoading] = useState(false)

  const postUrl = `${SITE_URL}/${post.slug}`
  const excerpt = post.excerpt || ""
  const image = post.featured_image || ""
  const tags = post.tags || []

  // Pre-fetch image blob when dialog opens so Copy Image is instant
  useEffect(() => {
    if (!open || !image) return
    setImageBlob(null)
    setImageLoading(true)
    const ctrl = new AbortController()
    fetch(image, { signal: ctrl.signal })
      .then(r => r.blob())
      .then(b => { if (b.type.startsWith("image/")) setImageBlob(b) })
      .catch(() => {})
      .finally(() => setImageLoading(false))
    return () => ctrl.abort()
  }, [open, image])

  const copyToClipboard = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch {}
  }

  const copyImageToClipboard = async (key: string, url: string) => {
    try {
      // Use pre-fetched blob if available — instant copy
      if (imageBlob) {
        await navigator.clipboard.write([new ClipboardItem({ [imageBlob.type]: imageBlob })])
        setCopied(key)
        setTimeout(() => setCopied(null), 2000)
        return
      }

      // Fallback: fetch now
      const res = await fetch(url)
      if (res.ok) {
        const blob = await res.blob()
        const type = blob.type.startsWith("image/") ? blob.type : "image/png"
        await navigator.clipboard.write([new ClipboardItem({ [type]: blob })])
        setCopied(key)
        setTimeout(() => setCopied(null), 2000)
        return
      }
    } catch {}

    // Last resort: canvas fallback
    try {
      const img = new Image()
      img.crossOrigin = "anonymous"
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = url
      })
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext("2d")?.drawImage(img, 0, 0)
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"))
      if (blob) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
        setCopied(key)
        setTimeout(() => setCopied(null), 2000)
      }
    } catch {}
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#374151] shrink-0">
          <div className="flex items-center gap-2.5">
            <Share2 className="h-5 w-5 text-[#F59E0B]" />
            <h2 className="font-semibold text-gray-900 dark:text-[#F9FAFB]">Share this post</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F2937] text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex-1 space-y-3">
          {platforms.map((platform) => {
            const caption = captionFor(platform.id, post.title, excerpt, postUrl, tags)
            const captionShort = caption.length > 180 ? caption.slice(0, 177) + "..." : caption

            return (
              <div
                key={platform.id}
                className="rounded-xl border-2 border-gray-200 dark:border-[#374151] bg-white dark:bg-transparent overflow-hidden"
              >
                {/* Platform header */}
                <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
                  <div className="shrink-0" style={{ color: platform.color }}>{platform.icon}</div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-[#F9FAFB]">{platform.name}</span>
                </div>

                {/* Image preview */}
                {image && (
                  <div className="px-4 pb-1.5">
                    <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-gray-100 dark:bg-[#0A0F1E] border border-gray-100 dark:border-[#1F2937]">
                      <img
                        src={image}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                      />
                    </div>
                  </div>
                )}

                {/* Caption preview */}
                <div className="px-4 pb-2">
                  <div className="bg-gray-50 dark:bg-[#0A0F1E] rounded-lg px-3 py-2.5 border border-gray-100 dark:border-[#1F2937]">
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap line-clamp-3">
                      {captionShort}
                    </p>
                  </div>
                </div>

                {/* 3 action buttons */}
                <div className="px-4 pb-3 flex gap-2">
                  {/* Copy caption */}
                  <button
                    onClick={() => copyToClipboard(`cap_${platform.id}`, caption)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: platform.color }}
                  >
                    {copied === `cap_${platform.id}` ? (
                      <><Check className="h-3 w-3" /> Copied</>
                    ) : (
                      <><Copy className="h-3 w-3" /> Caption</>
                    )}
                  </button>

                  {/* Copy image */}
                  <button
                    onClick={() => image && copyImageToClipboard(`img_${platform.id}`, image)}
                    disabled={!image || imageLoading}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-30"
                    style={{ backgroundColor: platform.color }}
                  >
                    {imageLoading ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /> Loading</>
                    ) : copied === `img_${platform.id}` ? (
                      <><Check className="h-3 w-3" /> Copied</>
                    ) : (
                      <><ImageIcon className="h-3 w-3" /> Image</>
                    )}
                  </button>

                  {/* Open platform */}
                  <button
                    onClick={() => window.open(platform.url, "_blank", "noopener,noreferrer")}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: platform.color }}
                  >
                    <ExternalLink className="h-3 w-3" /> Open
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 dark:border-[#374151] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-[#D1D5DB] hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
