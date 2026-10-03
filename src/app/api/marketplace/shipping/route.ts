import { NextRequest, NextResponse } from "next/server"
import { storeShipOptions, type ShipOption } from "@/lib/marketplace-shipping"
import { supplierShipOptions } from "@/lib/marketplace-freight"

export const dynamic = "force-dynamic"

// Unified delivery options: live supplier courier rates (with markup) +
// the store's Standard / Express fallbacks (always present).
// GET (single item, product page):
//   ?product_id=<uuid>&variant_vid=<vid>&qty=1&country=NG&subtotal=12.5
// POST (whole cart, checkout):
//   { items: [{ product_id, variant_vid, qty }], country, subtotal }
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const subtotal = Number(params.get("subtotal")) || 0
  const options = await optionsFor(
    [
      {
        product_id: params.get("product_id") || "",
        variant_vid: params.get("variant_vid") || "",
        qty: Math.max(1, Math.min(99, Math.floor(Number(params.get("qty")) || 1))),
      },
    ],
    params.get("country") || "NG",
    subtotal
  )
  return NextResponse.json({ options })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const items = (Array.isArray(body?.items) ? body.items : []) as Array<{
    product_id?: string
    variant_vid?: string
    qty?: number
  }>
  const options = await optionsFor(
    items.slice(0, 50).map((i) => ({
      product_id: String(i.product_id || ""),
      variant_vid: String(i.variant_vid || ""),
      qty: Math.max(1, Math.min(99, Math.floor(Number(i.qty) || 1))),
    })),
    String(body?.country || "NG"),
    Number(body?.subtotal) || 0
  )
  return NextResponse.json({ options })
}

async function optionsFor(
  lines: Array<{ product_id: string; variant_vid: string; qty: number }>,
  country: string,
  subtotal: number
): Promise<ShipOption[]> {
  const store = storeShipOptions(Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0)
  const live = await supplierShipOptions(lines, country)
  const seen = new Set<string>()
  const merged: ShipOption[] = []
  const push = (o: { id: string; name: string; eta: string; feeUsd: number }, source: ShipOption["source"]) => {
    const key = `${o.name}::${o.feeUsd}`
    if (seen.has(key)) return
    seen.add(key)
    merged.push({ id: o.id, name: o.name, eta: o.eta, feeUsd: o.feeUsd, source })
  }
  live.forEach((o) => push(o, "supplier"))
  store.forEach((o) => push(o, "store"))
  return merged
}
