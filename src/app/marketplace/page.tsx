"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { AFFILIATE_PROGRAMS } from "@/lib/constants"
import Link from "next/link"

interface Product {
  id: string
  product_name: string
  product_description: string | null
  product_image_url: string | null
  affiliate_link: string
  original_price: number | null
  sale_price: number | null
  program_key: string | null
  is_featured: boolean
}

interface ProgramGroup {
  key: string
  name: string
  products: Product[]
}

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [activeProgram, setActiveProgram] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("affiliate_products")
      .select("*")
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setProducts(data as Product[])
        setLoading(false)
      })
  }, [])

  const programs = AFFILIATE_PROGRAMS

  const filtered = activeProgram === "all"
    ? products
    : products.filter((p) => p.program_key === activeProgram)

  const programGroups: ProgramGroup[] = programs
    .map((p) => ({
      key: p.key,
      name: p.name,
      products: products.filter((pr) => pr.program_key === p.key),
    }))
    .filter((g) => g.products.length > 0)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">Marketplace</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Curated tech products from trusted affiliate partners. Every purchase supports independent tech journalism.
        </p>
        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">🔒 Secure checkout</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground" />
          <span className="inline-flex items-center gap-1">📦 Trusted partners</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground" />
          <span className="inline-flex items-center gap-1">💰 Best prices</span>
        </div>
      </div>

      {/* Program Filter */}
      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        <button
          onClick={() => setActiveProgram("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeProgram === "all" ? "bg-accent text-white" : "bg-card border hover:border-accent text-muted-foreground"
          }`}
        >
          All Products ({products.length})
        </button>
        {programGroups.map((g) => (
          <button
            key={g.key}
            onClick={() => setActiveProgram(g.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeProgram === g.key ? "bg-accent text-white" : "bg-card border hover:border-accent text-muted-foreground"
            }`}
          >
            {g.name} ({g.products.length})
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-square bg-muted" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <div key={product.id} className="bg-card border rounded-xl overflow-hidden group hover:border-accent transition-colors">
              <div className="aspect-square bg-muted relative overflow-hidden">
                {product.product_image_url ? (
                  <img src={product.product_image_url} alt={product.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                  </div>
                )}
                {product.is_featured && (
                  <span className="absolute top-2 left-2 bg-accent text-white text-[10px] font-bold px-2 py-1 rounded">Featured</span>
                )}
              </div>
              <div className="p-4">
                <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                  {programs.find((p) => p.key === product.program_key)?.name || product.program_key}
                </div>
                <h3 className="font-semibold line-clamp-2 mb-2 min-h-[2.5em]">{product.product_name}</h3>
                {product.product_description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{product.product_description}</p>
                )}
                <div className="flex items-center gap-2 mb-3">
                  {product.sale_price && (
                    <span className="text-xl font-bold">${Number(product.sale_price).toFixed(2)}</span>
                  )}
                  {product.original_price && product.original_price !== product.sale_price && (
                    <span className="text-sm text-muted-foreground line-through">${Number(product.original_price).toFixed(2)}</span>
                  )}
                </div>
                <a
                  href={product.affiliate_link}
                  target="_blank"
                  rel="noopener sponsored"
                  className="block w-full text-center bg-accent text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  View Deal
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold mb-2">No Products Yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Curated tech deals from our trusted partners are coming. Browse our affiliate program partners below.
          </p>
          <div className="space-y-2">
            <p className="text-sm font-medium">Available Programs:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {programs.map((p) => (
                <span key={p.key} className="bg-card border rounded-full px-3 py-1 text-xs text-muted-foreground">{p.name}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
