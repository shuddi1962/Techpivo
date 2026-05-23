"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { AffiliateProduct } from "@/types/database"
import { ShoppingCart } from "lucide-react"

export function AffiliateStrip() {
  const [products, setProducts] = useState<AffiliateProduct[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("affiliate_products")
      .select("*")
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setProducts(data)
      })
  }, [])

  if (products.length === 0) return null

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingCart className="h-4 w-4 text-brand-amber" />
        <h2 className="text-lg font-bold">Featured Deals</h2>
      </div>
      <div className="overflow-x-auto pb-2 -mx-4 px-4">
        <div className="flex gap-4 min-w-max">
          {products.map((product) => {
            const displayPrice =
              product.sale_price ?? product.original_price ?? 0
            const onSale =
              product.sale_price !== null &&
              product.original_price !== null &&
              product.sale_price < product.original_price

            return (
              <Link
                key={product.id}
                href={product.affiliate_link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex-shrink-0 w-44 rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Image */}
                <div className="w-full h-28 bg-muted overflow-hidden">
                  {product.product_image_url ? (
                    <img
                      src={product.product_image_url}
                      alt={product.product_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ShoppingCart className="h-6 w-6" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-3 space-y-1">
                  <h3 className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-brand-indigo transition-colors">
                    {product.product_name}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm">
                      ${displayPrice.toFixed(2)}
                    </span>
                    {onSale && (
                      <span className="text-xs text-muted-foreground line-through">
                        ${product.original_price!.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center text-xs font-medium text-brand-indigo group-hover:underline">
                    Shop <span aria-hidden="true" className="ml-0.5">→</span>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
