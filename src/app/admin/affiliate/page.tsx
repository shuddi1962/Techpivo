"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingBag, Search, Plus, ExternalLink } from "lucide-react"
import { AFFILIATE_PROGRAMS } from "@/lib/constants"
import type { AffiliateProduct } from "@/types/database"

export default function AdminAffiliatePage() {
  const [products, setProducts] = useState<AffiliateProduct[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedProgram, setSelectedProgram] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from("affiliate_products").select("*, affiliate_program:affiliate_programs(program_name)")
      .order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => {
        if (data) setProducts(data as any)
      })
  }, [])

  const handleSearch = async () => {
    if (!selectedProgram || !searchQuery) return
    setSearchLoading(true)
    setSearchResults([])
    try {
      const res = await fetch(`/api/affiliate/search?program=${selectedProgram}&q=${encodeURIComponent(searchQuery)}`)
      if (!res.ok) throw new Error('Affiliate search API not available')
      const json = await res.json()
      setSearchResults(json.products || [])
    } catch {
      setSearchResults([])
    }
    setSearchLoading(false)
  }

  const importProduct = async (product: any) => {
    const supabase = createClient()
    const { data: programs } = await supabase.from("affiliate_program_configs").select("id").eq("program_key", selectedProgram).limit(1)
    const affiliateId = programs?.[0]?.id
    if (!affiliateId) {
      alert("Connect this affiliate program with API keys first.")
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
    alert(`Imported: ${product.product_name}`)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Affiliate Manager</h1>

      <Tabs defaultValue="products">
        <TabsList className="mb-6">
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="search">Live Search</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>

        <TabsContent value="programs">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {AFFILIATE_PROGRAMS.map((prog) => (
              <Card key={prog.key}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{prog.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{prog.key}</Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-2">Connect</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="search">
          <Card>
            <CardHeader><CardTitle className="text-lg">Live Product Search</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm flex-1">
                  <option value="">Select program...</option>
                  {AFFILIATE_PROGRAMS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
                </select>
                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search products..." className="flex-[2]" />
                <Button onClick={handleSearch} disabled={searchLoading}>
                  <Search className="h-4 w-4 mr-2" />{searchLoading ? "Searching..." : "Search"}
                </Button>
              </div>

              {searchLoading ? (
                <div className="text-sm text-muted-foreground text-center py-8">Searching...</div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {searchResults.map((product) => (
                    <Card key={product.id}>
                      <CardContent className="p-4">
                        <div className="aspect-video bg-muted rounded-md mb-2 flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
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
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No affiliate API connected. Configure a program with API keys to search live products.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card key={product.id}>
                <CardContent className="p-4">
                  <div className="aspect-video bg-muted rounded-md mb-2 flex items-center justify-center">
                    <ShoppingBag className="h-8 w-8 text-muted-foreground" />
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
