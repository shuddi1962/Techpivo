// TechPivo Market — live brand detection from the real catalog.
// Brands are NEVER hardcoded into the storefront: tiles, search and the
// sidebar brand filter all derive from product names/descriptions, so a
// newly imported brand appears on its own (homepage realtime + 30s poll
// pick it up with no code change).

import {
  siAcer,
  siApple,
  siAsus,
  siBeats,
  siBose,
  siBosch,
  siCorsair,
  siDell,
  siHp,
  siHuawei,
  siHyperx,
  siIntel,
  siJbl,
  siLenovo,
  siLg,
  siNikon,
  siPanasonic,
  siRazer,
  siSamsung,
  siSeagate,
  siSennheiser,
  siSharp,
  siSiemens,
  siSony,
  siSteelseries,
  siToshiba,
  siUbiquiti,
  siXiaomi,
} from "simple-icons"

export interface BrandDef {
  name: string
  aliases: string[]
  /** Official vector path (simple-icons). Absent = styled wordmark tile. */
  path?: string
  /** Official brand color (hex). */
  color: string
  lowercase?: boolean
}

export const KNOWN_BRANDS: BrandDef[] = [
  { name: "Samsung", aliases: ["samsung"], path: siSamsung.path, color: `#${siSamsung.hex}` },
  // Sony's registered brand color is white — render the monochrome
  // wordmark in black, as Sony does on light surfaces.
  { name: "Sony", aliases: ["sony"], path: siSony.path, color: "#111111" },
  { name: "Intel", aliases: ["intel"], path: siIntel.path, color: `#${siIntel.hex}` },
  { name: "JBL", aliases: ["jbl"], path: siJbl.path, color: `#${siJbl.hex}` },
  { name: "Xiaomi", aliases: ["xiaomi", "mi"], path: siXiaomi.path, color: `#${siXiaomi.hex}` },
  { name: "Apple", aliases: ["apple", "iphone", "ipad", "macbook", "airpods"], path: siApple.path, color: "#111111" },
  { name: "Huawei", aliases: ["huawei"], path: siHuawei.path, color: `#${siHuawei.hex}` },
  { name: "Lenovo", aliases: ["lenovo", "thinkpad"], path: siLenovo.path, color: `#${siLenovo.hex}` },
  { name: "Dell", aliases: ["dell"], path: siDell.path, color: `#${siDell.hex}` },
  { name: "HP", aliases: ["hp", "hewlett", "packard"], path: siHp.path, color: `#${siHp.hex}` },
  { name: "Nikon", aliases: ["nikon"], path: siNikon.path, color: "#B58900" },
  { name: "Asus", aliases: ["asus", "rog"], path: siAsus.path, color: "#111111" },
  { name: "Acer", aliases: ["acer"], path: siAcer.path, color: `#${siAcer.hex}` },
  { name: "LG", aliases: ["lg"], path: siLg.path, color: `#${siLg.hex}` },
  { name: "Panasonic", aliases: ["panasonic"], path: siPanasonic.path, color: `#${siPanasonic.hex}` },
  { name: "Toshiba", aliases: ["toshiba"], path: siToshiba.path, color: `#${siToshiba.hex}` },
  { name: "Sharp", aliases: ["sharp", "aquos"], path: siSharp.path, color: "#4D7C0F" },
  { name: "Siemens", aliases: ["siemens"], path: siSiemens.path, color: `#${siSiemens.hex}` },
  { name: "Bosch", aliases: ["bosch"], path: siBosch.path, color: `#${siBosch.hex}` },
  { name: "Hisense", aliases: ["hisense"], color: "#0B5ED7" },
  { name: "Seagate", aliases: ["seagate"], path: siSeagate.path, color: `#${siSeagate.hex}` },
  { name: "Corsair", aliases: ["corsair"], path: siCorsair.path, color: "#111111" },
  { name: "Razer", aliases: ["razer"], path: siRazer.path, color: "#15803D" },
  { name: "SteelSeries", aliases: ["steelseries"], path: siSteelseries.path, color: `#${siSteelseries.hex}` },
  { name: "HyperX", aliases: ["hyperx"], path: siHyperx.path, color: `#${siHyperx.hex}` },
  { name: "Beats", aliases: ["beats"], path: siBeats.path, color: "#111111" },
  { name: "Sennheiser", aliases: ["sennheiser"], path: siSennheiser.path, color: "#111111" },
  { name: "Bose", aliases: ["bose"], path: siBose.path, color: "#111111" },
  { name: "Ubiquiti", aliases: ["ubiquiti", "unifi"], path: siUbiquiti.path, color: `#${siUbiquiti.hex}` },
  // No open-source vector mark — styled wordmark in the official color.
  { name: "Anker", aliases: ["anker"], color: "#00A9CE" },
  { name: "Logitech", aliases: ["logitech", "logi"], color: "#2B2D42", lowercase: true },
  { name: "Canon", aliases: ["canon"], color: "#CC0000" },
  { name: "Philips", aliases: ["philips"], color: "#0B5ED7" },
  { name: "TCL", aliases: ["tcl"], color: "#E30613" },
  { name: "Dyson", aliases: ["dyson"], color: "#7C3AED" },
  { name: "SanDisk", aliases: ["sandisk"], color: "#E50000" },
  { name: "Kingston", aliases: ["kingston"], color: "#E31837" },
  { name: "Oraimo", aliases: ["oraimo"], color: "#6F3A00" },
  { name: "Tecno", aliases: ["tecno"], color: "#0088CE" },
  { name: "Infinix", aliases: ["infinix"], color: "#00A651" },
]

// House brands — always pinned on the rail in this order; newly detected
// brands from the live catalog are appended after them automatically.
export const CURATED_BRAND_NAMES = [
  "Samsung",
  "Sony",
  "Intel",
  "JBL",
  "Anker",
  "Logitech",
  "Xiaomi",
]

export function brandDefByName(name: string): BrandDef | null {
  return KNOWN_BRANDS.find((b) => b.name.toLowerCase() === name.toLowerCase()) || null
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// First known brand mentioned as a whole word in name/description.
// Longer aliases win ("hewlett" before "hp" can't collide thanks to
// word boundaries, but multi-word intent still reads naturally).
export function detectBrand(name: string, description: string | null | undefined): BrandDef | null {
  const hay = `${name || ""} ${description || ""}`.toLowerCase()
  if (!hay.trim()) return null
  const sorted = [...KNOWN_BRANDS].sort(
    (a, b) => Math.max(...b.aliases.map((x) => x.length)) - Math.max(...a.aliases.map((x) => x.length))
  )
  for (const def of sorted) {
    for (const alias of def.aliases) {
      if (new RegExp(`(^|[^a-z0-9])${esc(alias)}([^a-z0-9]|$)`, "i").test(hay)) return def
    }
  }
  return null
}

export interface BrandStock {
  def: BrandDef
  count: number
}

// Every brand present in the given products, most-stocked first.
export function brandsInCatalog<T extends { product_name: string; product_description?: string | null }>(
  products: T[]
): BrandStock[] {
  const map = new Map<string, { def: BrandDef; count: number }>()
  for (const p of products) {
    const def = detectBrand(p.product_name, p.product_description ?? null)
    if (!def) continue
    const cur = map.get(def.name) || { def, count: 0 }
    cur.count += 1
    map.set(def.name, cur)
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}
