"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus, RefreshCw, Check, X, Settings, Save, Eye, EyeOff, HelpCircle, ExternalLink, Link, TrendingUp, DollarSign, Zap, FileBarChart } from "lucide-react"
import type { AffiliateProduct } from "@/types/database"

interface AffiliateConfig {
  id: string
  program_key: string
  program_name: string
  logo_url: string | null
  website_url: string | null
  api_type: string
  credentials: Record<string, string>
  is_connected: boolean
  search_enabled: boolean
  total_products_imported: number
  total_clicks: number
  total_estimated_earnings: number
}

interface ConfigField {
  key: string
  label: string
  placeholder: string
  help: string
  secret: boolean
  required: boolean
  pattern?: RegExp
  patternMessage?: string
}

const API_CONFIGS: Record<string, ConfigField[]> = {
  direct_api: [
    { key: "api_key", label: "API Key", placeholder: "Enter your API key", help: "Provided by the affiliate network dashboard", secret: true, required: true, pattern: /^.{8,}$/, patternMessage: "API key must be at least 8 characters" },
    { key: "tracking_id", label: "Tracking ID / Tag", placeholder: "e.g. techpivo-20", help: "Your unique affiliate tracking ID or tag", secret: false, required: true, pattern: /^[\w-]{3,}$/, patternMessage: "Must be at least 3 characters (letters, numbers, dashes)" },
  ],
  cj: [
    { key: "website_id", label: "Website ID", placeholder: "e.g. 1234567", help: "Your CJ website ID (Publisher Dashboard)", secret: false, required: true, pattern: /^\d{5,}$/, patternMessage: "Website ID should be a number (5+ digits)" },
    { key: "api_key", label: "API Key", placeholder: "Enter CJ API key", help: "Generate from CJ Account > API Settings", secret: true, required: true, pattern: /^.{8,}$/, patternMessage: "API key must be at least 8 characters" },
    { key: "tracking_id", label: "Tracking Tag", placeholder: "e.g. 1234567", help: "Your CJ PID (Publisher ID)", secret: false, required: false, pattern: /^\d{5,}$/, patternMessage: "PID should be a number (5+ digits)" },
  ],
  shareasale: [
    { key: "merchant_id", label: "Merchant ID", placeholder: "e.g. 12345", help: "ShareASale merchant ID", secret: false, required: true, pattern: /^\d{4,}$/, patternMessage: "Merchant ID should be a number (4+ digits)" },
    { key: "api_token", label: "API Token", placeholder: "Enter ShareASale API token", help: "From ShareASale Account > API Settings", secret: true, required: true, pattern: /^.{8,}$/, patternMessage: "API token must be at least 8 characters" },
    { key: "affiliate_id", label: "Affiliate ID", placeholder: "e.g. 67890", help: "Your ShareASale affiliate ID", secret: false, required: true, pattern: /^\d{4,}$/, patternMessage: "Affiliate ID should be a number (4+ digits)" },
  ],
  impact: [
    { key: "account_sid", label: "Account SID", placeholder: "e.g. a1b2c3d4e5", help: "Impact account SID from Partner Dashboard", secret: false, required: true, pattern: /^.{8,}$/, patternMessage: "Account SID must be at least 8 characters" },
    { key: "auth_token", label: "Auth Token", placeholder: "Enter Impact auth token", help: "From Impact Account > API Settings", secret: true, required: true, pattern: /^.{8,}$/, patternMessage: "Auth token must be at least 8 characters" },
  ],
  rakuten: [
    { key: "api_key", label: "API Key", placeholder: "Enter Rakuten API key", help: "From Rakuten LinkShare Account", secret: true, required: true, pattern: /^.{8,}$/, patternMessage: "API key must be at least 8 characters" },
    { key: "secret", label: "API Secret", placeholder: "Enter API secret", help: "Rakuten API secret key", secret: true, required: true, pattern: /^.{8,}$/, patternMessage: "API secret must be at least 8 characters" },
    { key: "tracking_id", label: "Site ID", placeholder: "e.g. 12345", help: "Your Rakuten site/mid ID", secret: false, required: false, pattern: /^\d{3,}$/, patternMessage: "Site ID should be a number (3+ digits)" },
  ],
  awin: [
    { key: "advertiser_id", label: "Advertiser ID", placeholder: "e.g. 12345", help: "Awin advertiser (merchant) ID", secret: false, required: true, pattern: /^\d{4,}$/, patternMessage: "Advertiser ID should be a number (4+ digits)" },
    { key: "api_token", label: "API Token", placeholder: "Enter Awin API token", help: "From Awin Account > API Settings", secret: true, required: true, pattern: /^.{8,}$/, patternMessage: "API token must be at least 8 characters" },
    { key: "publisher_id", label: "Publisher ID", placeholder: "e.g. 67890", help: "Your Awin publisher ID", secret: false, required: true, pattern: /^\d{4,}$/, patternMessage: "Publisher ID should be a number (4+ digits)" },
  ],
  flexoffers: [
    { key: "api_key", label: "API Key", placeholder: "Enter FlexOffers API key", help: "From FlexOffers Account", secret: true, required: true, pattern: /^.{8,}$/, patternMessage: "API key must be at least 8 characters" },
    { key: "publisher_id", label: "Publisher ID", placeholder: "e.g. 12345", help: "Your FlexOffers publisher ID", secret: false, required: true, pattern: /^\d{4,}$/, patternMessage: "Publisher ID should be a number (4+ digits)" },
  ],
}

const PROGRAM_OVERRIDES: Record<string, { api_type: string; fields: ConfigField[] }> = {
  amazon: {
    api_type: "direct_api",
    fields: [
      { key: "tracking_id", label: "Associate Tag", placeholder: "e.g. techpivo-20", help: "Your Amazon Associate tracking ID (a.co/tag/...)", secret: false, required: true, pattern: /^[\w-]+-\d{2}$/, patternMessage: "Format: yourstorename-20 (e.g. techpivo-20)" },
      { key: "access_key", label: "Access Key ID", placeholder: "e.g. AKIA...", help: "From Amazon PA-API > Security Credentials", secret: true, required: true, pattern: /^AKIA[\w]{16}$/, patternMessage: "Must start with AKIA followed by 16 alphanumeric characters" },
      { key: "secret_key", label: "Secret Access Key", placeholder: "AWS secret key", help: "Your Amazon Product Advertising API secret key", secret: true, required: true, pattern: /^[\w\/+=]{40}$/, patternMessage: "Secret key must be exactly 40 characters" },
    ],
  },
  ebay: {
    api_type: "direct_api",
    fields: [
      { key: "campaign_id", label: "Campaign ID", placeholder: "e.g. 5338765432", help: "Your eBay Partner Network campaign ID", secret: false, required: true, pattern: /^\d{8,}$/, patternMessage: "Campaign ID should be a number (8+ digits)" },
      { key: "api_key", label: "eBay API Key", placeholder: "Enter eBay API key", help: "From eBay Developers Program", secret: true, required: true, pattern: /^.{8,}$/, patternMessage: "API key must be at least 8 characters" },
    ],
  },
  aliexpress: {
    api_type: "direct_api",
    fields: [
      { key: "api_key", label: "App Key", placeholder: "e.g. 12345678", help: "Your AliExpress app key", secret: true, required: true, pattern: /^\d{8,}$/, patternMessage: "App key should be a number (8+ digits)" },
      { key: "tracking_id", label: "Tracking ID", placeholder: "e.g. 8765432", help: "Your AliExpress affiliate tracking ID", secret: false, required: true, pattern: /^\d{6,}$/, patternMessage: "Tracking ID should be a number (6+ digits)" },
    ],
  },
  walmart: {
    api_type: "direct_api",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "Enter Walmart API key", help: "From Walmart Affiliate Portal", secret: true, required: true, pattern: /^.{8,}$/, patternMessage: "API key must be at least 8 characters" },
      { key: "publisher_id", label: "Publisher ID", placeholder: "e.g. 12345", help: "Your Walmart publisher ID", secret: false, required: true, pattern: /^\d{4,}$/, patternMessage: "Publisher ID should be a number (4+ digits)" },
    ],
  },
  bestbuy: {
    api_type: "direct_api",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "Enter Best Buy API key", help: "From Best Buy Developer Portal", secret: true, required: true, pattern: /^.{8,}$/, patternMessage: "API key must be at least 8 characters" },
    ],
  },
  newegg: {
    api_type: "direct_api",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "Enter Newegg API key", help: "From Newegg Affiliate Program", secret: true, required: true, pattern: /^.{8,}$/, patternMessage: "API key must be at least 8 characters" },
    ],
  },
  envato: {
    api_type: "direct_api",
    fields: [
      { key: "api_token", label: "API Token", placeholder: "Enter Envato API token", help: "From Envato Account > API Tokens", secret: true, required: true, pattern: /^.{8,}$/, patternMessage: "API token must be at least 8 characters" },
      { key: "tracking_id", label: "Referrer Tag", placeholder: "e.g. techpivo", help: "Your Envato referral tag (optional)", secret: false, required: false, pattern: /^[\w-]{3,}$/, patternMessage: "Must be at least 3 characters" },
    ],
  },
  udemy: {
    api_type: "direct_api",
    fields: [
      { key: "api_key", label: "Affiliate API Key", placeholder: "Enter Udemy API key", help: "From Udemy Affiliate Dashboard", secret: true, required: true, pattern: /^.{8,}$/, patternMessage: "API key must be at least 8 characters" },
      { key: "tracking_id", label: "Affiliate ID", placeholder: "e.g. 12345abc", help: "Your Udemy affiliate partner ID", secret: false, required: true, pattern: /^[\w-]{4,}$/, patternMessage: "Must be at least 4 alphanumeric characters" },
    ],
  },
  coursera: {
    api_type: "direct_api",
    fields: [
      { key: "tracking_id", label: "Tracking ID", placeholder: "e.g. 123456", help: "Your Coursera affiliate tracking link ID", secret: false, required: true, pattern: /^\d{4,}$/, patternMessage: "Tracking ID should be a number (4+ digits)" },
    ],
  },
  bluehost: {
    api_type: "direct_api",
    fields: [
      { key: "tracking_id", label: "Affiliate Username", placeholder: "e.g. techpivo", help: "Your Bluehost affiliate username", secret: false, required: true, pattern: /^[\w-]{3,}$/, patternMessage: "Must be at least 3 alphanumeric characters" },
    ],
  },
  hostinger: {
    api_type: "direct_api",
    fields: [
      { key: "tracking_id", label: "Affiliate ID", placeholder: "e.g. techpivo", help: "Your Hostinger affiliate referral ID", secret: false, required: true, pattern: /^[\w-]{3,}$/, patternMessage: "Must be at least 3 alphanumeric characters" },
    ],
  },
  nordvpn: {
    api_type: "direct_api",
    fields: [
      { key: "tracking_id", label: "Affiliate Slug", placeholder: "e.g. techpivo", help: "Your NordVPN affiliate referral slug", secret: false, required: true, pattern: /^[\w-]{3,}$/, patternMessage: "Must be at least 3 alphanumeric characters" },
    ],
  },
  booking: {
    api_type: "direct_api",
    fields: [
      { key: "tracking_id", label: "Affiliate ID", placeholder: "e.g. 123456", help: "Your Booking.com affiliate ID", secret: false, required: true, pattern: /^\d{4,}$/, patternMessage: "Affiliate ID should be a number (4+ digits)" },
    ],
  },
}

function getFields(prog: AffiliateConfig): ConfigField[] {
  return PROGRAM_OVERRIDES[prog.program_key]?.fields || API_CONFIGS[prog.api_type] || API_CONFIGS.direct_api
}

function getFavicon(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

function ProgramLogo({ prog, className }: { prog: AffiliateConfig; className?: string }) {
  const domain = prog.website_url ? new URL(prog.website_url).hostname.replace("www.", "") : `${prog.program_key}.com`
  const primarySrc = prog.logo_url || `https://logo.clearbit.com/${domain}`
  const fallbackSrc = getFavicon(domain)
  const [src, setSrc] = useState(primarySrc)
  const [failed, setFailed] = useState(false)

  if (failed) return null

  return (
    <img
      src={src}
      alt={prog.program_name}
      className={`rounded object-contain ${className || "h-8 w-8"}`}
      onError={() => {
        if (src === primarySrc) setSrc(fallbackSrc)
        else setFailed(true)
      }}
    />
  )
}

function getFieldError(f: ConfigField, value: string): string | null {
  if (!value && f.required) return `${f.label} is required`
  if (value && f.pattern && !f.pattern.test(value)) return f.patternMessage || "Invalid format"
  return null
}

function ConfigDialog({ prog, open, onClose }: { prog: AffiliateConfig | null; open: boolean; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const fields = prog ? getFields(prog) : []

  const errors = fields.reduce<Record<string, string | null>>((acc, f) => {
    acc[f.key] = getFieldError(f, values[f.key] || "")
    return acc
  }, {})

  const hasErrors = Object.values(errors).some(e => e !== null)
  const hasRequired = fields.some(f => f.required && values[f.key])

  useEffect(() => {
    if (prog) {
      const initial: Record<string, string> = {}
      for (const f of getFields(prog)) {
        initial[f.key] = prog.credentials?.[f.key] || ""
      }
      setValues(initial)
      setTouched({})
    }
  }, [prog])

  if (!open || !prog) return null

  const handleSave = async () => {
    setTouched(Object.fromEntries(fields.map(f => [f.key, true])))
    if (hasErrors) return
    setSaving(true)
    const supabase = createClient()
    const credentials: Record<string, string> = {}
    for (const f of fields) {
      if (values[f.key]) {
        credentials[f.key] = values[f.key]
      }
    }
    await supabase.from("affiliate_program_configs").update({
      credentials,
      is_connected: hasRequired,
      search_enabled: hasRequired,
    }).eq("id", prog.id)
    setSaving(false)
    onClose()
  }

  const handleDisconnect = async () => {
    setSaving(true)
    const supabase = createClient()
    await supabase.from("affiliate_program_configs").update({
      credentials: {},
      is_connected: false,
      search_enabled: false,
    }).eq("id", prog.id)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-[#111827] rounded-xl shadow-2xl border border-gray-200 dark:border-[#374151] w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#374151]">
          <div className="flex items-center gap-3">
            <ProgramLogo prog={prog} className="h-8 w-8" />
            <div>
              <h2 className="text-lg font-bold">{prog.program_name}</h2>
              <p className="text-xs text-muted-foreground">{prog.api_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {fields.map((f) => {
            const err = touched[f.key] ? errors[f.key] : null
            return (
              <div key={f.key}>
                <label className="text-sm font-medium mb-1 flex items-center gap-1.5">
                  {f.label}
                  {f.required && <span className="text-red-400">*</span>}
                  <span className="relative group">
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-10">
                      {f.help}
                    </span>
                  </span>
                </label>
                <div className="relative">
                  <Input
                    value={values[f.key] || ""}
                    onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                    onBlur={() => setTouched(prev => ({ ...prev, [f.key]: true }))}
                    type={f.secret && !showSecrets[f.key] ? "password" : "text"}
                    placeholder={f.placeholder}
                    className={`font-mono text-sm ${err ? "border-red-400 focus:ring-red-400" : ""} ${f.secret ? "pr-10" : ""}`}
                  />
                  {f.secret && (
                    <button onClick={() => setShowSecrets(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showSecrets[f.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                {err && <p className="text-xs text-red-400 mt-1">{err}</p>}
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between p-5 border-t border-gray-200 dark:border-[#374151]">
          {prog.is_connected ? (
            <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={saving} className="text-red-500 border-red-200 hover:bg-red-50">
              <X className="h-4 w-4 mr-1" />Disconnect
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || hasErrors}>
              <Save className="h-4 w-4 mr-1" />{saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminAffiliatePage() {
  const [programs, setPrograms] = useState<AffiliateConfig[]>([])
  const [products, setProducts] = useState<AffiliateProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedProgram, setSelectedProgram] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [configProg, setConfigProg] = useState<AffiliateConfig | null>(null)

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const [progRes, prodRes] = await Promise.all([
      supabase.from("affiliate_program_configs").select("*").order("program_name"),
      supabase.from("affiliate_products").select("*, affiliate_program:affiliate_programs(program_name)").order("created_at", { ascending: false }).limit(50),
    ])
    if (progRes.data) setPrograms(progRes.data as any)
    if (prodRes.data) setProducts(prodRes.data as any)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSearch = async () => {
    if (!selectedProgram || !searchQuery) return
    setSearchLoading(true)
    setSearchResults([])
    try {
      const res = await fetch(`/api/affiliate-search?program=${selectedProgram}&q=${encodeURIComponent(searchQuery)}`)
      if (!res.ok) throw new Error("Affiliate search API not available")
      const json = await res.json()
      setSearchResults(json.products || [])
    } catch {
      setSearchResults([])
    }
    setSearchLoading(false)
  }

  const importProduct = async (product: any) => {
    const supabase = createClient()
    const { data: cfg } = await supabase.from("affiliate_program_configs").select("id").eq("program_key", selectedProgram).limit(1)
    const affiliateId = cfg?.[0]?.id
    if (!affiliateId) {
      alert("Connect this affiliate program first.")
      return
    }
    await supabase.from("affiliate_products").insert({
      affiliate_id: affiliateId,
      program_key: selectedProgram,
      product_name: product.product_name,
      sale_price: product.sale_price,
      original_price: product.original_price,
      product_image_url: product.product_image_url,
      affiliate_link: product.affiliate_link,
    })
    loadData()
    alert(`Imported: ${product.product_name}`)
  }

  return (
    <div>
      <ConfigDialog prog={configProg} open={!!configProg} onClose={() => { setConfigProg(null); loadData() }} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Affiliate Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage affiliate programs and products</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      <Tabs defaultValue="programs">
        <TabsList className="mb-6">
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="search">Live Search</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="programs">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading programs...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {programs.map((prog) => (
                <Card key={prog.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <ProgramLogo prog={prog} className="h-8 w-8 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{prog.program_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="secondary" className="text-[10px]">{prog.program_key}</Badge>
                          {prog.is_connected ? (
                            <Badge className="text-[10px] bg-green-100 text-green-700 hover:bg-green-100">
                              <Check className="h-3 w-3 mr-0.5" />Connected
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              <X className="h-3 w-3 mr-0.5" />Not connected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {prog.is_connected && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 mb-3">
                        <span>{prog.total_products_imported} products</span>
                        <span>{prog.total_clicks} clicks</span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setConfigProg(prog)}>
                        <Settings className="h-3 w-3 mr-1" />{prog.is_connected ? "Configure" : "Connect"}
                      </Button>
                      {prog.website_url && (
                        <Button variant="ghost" size="sm" className="text-xs" asChild>
                          <a href={prog.website_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="search">
          <Card>
            <CardHeader><CardTitle className="text-lg">Live Product Search</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm flex-1">
                  <option value="">Select program...</option>
                  {programs.filter(p => p.is_connected).map((p) => <option key={p.program_key} value={p.program_key}>{p.program_name}</option>)}
                </select>
                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search products..." className="flex-[2]" />
                <Button onClick={handleSearch} disabled={searchLoading || programs.filter(p => p.is_connected).length === 0}>
                  <Search className="h-4 w-4 mr-2" />{searchLoading ? "Searching..." : "Search"}
                </Button>
              </div>

              {programs.filter(p => p.is_connected).length === 0 && !searchResults.length && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Connect a program with API keys to search live products.
                </div>
              )}

              {searchLoading ? (
                <div className="text-sm text-muted-foreground text-center py-8">Searching...</div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {searchResults.map((product, i) => (
                    <Card key={product.id || i}>
                      <CardContent className="p-4">
                        <div className="aspect-video bg-muted rounded-md mb-2 flex items-center justify-center">
                          {product.product_image_url ? (
                            <img src={product.product_image_url} alt="" className="w-full h-full object-contain rounded-md" />
                          ) : (
                            <div className="text-xs text-muted-foreground">No image</div>
                          )}
                        </div>
                        <p className="font-medium text-sm line-clamp-2">{product.product_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-lg font-bold">${product.sale_price}</span>
                          {product.original_price && (
                            <span className="text-sm text-muted-foreground line-through">${product.original_price}</span>
                          )}
                        </div>
                        <Button size="sm" className="w-full mt-2" onClick={() => importProduct(product)}>
                          <Plus className="h-3 w-3 mr-1" />Import
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          {products.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-12">No products imported yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product: any) => (
                <Card key={product.id}>
                  <CardContent className="p-4">
                    <div className="aspect-video bg-muted rounded-md mb-2 flex items-center justify-center">
                      {product.product_image_url ? (
                        <img src={product.product_image_url} alt="" className="w-full h-full object-contain rounded-md" />
                      ) : (
                        <div className="text-xs text-muted-foreground">No image</div>
                      )}
                    </div>
                    <p className="font-medium text-sm line-clamp-2">{product.product_name}</p>
                    {product.sale_price && <p className="text-lg font-bold mt-1">${product.sale_price}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px]">{product.program_key}</Badge>
                      <Badge variant={product.is_active ? "default" : "secondary"} className="text-[10px]">
                        {product.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{product.clicks} clicks</span>
                      <span>{product.conversions} conv.</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="links" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Affiliate Links</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Paste affiliate URL..." className="flex-1" />
                <Input placeholder="Custom slug (optional)" className="w-48" />
                <Button><Plus className="h-4 w-4 mr-1" /> Create Link</Button>
              </div>
              <div className="space-y-2">
                {[{ slug: "/go/chatgpt-plus", url: "https://chat.openai.com/plus", clicks: 234, conv: 12 }, { slug: "/go/notion", url: "https://notion.so", clicks: 189, conv: 8 }, { slug: "/go/vercel", url: "https://vercel.com", clicks: 156, conv: 15 }].map((l, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                    <div>
                      <p className="font-medium font-mono">{l.slug}</p>
                      <p className="text-xs text-muted-foreground">{l.url}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">{l.clicks} clicks</span>
                      <span className="text-muted-foreground">{l.conv} conv.</span>
                      <Button variant="ghost" size="sm"><Link className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{ label: "Total Clicks", value: "4,280" }, { label: "Conversions", value: "142" }, { label: "Conversion Rate", value: "3.3%" }, { label: "Avg. Commission", value: "$4.20" }].map((s, i) => (
              <Card key={i}><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle>Top Performing Products</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[{ name: "ChatGPT Plus", clicks: 890, conv: 45, revenue: "$189" }, { name: "Notion Pro", clicks: 654, conv: 32, revenue: "$128" }, { name: "Vercel Pro", clicks: 423, conv: 28, revenue: "$168" }, { name: "GitHub Copilot", clicks: 312, conv: 18, revenue: "$108" }].map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.clicks} clicks · {p.conv} conversions</p>
                  </div>
                  <p className="font-bold">{p.revenue}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{ label: "This Month", value: "$592" }, { label: "Last Month", value: "$487" }, { label: "Growth", value: "+21.6%" }, { label: "Pending Payout", value: "$312" }].map((s, i) => (
              <Card key={i}><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle>Revenue by Partner</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[{ partner: "Amazon Associates", revenue: "$234", pct: 40 }, { partner: "ShareASale", revenue: "$156", pct: 26 }, { partner: "CJ Affiliate", revenue: "$112", pct: 19 }, { partner: "Impact", revenue: "$90", pct: 15 }].map((p, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1"><span>{p.partner}</span><span className="font-medium">{p.revenue}</span></div>
                  <div className="w-full h-2 bg-muted rounded-full"><div className="h-full bg-primary rounded-full" style={{ width: `${p.pct}%` }} /></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Active Campaigns</h3>
            <Button size="sm"><Plus className="h-3 w-3 mr-1" /> New Campaign</Button>
          </div>
          {[{ name: "Best AI Tools 2026", products: 8, revenue: "$342", status: "active" }, { name: "Developer Productivity Stack", products: 5, revenue: "$189", status: "active" }, { name: "Holiday Deals 2025", products: 12, revenue: "$567", status: "ended" }].map((c, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.products} products · {c.revenue} earned</p>
                </div>
                <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Affiliate Reports</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[{ name: "Weekly Performance", freq: "Every Monday" }, { name: "Monthly Revenue", freq: "1st of month" }, { name: "Product Analytics", freq: "On demand" }].map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.freq}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Generate</Button>
                    <Button variant="outline" size="sm">Export</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
