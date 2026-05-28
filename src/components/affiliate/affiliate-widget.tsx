"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { AffiliateProduct } from "@/types/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"

interface AffiliateWidgetProps {
  categoryId: string
}

export function AffiliateWidget({ categoryId }: AffiliateWidgetProps) {
  const [product, setProduct] = useState<AffiliateProduct | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const supabase = createClient()
    supabase
      .from("affiliate_products")
      .select("*")
      .eq("is_active", true)
      .eq("category_id", categoryId)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setProduct(data[0])
        } else {
          setProduct(null)
        }
        setLoading(false)
      })
  }, [categoryId])

  if (loading) return null
  if (!product) return null

  const displayPrice =
    product.sale_price ?? product.original_price ?? 0
  const onSale =
    product.sale_price !== null &&
    product.original_price !== null &&
    product.sale_price < product.original_price

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          Sponsored
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
            Learn More <span aria-hidden="true">→</span>
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
