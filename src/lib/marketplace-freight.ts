// Supplier freight resolution (SERVER ONLY — calls the supplier API).
import { createPublicClient } from "@/lib/supabase/server"
import { fetchWithTimeout } from "@/lib/fetch-timeout"
import { cjGetFreight, cjGetVariants, withFreightMarkup, type CjFreightOption } from "@/lib/cj"

export interface FreightLine {
  product_id: string
  variant_vid?: string | null
  qty: number
}

export interface SupplierShipOption {
  id: string
  name: string
  eta: string
  feeUsd: number
}

// Resolve order lines to supplier variant ids for freight calculation.
export async function resolveFreightVids(lines: FreightLine[]): Promise<Array<{ vid: string; quantity: number }>> {
  const ids = [...new Set(lines.map((l) => String(l.product_id)).filter((x) => /^[0-9a-f-]{36}$/i.test(x)))].slice(0, 50)
  if (ids.length === 0) return []
  const supabase = createPublicClient()
  const res = (await fetchWithTimeout(
    supabase.from("affiliate_products").select("id,cj_pid,cj_vid").in("id", ids).eq("is_active", true),
    8000
  )) as { data: Array<{ id: string; cj_pid: string | null; cj_vid: string | null }> | null } | null
  const byId = new Map((res?.data || []).map((p) => [p.id, p]))
  const out: Array<{ vid: string; quantity: number }> = []
  for (const l of lines) {
    const p = byId.get(String(l.product_id))
    if (!p?.cj_pid) continue
    const qty = Math.max(1, Math.min(99, Math.floor(Number(l.qty) || 1)))
    let vid = (typeof l.variant_vid === "string" && l.variant_vid) || p.cj_vid || ""
    if (!vid) {
      try {
        const variants = await cjGetVariants(p.cj_pid)
        vid = String(variants.find((v) => v.vid)?.vid || "")
      } catch {
        continue
      }
    }
    if (vid) out.push({ vid, quantity: qty })
  }
  return out
}

// Live supplier courier options with store markup. Empty when the supplier
// catalog is unreachable — callers must fall back to store methods.
export async function supplierShipOptions(
  lines: FreightLine[],
  country = "NG"
): Promise<SupplierShipOption[]> {
  try {
    const cc = country.toUpperCase().slice(0, 2) || "NG"
    const products = await resolveFreightVids(lines)
    if (products.length === 0) return []
    // 1. Combined parcel quote (all items, one shipment) — the true
    // consolidated rate, like AliExpress combined shipping.
    const combined = await freightFor(products, cc)
    if (combined.length > 0) return combined
    // 2. Per-line quotes intersected on couriers serving EVERY item, fees
    // summed — one courier, one parcel, honest total.
    if (products.length > 1) {
      const perLine = await Promise.all(
        products.slice(0, 6).map((p) => freightFor([p], cc).catch(() => [] as SupplierShipOption[]))
      )
      const common = intersectOptions(perLine)
      if (common.length > 0) return common
    }
    return []
  } catch {
    return []
  }
}

async function freightFor(
  products: Array<{ vid: string; quantity: number }>,
  country: string
): Promise<SupplierShipOption[]> {
  const list = await cjGetFreight({ endCountryCode: country, products })
  return (list || [])
    .map((o: CjFreightOption) => {
      const fee = Number(o.logisticPrice ?? o.totalPostageFee ?? o.shippingFee)
      const aging = String(o.logisticAging || o.deliveryTime || "").trim()
      return {
        id: `supplier:${String(o.logisticName || "Standard")}`,
        name: String(o.logisticName || "Standard").slice(0, 80),
        eta: /^\d/.test(aging) && !/day/i.test(aging) ? `${aging} days` : aging,
        feeUsd: withFreightMarkup(fee),
      }
    })
    .filter((o) => Number.isFinite(o.feeUsd) && o.feeUsd >= 0)
    .sort((a, b) => a.feeUsd - b.feeUsd)
    .slice(0, 8)
}

function etaUpper(eta: string): number {
  const m = eta.match(/(\d+)(?:\s*[–—-]\s*(\d+))?/)
  if (!m) return 0
  return Number(m[2] || m[1]) || 0
}

function intersectOptions(lists: SupplierShipOption[][]): SupplierShipOption[] {
  if (lists.length === 0) return []
  if (lists.some((l) => l.length === 0)) return []
  const byName = new Map<string, SupplierShipOption[]>()
  for (const list of lists) {
    for (const o of list) {
      const arr = byName.get(o.name) || []
      arr.push(o)
      byName.set(o.name, arr)
    }
  }
  const out: SupplierShipOption[] = []
  for (const [name, arr] of byName) {
    if (arr.length !== lists.length) continue
    const fee = Math.round(arr.reduce((s, o) => s + o.feeUsd, 0) * 100) / 100
    const slowest = arr.reduce((a, b) => (etaUpper(b.eta) > etaUpper(a.eta) ? b : a))
    out.push({ id: `supplier:${name}`, name, eta: slowest.eta, feeUsd: fee })
  }
  return out.sort((a, b) => a.feeUsd - b.feeUsd).slice(0, 8)
}
