"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { OPENROUTER_MODEL_DEFAULT, OPENROUTER_MODEL_OPTIONS } from "@/lib/openrouter-model"
import { Cpu, Loader2, RefreshCw, Search, Check, BarChart3, KeyRound, Eye, EyeOff, ExternalLink } from "lucide-react"

interface LiveModel {
  id: string
  name: string
  description: string
  pricing: { prompt: string; completion: string }
  context_length: number
  top_provider: { max_completion_tokens: number | null }
  architecture: { modality: string }
  reasoning: boolean
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [error, setError] = useState("")
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const timers = useRef<Record<string, NodeJS.Timeout>>({})
  const dirtyRef = useRef<Set<string>>(new Set())
  const supabase = createClient()
  const [liveModels, setLiveModels] = useState<LiveModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(true)
  const [modelsError, setModelsError] = useState("")
  const [modelSearch, setModelSearch] = useState("")
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const modelDropdownRef = useRef<HTMLDivElement>(null)

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from("site_settings").select("*")
    if (data) {
      setSettings((prev) => {
        const map: Record<string, any> = {}
        data.forEach((s) => {
          map[s.key] = dirtyRef.current.has(s.key) ? prev[s.key] : s.value
        })
        return map
      })
      setLastSync(new Date())
    }
  }, [supabase])

  useEffect(() => {
    fetchSettings()
    const channel = supabase
      .channel(`settings_page_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => fetchSettings())
      .subscribe()
    const onFocus = () => fetchSettings()
    window.addEventListener("focus", onFocus)
    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener("focus", onFocus)
    }
  }, [supabase, fetchSettings])

  const fetchLiveModels = useCallback(async () => {
    setModelsLoading(true)
    setModelsError("")
    try {
      const res = await fetch("/api/admin/openrouter-models")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setLiveModels(data.models || [])
    } catch (e) {
      console.error("Failed to fetch OpenRouter models:", e)
      setModelsError("Could not load live models — using fallback list")
    } finally {
      setModelsLoading(false)
    }
  }, [])

  useEffect(() => { fetchLiveModels() }, [fetchLiveModels])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const saveSetting = useCallback(async (key: string, value: any) => {
    if (key === "site_url" && typeof value === "string" && value && !/^https?:\/\//.test(value)) {
      setError("site url must start with http:// or https://")
      return false
    }
    setError("")
    const { error } = await supabase.from("site_settings").upsert({ key, value })
    if (error) {
      console.error("Failed to save setting:", key, error)
      setError(`${key.replace(/_/g, " ")}: ${error.message}`)
      return false
    }
    setLastSync(new Date())
    return true
  }, [supabase])

  const updateLocalSetting = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleInputChange = (key: string, value: any) => {
    updateLocalSetting(key, value)
    dirtyRef.current = new Set(dirtyRef.current).add(key)
    setDirty(dirtyRef.current)
    if (timers.current[key]) clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => {
      saveSetting(key, value)
      dirtyRef.current = new Set(dirtyRef.current)
      dirtyRef.current.delete(key)
      setDirty(dirtyRef.current)
    }, 800)
  }

  const handleBlur = (key: string, value: any) => {
    if (timers.current[key]) clearTimeout(timers.current[key])
    saveSetting(key, value)
    dirtyRef.current = new Set(dirtyRef.current)
    dirtyRef.current.delete(key)
    setDirty(dirtyRef.current)
  }

  const handleToggle = (key: string, value: boolean) => {
    updateLocalSetting(key, value)
    saveSetting(key, value)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Site Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">{lastSync ? `Saved to DB · last sync ${lastSync.toLocaleTimeString()}` : ""}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 max-w-2xl">{error}</div>
      )}

      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader><CardTitle className="text-lg">General</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {["site_name", "site_tagline", "site_url"].map((key) => (
              <div key={key}>
                <Label className="text-sm capitalize mb-1 block">{key.replace(/_/g, " ")}</Label>
                <div className="relative">
                  <Input value={settings[key] || ""} onChange={(e) => handleInputChange(key, e.target.value)} onBlur={() => handleBlur(key, settings[key])} />
                  {dirty.has(key) && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-amber-500">unsaved</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">AI Writing Model</CardTitle>
            {modelsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />}
            {!modelsLoading && <Button variant="ghost" size="sm" className="ml-auto h-7 px-2" onClick={fetchLiveModels}><RefreshCw className="h-3 w-3" /></Button>}
          </CardHeader>
          <CardContent className="space-y-4">
            {modelsError && <p className="text-xs text-amber-600">{modelsError}</p>}
            <div className="relative" ref={modelDropdownRef}>
              <Label className="text-sm mb-1 block">OpenRouter model</Label>
              <button
                type="button"
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left"
              >
                <span className="truncate">
                  {(() => {
                    const currentId = typeof settings.openrouter_model === "string" ? settings.openrouter_model : OPENROUTER_MODEL_DEFAULT
                    const found = liveModels.find(m => m.id === currentId)
                    return found ? (found.name || found.id) : currentId
                  })()}
                </span>
                <svg className="h-4 w-4 shrink-0 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              {modelDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                  <div className="flex items-center border-b px-3 py-2">
                    <Search className="h-4 w-4 shrink-0 opacity-50 mr-2" />
                    <input
                      autoFocus
                      placeholder="Search models..."
                      className="flex h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-[320px] overflow-y-auto p-1">
                    {(() => {
                      const currentId = typeof settings.openrouter_model === "string" ? settings.openrouter_model : OPENROUTER_MODEL_DEFAULT
                      const q = modelSearch.toLowerCase()
                      const models = liveModels.length > 0 ? liveModels : [{ id: OPENROUTER_MODEL_DEFAULT, name: OPENROUTER_MODEL_DEFAULT, description: "", pricing: { prompt: "0", completion: "0" }, context_length: 0, top_provider: { max_completion_tokens: null }, architecture: { modality: "text" }, reasoning: false }]
                      const filtered = q ? models.filter(m => (m.name || m.id).toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || (m.description || "").toLowerCase().includes(q)) : models
                      if (filtered.length === 0) return <p className="py-2 px-3 text-sm text-muted-foreground">No models match &ldquo;{modelSearch}&rdquo;</p>
                      return filtered.map((m) => {
                        const isFree = m.pricing?.prompt === "0" && m.pricing?.completion === "0"
                        const isSelected = m.id === currentId
                        const curated = OPENROUTER_MODEL_OPTIONS.find(o => o.id === m.id)
                        const tier = curated?.tier
                        const tag = tier === "best" ? { label: "Best for writing", cls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" }
                          : tier === "great" ? { label: "Great quality", cls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" }
                          : tier === "free" && !m.reasoning ? { label: "Free + research", cls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" }
                          : null
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              handleInputChange("openrouter_model", m.id)
                              setModelDropdownOpen(false)
                              setModelSearch("")
                            }}
                            className={`w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground ${isSelected ? "bg-accent" : ""}`}
                          >
                            <Check className={`h-4 w-4 shrink-0 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                            <span className="truncate flex-1 text-left">{m.name || m.id}</span>
                            {tag && <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${tag.cls}`}>{tag.label}</span>}
                            {isFree && !tag && <span className="shrink-0 text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">FREE</span>}
                            {m.reasoning && <span className="shrink-0 text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded font-medium">THINK</span>}
                          </button>
                        )
                      })
                    })()}
                  </div>
                </div>
              )}
            </div>
              {/* Show selected model details */}
              {liveModels.length > 0 && (() => {
                const selected = liveModels.find(m => m.id === (typeof settings.openrouter_model === "string" ? settings.openrouter_model : OPENROUTER_MODEL_DEFAULT))
                if (!selected) return null
                const isFree = selected.pricing?.prompt === "0" && selected.pricing?.completion === "0"
                return (
                  <div className="mt-3 rounded-lg border border-border/60 bg-surface p-3 space-y-1.5">
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{selected.description || "No description available"}</p>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className="text-muted-foreground">{selected.context_length?.toLocaleString() || "?"} context</span>
                      {selected.top_provider?.max_completion_tokens && <span className="text-muted-foreground">· max {selected.top_provider.max_completion_tokens.toLocaleString()} tokens</span>}
                      {selected.architecture?.modality && <span className="text-muted-foreground">· {selected.architecture.modality}</span>}
                    </div>
                    {!isFree && (
                      <div className="flex gap-3 text-[11px] text-muted-foreground">
                        <span>Input: ${(parseFloat(selected.pricing?.prompt || "0") * 1_000_000).toFixed(2)}/M</span>
                        <span>Output: ${(parseFloat(selected.pricing?.completion || "0") * 1_000_000).toFixed(2)}/M</span>
                      </div>
                    )}
                  </div>
                )
              })()}
              <p className="text-xs text-muted-foreground mt-2">
                Applied in realtime to the next AI research / article write — no redeploy needed. Free models work instantly. Paid models require OpenRouter credits.
              </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Features</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "enable_auto_ads", label: "Enable AdSense Auto Ads" },
              { key: "enable_interstitial", label: "Enable Interstitial Ads" },
              { key: "enable_exit_intent", label: "Enable Exit Intent Popup" },
              { key: "enable_push_notifications", label: "Enable Push Notifications" },
              { key: "infinite_scroll", label: "Enable Infinite Scroll" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label>{label}</Label>
                <Switch checked={!!settings[key]} onCheckedChange={(v) => handleToggle(key, v)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Social Media Links</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground mb-4">
              Add your social media profile URLs. These are used in the site header, footer, and share buttons.
            </p>
            {[
              { key: "social_twitter", label: "X (Twitter) URL", placeholder: "https://x.com/your-handle" },
              { key: "social_facebook", label: "Facebook URL", placeholder: "https://facebook.com/your-page" },
              { key: "social_instagram", label: "Instagram URL", placeholder: "https://instagram.com/your-handle" },
              { key: "social_youtube", label: "YouTube URL", placeholder: "https://youtube.com/@your-channel" },
              { key: "social_linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/company/your-page" },
              { key: "social_github", label: "GitHub URL", placeholder: "https://github.com/your-org" },
              { key: "social_telegram", label: "Telegram URL", placeholder: "https://t.me/your-channel" },
              { key: "social_tiktok", label: "TikTok URL", placeholder: "https://tiktok.com/@your-handle" },
              { key: "social_discord", label: "Discord URL", placeholder: "https://discord.gg/your-invite" },
              { key: "social_reddit", label: "Reddit URL", placeholder: "https://reddit.com/r/your-sub" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <Label className="text-sm mb-1 block">{label}</Label>
                <div className="relative">
                  <Input
                    value={settings[key] || ""}
                    placeholder={placeholder}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    onBlur={() => handleBlur(key, settings[key])}
                  />
                  {dirty.has(key) && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-amber-500">unsaved</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-lg">SEO Intelligence — DataForSEO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              DataForSEO powers the Keyword Management insights: search volume, keyword difficulty, SERP competitors, content gaps, AI ranking data, and the conversational SEO assistant. Set your key once and it applies instantly to the Keywords page — no redeploy needed.
            </p>
            <DataForSEOCard
              settings={settings}
              dirty={dirty}
              handleInputChange={handleInputChange}
              handleBlur={handleBlur}
            />
            <div className="rounded-lg border border-border/60 bg-surface p-3 text-[11px] text-muted-foreground space-y-1.5">
              <p>Need a key? <a href="https://app.dataforseo.com/register" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-1">Create a free account <ExternalLink className="h-3 w-3" /></a> and copy your API token (or <code>login:password</code>) from the dashboard.</p>
              <p>You can also set <code className="text-[10px]">DATAFORSEO_LOGIN</code> + <code className="text-[10px]">DATAFORSEO_PASSWORD</code> env vars — env is used if no DB key is set.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Other API keys and secrets (OpenRouter, Resend, VAPID) are managed as environment variables on the hosting platform and are never stored in the database.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DataForSEOCard({
  settings,
  dirty,
  handleInputChange,
  handleBlur,
}: {
  settings: Record<string, any>
  dirty: Set<string>
  handleInputChange: (key: string, value: any) => void
  handleBlur: (key: string, value: any) => void
}) {
  const [show, setShow] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const raw = settings.dataforseo_api_key
  const value = typeof raw === "string" ? raw : ""
  const hasKey = value.length > 0

  const onTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await fetch("/api/admin/seo-dataforseo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      })
      const data = await r.json()
      if (data?.ok) {
        setTestResult({ ok: true, message: "Connected! Search-volume endpoint responded successfully." })
      } else {
        setTestResult({ ok: false, message: data?.error || data?.raw?.status_message || `HTTP ${data?.status || r.status}` })
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e?.message || "Network error" })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm mb-1 block">DataForSEO API key</Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type={show ? "text" : "password"}
            value={value}
            placeholder="paste your DataForSEO token (or login:password)"
            className="pl-9 pr-20 font-mono text-xs"
            onChange={(e) => handleInputChange("dataforseo_api_key", e.target.value)}
            onBlur={() => handleBlur("dataforseo_api_key", value)}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {dirty.has("dataforseo_api_key") && <span className="text-[10px] text-amber-500 mr-1">unsaved</span>}
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="p-1 text-muted-foreground hover:text-foreground"
              title={show ? "Hide" : "Show"}
            >
              {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onTest}
          disabled={testing || !hasKey}
          className="h-8"
        >
          {testing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <BarChart3 className="h-3 w-3 mr-1" />}
          Test connection
        </Button>
        {hasKey && !testing && testResult === null && (
          <span className="text-[11px] text-muted-foreground">Click Test to verify the key is working.</span>
        )}
        {testResult && (
          <span className={`text-[11px] font-medium ${testResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {testResult.ok ? "✓ " : "✗ "}
            {testResult.message}
          </span>
        )}
      </div>
    </div>
  )
}
