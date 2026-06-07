"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Image, Code, DollarSign, Eye, MousePointer, Calendar, Copy, Check, X, Upload, Monitor, Video, FileText as FileTextIcon, Search as SearchIcon, ExternalLink } from "lucide-react"
import { AD_POSITIONS } from "@/lib/constants"
import type { Ad } from "@/types/database"

type AdFormat = "banner_image" | "custom_code" | "adsense"
type CampaignFormat = AdFormat | "sponsored_article" | "video_ad"
type Campaign = {
  id: string
  advertiser_name: string
  ad_image_url: string | null
  destination_url: string | null
  ad_code: string | null
  positions: string[]
  start_date: string | null
  end_date: string | null
  daily_impression_cap: number | null
  impressions: number
  clicks: number
  is_active: boolean
  created_at: string
}

const SLOT_FORMAT_LABELS: Record<AdFormat, string> = {
  banner_image: "Banner Image",
  custom_code: "Custom Code",
  adsense: "Google AdSense",
}

const SLOT_FORMAT_ICONS: Record<AdFormat, any> = {
  banner_image: Image,
  custom_code: Code,
  adsense: DollarSign,
}

const CAMPAIGN_FORMAT_LABELS: Record<CampaignFormat, string> = {
  banner_image: "Banner Image",
  custom_code: "Custom Code",
  adsense: "Google AdSense",
  sponsored_article: "Sponsored Article",
  video_ad: "Video Ad",
}

const CAMPAIGN_FORMAT_ICONS: Record<CampaignFormat, any> = {
  banner_image: Image,
  custom_code: Code,
  adsense: DollarSign,
  sponsored_article: FileTextIcon,
  video_ad: Video,
}

export default function AdminAdsPage() {
  const [ads, setAds] = useState<Ad[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  // ── Ad slot form state ──
  const [name, setName] = useState("")
  const [position, setPosition] = useState("")
  const [slotFormat, setSlotFormat] = useState<AdFormat>("banner_image")
  const [slotAdCode, setSlotAdCode] = useState("")
  const [slotImageUrl, setSlotImageUrl] = useState("")
  const [slotUploading, setSlotUploading] = useState(false)
  const slotInputRef = useRef<HTMLInputElement>(null)

  // ── Campaign form state ──
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [advName, setAdvName] = useState("")
  const [advFormat, setAdvFormat] = useState<CampaignFormat>("banner_image")
  const [advImageUrl, setAdvImageUrl] = useState("")
  const [advDestUrl, setAdvDestUrl] = useState("")
  const [advCode, setAdvCode] = useState("")
  const [advPositions, setAdvPositions] = useState<string[]>([])
  const [advStartDate, setAdvStartDate] = useState("")
  const [advEndDate, setAdvEndDate] = useState("")
  const [advImpCap, setAdvImpCap] = useState("")
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [videoUrl, setVideoUrl] = useState("")
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [copiedCampaignId, setCopiedCampaignId] = useState<string | null>(null)

  // ── Sponsored article post search ──
  const [postSearch, setPostSearch] = useState("")
  const [postResults, setPostResults] = useState<any[]>([])
  const [selectedPost, setSelectedPost] = useState<any | null>(null)
  const [searchingPosts, setSearchingPosts] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [adsRes, campaignsRes] = await Promise.all([
      supabase.from("ads").select("*").order("name"),
      supabase.from("ad_campaigns").select("*").order("created_at", { ascending: false }),
    ])
    if (adsRes.data) setAds(adsRes.data)
    if (campaignsRes.data) setCampaigns(campaignsRes.data)
  }

  // ── Ad Slot CRUD ──

  const resetSlotForm = () => {
    setName("")
    setPosition("")
    setSlotFormat("banner_image")
    setSlotAdCode("")
    setSlotImageUrl("")
  }

  const uploadSlotImage = async (file: File) => {
    setSlotUploading(true)
    const path = `ad-slots/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from("media").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    })
    if (error) {
      console.error("Slot image upload error:", error)
      setSlotUploading(false)
      return
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path)
    setSlotImageUrl(data.publicUrl)
    setSlotUploading(false)
  }

  const addAd = async () => {
    if (!name || !position) return

    let adCode = slotAdCode
    let adType = "banner"

    if (slotFormat === "banner_image" && slotImageUrl) {
      adCode = `<a href="#" target="_blank" rel="noopener">\n  <img src="${slotImageUrl}" alt="${name}" style="max-width:100%;height:auto" />\n</a>`
      adType = "banner"
    } else if (slotFormat === "adsense" && slotAdCode) {
      adCode = slotAdCode
      adType = "banner"
    }

    await supabase.from("ads").insert({
      name,
      type: adType as any,
      position: position as any,
      ad_code: adCode,
    })
    resetSlotForm()
    const { data } = await supabase.from("ads").select("*").order("name")
    if (data) setAds(data)
  }

  const toggleAdActive = async (id: string, active: boolean) => {
    await supabase.from("ads").update({ is_active: active }).eq("id", id)
  }

  const deleteAd = async (id: string) => {
    if (!confirm("Delete this ad slot?")) return
    await supabase.from("ads").delete().eq("id", id)
    setAds((prev) => prev.filter((a) => a.id !== id))
  }

  // ── Campaign CRUD ──

  const resetCampaignForm = () => {
    setEditingCampaign(null)
    setAdvName("")
    setAdvFormat("banner_image")
    setAdvImageUrl("")
    setAdvDestUrl("")
    setAdvCode("")
    setAdvPositions([])
    setAdvStartDate("")
    setAdvEndDate("")
    setAdvImpCap("")
    setVideoUrl("")
    setSelectedPost(null)
    setPostSearch("")
    setPostResults([])
  }

  const openEditCampaign = (c: Campaign) => {
    setEditingCampaign(c)
    setAdvName(c.advertiser_name)
    setAdvFormat(
      c.ad_code?.startsWith("<!-- sponsored_article:") ? "sponsored_article" :
      c.ad_code?.startsWith("<!-- video_ad") ? "video_ad" :
      c.ad_code?.startsWith("<script") || c.ad_code?.startsWith("<ins") ? "adsense" :
      c.ad_image_url ? "banner_image" : "custom_code"
    )
    setAdvImageUrl(c.ad_image_url || "")
    setAdvDestUrl(c.destination_url || "")
    setAdvCode(c.ad_code || "")
    setAdvPositions(c.positions || [])
    setAdvStartDate(c.start_date || "")
    setAdvEndDate(c.end_date || "")
    setAdvImpCap(c.daily_impression_cap?.toString() || "")
    setShowCampaignForm(true)
  }

  const uploadBannerImage = async (file: File) => {
    setUploadingBanner(true)
    const path = `campaigns/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from("media").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    })
    if (error) {
      console.error("Banner upload error:", error)
      setUploadingBanner(false)
      return
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path)
    setAdvImageUrl(data.publicUrl)
    setUploadingBanner(false)
  }

  const uploadVideoFile = async (file: File) => {
    setUploadingVideo(true)
    const path = `campaigns/videos/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from("media").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    })
    if (error) {
      console.error("Video upload error:", error)
      setUploadingVideo(false)
      return
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path)
    setVideoUrl(data.publicUrl)
    setUploadingVideo(false)
  }

  const searchPosts = async (q: string) => {
    setPostSearch(q)
    if (q.length < 2) { setPostResults([]); return }
    setSearchingPosts(true)
    const { data } = await supabase
      .from("posts")
      .select("id, title, slug, featured_image")
      .or(`title.ilike.%${q}%,slug.ilike.%${q}%`)
      .eq("status", "published")
      .limit(10)
    setPostResults(data || [])
    setSearchingPosts(false)
  }

  const selectPost = (post: any) => {
    setSelectedPost(post)
    setPostSearch(post.title)
    setPostResults([])
    setAdvDestUrl(`/post/${post.slug}`)
  }

  const saveCampaign = async () => {
    if (!advName) return

    const payload: any = {
      advertiser_name: advName,
      positions: advPositions,
      start_date: advStartDate || null,
      end_date: advEndDate || null,
      daily_impression_cap: advImpCap ? parseInt(advImpCap) : null,
    }

    if (advFormat === "banner_image") {
      payload.ad_image_url = advImageUrl || null
      payload.destination_url = advDestUrl || null
      payload.ad_code = null
    } else if (advFormat === "sponsored_article") {
      payload.ad_image_url = null
      payload.destination_url = selectedPost ? `/post/${selectedPost.slug}` : (advDestUrl || null)
      payload.ad_code = `<!-- sponsored_article:${selectedPost?.id || ""} -->`
    } else if (advFormat === "video_ad") {
      payload.ad_image_url = null
      payload.destination_url = null
      const videoEmbed = videoUrl
        ? `<video controls style="max-width:100%;height:auto"><source src="${videoUrl}" type="video/mp4"></video>`
        : advCode
      payload.ad_code = `<!-- video_ad -->\n${videoEmbed}`
    } else if (advFormat === "adsense") {
      payload.ad_code = advCode || null
      payload.ad_image_url = null
      payload.destination_url = null
    } else {
      payload.ad_code = advCode || null
      payload.ad_image_url = null
      payload.destination_url = null
    }

    if (editingCampaign) {
      await supabase.from("ad_campaigns").update(payload).eq("id", editingCampaign.id)
    } else {
      await supabase.from("ad_campaigns").insert(payload)
    }

    resetCampaignForm()
    setShowCampaignForm(false)
    const { data } = await supabase.from("ad_campaigns").select("*").order("created_at", { ascending: false })
    if (data) setCampaigns(data)
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm("Delete this campaign?")) return
    await supabase.from("ad_campaigns").delete().eq("id", id)
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
  }

  const toggleCampaignActive = async (id: string, active: boolean) => {
    await supabase.from("ad_campaigns").update({ is_active: active }).eq("id", id)
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: active } : c)))
  }

  const togglePosition = (pos: string) => {
    setAdvPositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    )
  }

  const copyCampaignAdCode = async (c: Campaign) => {
    const code = c.ad_code || `<!-- ${c.advertiser_name} - ${c.ad_image_url ? "Banner: " + c.ad_image_url : "Custom Ad"} -->`
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCampaignId(c.id)
      setTimeout(() => setCopiedCampaignId(null), 2000)
    } catch {
      const el = document.createElement("textarea")
      el.value = code
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
      setCopiedCampaignId(c.id)
      setTimeout(() => setCopiedCampaignId(null), 2000)
    }
  }

  const formatCampaignBadge = (c: Campaign) => {
    if (c.ad_code?.startsWith("<!-- sponsored_article:")) return "Sponsored Article"
    if (c.ad_code?.startsWith("<!-- video_ad -->")) return "Video Ad"
    if (c.ad_code?.startsWith("<script") || c.ad_code?.startsWith("<ins") || (!c.ad_image_url && c.ad_code?.includes("adsense"))) return "Google AdSense"
    if (c.ad_image_url) return "Banner Image"
    if (c.ad_code) return "Custom Code"
    return "Unknown"
  }

  const getSlotCodePreview = () => {
    if (slotFormat === "banner_image" && slotImageUrl) {
      return `<a href="#" target="_blank" rel="noopener">\n  <img src="${slotImageUrl}" alt="${name || "Ad"}" />\n</a>`
    }
    return slotAdCode
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Ad Manager</h1>

      <Tabs defaultValue="slots">
        <TabsList className="mb-6">
          <TabsTrigger value="slots">
            <Monitor className="h-4 w-4 mr-2" />
            Ad Slots
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <DollarSign className="h-4 w-4 mr-2" />
            Client Campaigns
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════
           TAB 1 — AD SLOTS
           ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="slots">
          <Card className="mb-8">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Plus className="h-4 w-4" />New Ad Slot</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Slot Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Home Top Banner" />
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <select value={position} onChange={(e) => setPosition(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Select position...</option>
                    {Object.entries(AD_POSITIONS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Content Format</Label>
                  <div className="flex gap-1">
                    {(Object.entries(SLOT_FORMAT_LABELS) as [AdFormat, string][]).map(([key, label]) => {
                      const Icon = SLOT_FORMAT_ICONS[key]
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSlotFormat(key)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs transition-colors ${
                            slotFormat === key
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-input hover:bg-muted"
                          }`}
                          title={label}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {slotFormat === "banner_image" && (
                <div className="space-y-2">
                  <Label>Banner Image</Label>
                  <div className="flex items-center gap-3">
                    <input
                      ref={slotInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadSlotImage(e.target.files[0])}
                    />
                    <Button variant="outline" onClick={() => slotInputRef.current?.click()} disabled={slotUploading}>
                      <Upload className="h-4 w-4 mr-2" />
                      {slotUploading ? "Uploading..." : "Upload Banner"}
                    </Button>
                    {slotImageUrl && (
                      <div className="flex items-center gap-2">
                        <img src={slotImageUrl} alt="Preview" className="h-10 rounded border" />
                        <button type="button" onClick={() => setSlotImageUrl("")} className="text-muted-foreground hover:text-foreground">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {slotImageUrl && (
                    <p className="text-xs text-muted-foreground truncate">{slotImageUrl}</p>
                  )}
                </div>
              )}

              {slotFormat === "custom_code" && (
                <div className="space-y-2">
                  <Label>Ad Code (HTML/JS)</Label>
                  <Textarea
                    value={slotAdCode}
                    onChange={(e) => setSlotAdCode(e.target.value)}
                    placeholder={`<div class="ad-container">\n  <!-- Your ad code -->\n</div>`}
                    className="font-mono text-sm min-h-[100px]"
                  />
                </div>
              )}

              {slotFormat === "adsense" && (
                <div className="space-y-2">
                  <Label>Google AdSense Code</Label>
                  <Textarea
                    value={slotAdCode}
                    onChange={(e) => setSlotAdCode(e.target.value)}
                    placeholder={`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>\n<ins class="adsbygoogle"\n     style="display:block"\n     data-ad-client="ca-pub-xxxxxxxxxxxxxx"\n     data-ad-slot="xxxxxxxxxx"\n     data-ad-format="auto"></ins>\n<script>(adsbygoogle=window.adsbygoogle||[]).push({})</script>`}
                    className="font-mono text-sm min-h-[120px]"
                  />
                </div>
              )}

              {getSlotCodePreview() && (
                <details>
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground mb-1">Preview generated code</summary>
                  <pre className="p-2 bg-muted rounded text-xs overflow-x-auto max-h-28">{getSlotCodePreview()}</pre>
                </details>
              )}

              <div className="flex justify-end">
                <Button onClick={addAd} disabled={!name || !position || (slotFormat === "banner_image" && !slotImageUrl)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Slot
                </Button>
              </div>
            </CardContent>
          </Card>

          {ads.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Monitor className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-lg font-medium">No ad slots yet</p>
                <p className="text-sm text-muted-foreground">Create your first ad slot to define where ads appear</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ads.map((ad) => (
                <Card key={ad.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="font-medium truncate">{ad.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {AD_POSITIONS[ad.position as keyof typeof AD_POSITIONS] || ad.position}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch checked={ad.is_active} onCheckedChange={(v) => toggleAdActive(ad.id, v)} />
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteAd(ad.id)} title="Delete">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {ad.ad_code?.includes("<script") || ad.ad_code?.includes("<ins") ? "AdSense" : ad.ad_code?.includes("<img") ? "Image" : ad.ad_code ? "Custom" : "Empty"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{ad.type}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{ad.impressions}</span>
                      <span className="flex items-center gap-1"><MousePointer className="h-3 w-3" />{ad.clicks}</span>
                    </div>
                    {ad.ad_code && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Code</summary>
                        <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto max-h-20">{ad.ad_code}</pre>
                      </details>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
           TAB 2 — CLIENT CAMPAIGNS
           ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="campaigns">
          <div className="mb-6">
            <Button onClick={() => { resetCampaignForm(); setShowCampaignForm(!showCampaignForm) }}>
              <Plus className="h-4 w-4 mr-2" />
              {showCampaignForm ? "Cancel" : "New Campaign"}
            </Button>
          </div>

          {showCampaignForm && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingCampaign ? "Edit Campaign" : "New Campaign"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Advertiser Name</Label>
                  <Input value={advName} onChange={(e) => setAdvName(e.target.value)} placeholder="e.g. Acme Corp" />
                </div>

                {/* Ad Format */}
                <div className="space-y-2">
                  <Label>Ad Format</Label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(CAMPAIGN_FORMAT_LABELS) as [CampaignFormat, string][]).map(([key, label]) => {
                      const Icon = CAMPAIGN_FORMAT_ICONS[key]
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => { setAdvFormat(key); setSelectedPost(null); setVideoUrl("") }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm transition-colors ${
                            advFormat === key
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-input hover:bg-muted"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Format-specific fields */}
                {advFormat === "banner_image" && (
                  <>
                    <div className="space-y-2">
                      <Label>Banner Image</Label>
                      <div className="flex items-center gap-3">
                        <input
                          ref={bannerInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && uploadBannerImage(e.target.files[0])}
                        />
                        <Button variant="outline" onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner}>
                          <Upload className="h-4 w-4 mr-2" />
                          {uploadingBanner ? "Uploading..." : "Upload Banner"}
                        </Button>
                        {advImageUrl && (
                          <div className="flex items-center gap-2">
                            <img src={advImageUrl} alt="Banner preview" className="h-10 rounded border" />
                            <button type="button" onClick={() => setAdvImageUrl("")} className="text-muted-foreground hover:text-foreground">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      {advImageUrl && (
                        <p className="text-xs text-muted-foreground truncate mt-1">{advImageUrl}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Destination URL</Label>
                      <Input value={advDestUrl} onChange={(e) => setAdvDestUrl(e.target.value)} placeholder="https://example.com" />
                    </div>
                  </>
                )}

                {advFormat === "sponsored_article" && (
                  <>
                    <div className="space-y-2">
                      <Label>Select Article</Label>
                      <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={postSearch}
                          onChange={(e) => searchPosts(e.target.value)}
                          placeholder="Search published articles..."
                          className="pl-9"
                        />
                      </div>
                      {searchingPosts && <p className="text-xs text-muted-foreground">Searching...</p>}
                      {postResults.length > 0 && (
                        <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                          {postResults.map((post) => (
                            <button
                              key={post.id}
                              type="button"
                              onClick={() => selectPost(post)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-3"
                            >
                              {post.featured_image && (
                                <img src={post.featured_image} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                              )}
                              <span className="truncate">{post.title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedPost && (
                        <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md">
                          <FileTextIcon className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-sm truncate flex-1">{selectedPost.title}</span>
                          <a href={`/post/${selectedPost.slug}`} target="_blank" rel="noopener" className="text-primary hover:underline text-xs flex items-center gap-1">
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                          <button type="button" onClick={() => { setSelectedPost(null); setPostSearch("") }} className="text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Custom Destination URL (optional, overrides article link)</Label>
                      <Input value={advDestUrl} onChange={(e) => setAdvDestUrl(e.target.value)} placeholder={`/post/${selectedPost?.slug || "article-slug"}`} />
                    </div>
                  </>
                )}

                {advFormat === "video_ad" && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Upload Video File</Label>
                      <div className="flex items-center gap-3">
                        <input
                          ref={videoInputRef}
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && uploadVideoFile(e.target.files[0])}
                        />
                        <Button variant="outline" onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo}>
                          <Upload className="h-4 w-4 mr-2" />
                          {uploadingVideo ? "Uploading..." : "Upload Video"}
                        </Button>
                        {videoUrl && (
                          <div className="flex items-center gap-2">
                            <Video className="h-5 w-5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{videoUrl}</span>
                            <button type="button" onClick={() => setVideoUrl("")} className="text-muted-foreground hover:text-foreground">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Video Embed Code (alternative to upload)</Label>
                      <Textarea
                        value={advCode}
                        onChange={(e) => setAdvCode(e.target.value)}
                        placeholder={`<iframe width="560" height="315" src="https://www.youtube.com/embed/VIDEO_ID" frameborder="0" allowfullscreen></iframe>`}
                        className="font-mono text-sm min-h-[100px]"
                      />
                    </div>
                    {(videoUrl || advCode) && (
                      <div className="p-2 bg-muted rounded-md">
                        <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                        {videoUrl && (
                          <video controls className="max-w-full h-auto rounded" style={{ maxHeight: 200 }}>
                            <source src={videoUrl} type="video/mp4" />
                          </video>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {advFormat === "custom_code" && (
                  <div className="space-y-2">
                    <Label>Ad Code (HTML/JS)</Label>
                    <Textarea
                      value={advCode}
                      onChange={(e) => setAdvCode(e.target.value)}
                      placeholder={`<div class="my-ad">\n  <a href="...">\n    <img src="..." />\n  </a>\n</div>`}
                      className="font-mono text-sm min-h-[150px]"
                    />
                  </div>
                )}

                {advFormat === "adsense" && (
                  <div className="space-y-2">
                    <Label>Google AdSense Code</Label>
                    <Textarea
                      value={advCode}
                      onChange={(e) => setAdvCode(e.target.value)}
                      placeholder={`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>\n<ins class="adsbygoogle"\n     style="display:block"\n     data-ad-client="ca-pub-xxxxxxxxxxxxxx"\n     data-ad-slot="xxxxxxxxxx"\n     data-ad-format="auto"></ins>\n<script>(adsbygoogle=window.adsbygoogle||[]).push({})</script>`}
                      className="font-mono text-sm min-h-[150px]"
                    />
                  </div>
                )}

                {/* Positions */}
                <div className="space-y-2">
                  <Label>Ad Positions</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                    {Object.entries(AD_POSITIONS).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted p-1 rounded">
                        <input
                          type="checkbox"
                          checked={advPositions.includes(key)}
                          onChange={() => togglePosition(key)}
                          className="rounded"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Dates & cap */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={advStartDate} onChange={(e) => setAdvStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={advEndDate} onChange={(e) => setAdvEndDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Daily Impression Cap</Label>
                    <Input type="number" min="0" value={advImpCap} onChange={(e) => setAdvImpCap(e.target.value)} placeholder="Unlimited" />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { resetCampaignForm(); setShowCampaignForm(false) }}>Cancel</Button>
                  <Button onClick={saveCampaign} disabled={!advName || (advFormat === "banner_image" && !advImageUrl)}>
                    {editingCampaign ? "Update" : "Create"} Campaign
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Campaigns List */}
          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-lg font-medium">No client campaigns yet</p>
                <p className="text-sm text-muted-foreground">Create your first campaign to start showing client ads</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{c.advertiser_name}</p>
                          <Badge variant={c.is_active ? "default" : "secondary"}>
                            {c.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{formatCampaignBadge(c)}</Badge>
                        </div>
                        {c.positions && c.positions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {c.positions.slice(0, 3).map((pos) => (
                              <Badge key={pos} variant="secondary" className="text-[10px]">
                                {AD_POSITIONS[pos as keyof typeof AD_POSITIONS] || pos}
                              </Badge>
                            ))}
                            {c.positions.length > 3 && (
                              <span className="text-[10px] text-muted-foreground self-center">+{c.positions.length - 3} more</span>
                            )}
                          </div>
                        )}
                        {(c.start_date || c.end_date) && (
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {c.start_date && <span>{c.start_date}</span>}
                            {c.start_date && c.end_date && <span>→</span>}
                            {c.end_date && <span>{c.end_date}</span>}
                          </div>
                        )}
                        {c.daily_impression_cap && (
                          <p className="text-xs text-muted-foreground mt-0.5">Cap: {c.daily_impression_cap}/day</p>
                        )}
                        {c.destination_url && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-md">
                            <ExternalLink className="h-3 w-3 inline mr-0.5" />
                            {c.destination_url}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right text-xs text-muted-foreground space-y-0.5">
                          <p className="flex items-center gap-1 justify-end"><Eye className="h-3 w-3" />{c.impressions}</p>
                          <p className="flex items-center gap-1 justify-end"><MousePointer className="h-3 w-3" />{c.clicks}</p>
                        </div>
                        <Switch checked={c.is_active} onCheckedChange={(v) => toggleCampaignActive(c.id, v)} />
                        <div className="flex flex-col gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEditCampaign(c)} title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyCampaignAdCode(c)} title="Copy ad code">
                            {copiedCampaignId === c.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => deleteCampaign(c.id)} title="Delete">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </Button>
                      </div>
                    </div>
                    {c.destination_url && advFormat === "sponsored_article" && c.ad_code?.startsWith("<!-- sponsored_article:") && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <ExternalLink className="h-3 w-3 text-primary" />
                        <a href={c.destination_url} target="_blank" rel="noopener" className="text-primary hover:underline truncate">
                          {c.destination_url}
                        </a>
                      </div>
                    )}
                    {c.ad_code && !c.ad_code.startsWith("<!--") && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Ad Code</summary>
                        <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto max-h-32">{c.ad_code}</pre>
                      </details>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
