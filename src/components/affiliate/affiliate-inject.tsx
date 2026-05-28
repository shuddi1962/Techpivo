"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { AffiliateProduct, SiteSetting } from "@/types/database"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"

interface AffiliateInjectProps {
  categoryId: string
  tags: string[]
}

export function AffiliateInject({ categoryId, tags }: AffiliateInjectProps) {
  const [products, setProducts] = useState<AffiliateProduct[]>([])
  const [disclosure, setDisclosure] = useState("")

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "affiliate_disclosure")
      .single()
      .then(({ data }) => {
        if (data) {
          setDisclosure((data as SiteSetting).value ?? "")
        }
      })

    supabase
      .from("affiliate_products")
      .select("*")
      .eq("is_active", true)
      .or(`category_id.eq.${categoryId},tags.cs.{${tags.map((t) => `"${t}"`).join(",")}}`)
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) setProducts(data)
      })
  }, [categoryId, tags])

  if (products.length === 0) return null

  return (
    <div className="my-8 space-y-4">
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-4 w-4 text-brand-amber" />
        <h3 className="text-base font-bold">Recommended for this article</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => {
          const displayPrice =
            product.sale_price ?? product.original_price ?? 0
          const onSale =
            product.sale_price !== null &&
            product.original_price !== null &&
            product.sale_price < product.original_price

          return (
            <Card key={product.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  {/* Image */}
                  <div className="w-full aspect-[4/3] rounded-md bg-muted overflow-hidden">
                    {product.product_image_url ? (
                      <img
                        src={product.product_image_url}
                        alt={product.product_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ShoppingCart className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <h4 className="text-sm font-semibold leading-tight line-clamp-2">
                    {product.product_name}
                  </h4>

                  {/* Price */}
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-brand-amber">
                      ${displayPrice.toFixed(2)}
                    </span>
                    {onSale && (
                      <span className="text-xs text-muted-foreground line-through">
                        ${product.original_price!.toFixed(2)}
                      </span>
                    )}
                    <Badge variant="amber" className="text-[10px] px-1.5 py-0 ml-auto">
                      Sponsored
                    </Badge>
                  </div>

                  {/* CTA */}
                  <Link
                    href={product.affiliate_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button size="sm" className="w-full gap-1">
                      Check Price <span aria-hidden="true">→</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {disclosure && (
        <p className="text-xs text-muted-foreground italic">{disclosure}</p>
      )}
    </div>
  )
}
