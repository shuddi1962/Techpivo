"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingBag, Search, Plus, ExternalLink, RefreshCw, Check, X, Link } from "lucide-react"
import type { AffiliateProduct } from "@/types/database"

interface AffiliateConfig {
  id: string
  program_key: string
  program_name: string
  logo_url: string | null
  is_connected: boolean
  search_enabled: boolean
  total_products_imported: number
  total_clicks: number
  total_estimated_earnings: number
}

export default function AdminAffiliatePage() {
  const [programs, setPrograms] = useState<AffiliateConfig[]>([])
  const [products, setProducts] = useState<AffiliateProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedProgram, setSelectedProgram] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)

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

  const toggleConnect = async (prog: AffiliateConfig) => {
    const supabase = createClient()
    await supabase.from("affiliate_program_configs").update({ is_connected: !prog.is_connected, search_enabled: !prog.is_connected }).eq("id", prog.id)
    loadData()
  }

  const handleSearch = async () => {
    if (!selectedProgram || !searchQuery) return
    setSearchLoading(true)
    setSearchResults([])
    try {
      const res = await fetch(`/api/affiliate/search?program=${selectedProgram}&q=${encodeURIComponent(searchQuery)}`)
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
          <TabsTrigger value="search">Live Search</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
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
                      {prog.logo_url ? (
                        <img src={prog.logo_url} alt={prog.program_name} className="h-8 w-8 rounded object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden") }} />
                      ) : null}
                      <ShoppingBag className={`h-8 w-8 text-muted-foreground ${prog.logo_url ? "hidden" : ""}`} />
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
                      {prog.is_connected ? (
                        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => toggleConnect(prog)}>
                          <Link className="h-3 w-3 mr-1" />Configure
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => toggleConnect(prog)}>
                          <ExternalLink className="h-3 w-3 mr-1" />Connect
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
                  Connect a program to search live products.
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
                            <img src={product.product_image_url} alt="" className="w-full h-full object-contain rounded-md" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.classList.remove("hidden") }} />
                          ) : (
                            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
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
                        <img src={product.product_image_url} alt="" className="w-full h-full object-contain rounded-md" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.classList.remove("hidden") }} />
                      ) : (
                        <ShoppingBag className="h-8 w-8 text-muted-foreground" />
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
      </Tabs>
    </div>
  )
}
