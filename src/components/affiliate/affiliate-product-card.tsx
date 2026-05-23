"use client"

import Link from "next/link"
import type { AffiliateProduct } from "@/types/database"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"

interface AffiliateProductCardProps {
  product: AffiliateProduct
  compact?: boolean
}

export function AffiliateProductCard({ product, compact }: AffiliateProductCardProps) {
  const onSale =
    product.sale_price !== null &&
    product.original_price !== null &&
    product.sale_price < product.original_price

  return (
    <Card className={cn("overflow-hidden", compact ? "p-0" : "")}>
      <CardContent className={cn(compact ? "p-3" : "p-4")}>
        <div className={cn("flex", compact ? "gap-3 items-center" : "flex-col gap-3")}>
          {/* Image */}
          <div
            className={cn(
              "shrink-0 rounded-md bg-muted overflow-hidden",
              compact ? "w-16 h-16" : "w-full aspect-[4/3]"
            )}
          >
            {product.product_image_url ? (
              <img
                src={product.product_image_url}
                alt={product.product_name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <ShoppingCart className={compact ? "h-6 w-6" : "h-8 w-8"} />
              </div>
            )}
          </div>

          {/* Details */}
          <div className={cn("flex-1 min-w-0", compact ? "" : "space-y-1.5")}>
            <div className="flex items-center gap-2">
              {!compact && (
                <Badge variant="amber" className="text-[10px] px-1.5 py-0">
                  Sponsored
                </Badge>
              )}
              {product.category_id && (
                <Badge variant="indigo" className="text-[10px] px-1.5 py-0">
                  {product.category_id.slice(0, 8)}
                </Badge>
              )}
            </div>

            <h3
              className={cn(
                "font-semibold leading-tight line-clamp-2",
                compact ? "text-sm" : "text-base"
              )}
            >
              {product.product_name}
            </h3>

            <div className="flex items-center gap-2">
              {onSale ? (
                <>
                  <span className="font-bold text-brand-indigo">
                    ${product.sale_price!.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground line-through">
                    ${product.original_price!.toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="font-bold">
                  ${(product.sale_price ?? product.original_price ?? 0).toFixed(2)}
                </span>
              )}
            </div>

            {compact && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Sponsored
              </span>
            )}

            {!compact && (
              <Link href={product.affiliate_link} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="w-full mt-1 gap-1">
                  Buy Now <span aria-hidden="true">→</span>
                </Button>
              </Link>
            )}
          </div>

          {compact && (
            <Link
              href={product.affiliate_link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline" className="shrink-0 gap-1">
                Buy <span aria-hidden="true">→</span>
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
