// Supplier freight resolution (SERVER ONLY — calls the supplier API).
import { createPublicClient } from "@/lib/supabase/server"
import { fetchWithTimeout } from "@/lib/fetch-timeout"
import { cjGetFreight, cjGetVariants, withFreightMarkup } from "@/lib/cj"

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
    const products = await resolveFreightVids(lines)
    if (products.length === 0) return []
    const list = await cjGetFreight({ endCountryCode: country.toUpperCase().slice(0, 2) || "NG", products })
    return (list || [])
      .map((o) => ({
        id: `supplier:${String(o.logisticName || "Standard")}`,
        name: String(o.logisticName || "Standard").slice(0, 80),
        eta: String(o.deliveryTime || "").slice(0, 40),
        feeUsd: withFreightMarkup(Number(o.shippingFee)),
      }))
      .filter((o) => Number.isFinite(o.feeUsd) && o.feeUsd >= 0)
      .sort((a, b) => a.feeUsd - b.feeUsd)
      .slice(0, 6)
  } catch {
    return []
  }
}
