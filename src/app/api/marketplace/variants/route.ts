import { NextRequest, NextResponse } from "next/server"
import { createPublicClient } from "@/lib/supabase/server"
import { fetchWithTimeout } from "@/lib/fetch-timeout"
import { cjGetVariants, withMargin } from "@/lib/cj"
import { marketImage } from "@/lib/marketplace-images"

export const dynamic = "force-dynamic"

const COLOR_WORDS = [
  "black", "white", "red", "blue", "green", "yellow", "pink", "purple",
  "orange", "gray", "grey", "silver", "gold", "brown", "beige", "nude",
  "khaki", "navy", "multicolor", "multicolour", "transparent", "clear",
]

const isSizeLike = (v: string) =>
  /^(xxs|xs|s|m|l|xl|xxl|xxxl|\d+(\.\d+)?(gb|inch|\"|mm|cm)?|one[\s-]?size)$/i.test(v.trim())

function splitAttrs(name: string): string[] {
  return name
    .split(/[/;|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)
}

function guessAttrName(values: string[], index: number): string {
  const vals = values.map((v) => v.toLowerCase())
  if (vals.some((v) => COLOR_WORDS.some((c) => v.includes(c)))) return "Color"
  if (vals.every((v) => isSizeLike(v))) return "Size"
  return index === 0 ? "Style" : "Type"
}

export interface StoreVariant {
  vid: string
  label: string
  price: number | null
  image: string
  stock: number | null
  weightGrams: number | null
}

// GET /api/marketplace/variants?product_id=<uuid> — live supplier options
// (color/size/type) with store pricing. Never exposes supplier internals
// beyond an opaque variant id needed for fulfillment.
export async function GET(request: NextRequest) {
  const productId = new URL(request.url).searchParams.get("product_id") || ""
  if (!/^[0-9a-f-]{36}$/i.test(productId)) {
    return NextResponse.json({ error: "Invalid product." }, { status: 400 })
  }
  try {
    const supabase = createPublicClient()
    const res = (await fetchWithTimeout(
      supabase.from("affiliate_products").select("cj_pid").eq("id", productId).eq("is_active", true).maybeSingle(),
      8000
    )) as { data: { cj_pid: string | null } | null } | null
    const pid = res?.data?.cj_pid
    if (!pid) return NextResponse.json({ variants: [], attributes: [] })
    const list = await cjGetVariants(pid)
    const variants: StoreVariant[] = (list || [])
      .filter((v) => v.vid)
      .map((v) => ({
        vid: String(v.vid),
        label: String(v.variantNameEn || "Standard").slice(0, 120),
        price:
          v.variantSellPrice != null && Number.isFinite(Number(v.variantSellPrice))
            ? withMargin(Number(v.variantSellPrice))
            : null,
        image: marketImage(v.variantImage || ""),
        stock: v.variantStock != null && Number.isFinite(Number(v.variantStock)) ? Number(v.variantStock) : null,
        weightGrams:
          (v as { variantWeight?: unknown }).variantWeight != null &&
          Number.isFinite(Number((v as { variantWeight?: unknown }).variantWeight))
            ? Number((v as { variantWeight?: unknown }).variantWeight)
            : null,
      }))
    if (variants.length === 0) return NextResponse.json({ variants: [], attributes: [] })
    // A lone option with no real name (e.g. a single-SKU product) is not a
    // choice — expose it as the definitive option without selectors.
    if (variants.length === 1 && !String(list[0]?.variantNameEn || "").trim()) {
      return NextResponse.json({ variants, attributes: [], solo: true })
    }
    // Group option values by position (e.g. "Red / L" -> Color + Size).
    const width = Math.max(...variants.map((v) => splitAttrs(v.label).length))
    const attributes = Array.from({ length: width }, (_, i) => {
      const values = [...new Set(variants.map((v) => splitAttrs(v.label)[i]).filter(Boolean) as string[])]
      return { name: guessAttrName(values, i), values }
    })
    return NextResponse.json({ variants, attributes })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load options."
    return NextResponse.json({ variants: [], attributes: [], error: msg })
  }
}
