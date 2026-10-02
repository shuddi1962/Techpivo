// TechPivo Marketplace — brand + demo catalog (DB-backed, demo fallback)
// Brand: TechPivo blue #1668DC (deep #0F4FB3) + amber #F59E0B
export const MARKETPLACE_BRAND = {
  name: "TechPivo",
  storeName: "TechPivo Market",
  navy: "#1668DC",
  navySoft: "#0F4FB3",
  navyDeep: "#0A2A6B",
  amber: "#F59E0B",
  amberHover: "#D97706",
  red: "#EF4444",
  green: "#10B981",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
} as const

// Dropshipping supplier display names — never show raw program keys
// (e.g. "cjdropshipping") on the storefront.
export function supplierDisplayName(programKey: string | null | undefined): string {
  const key = (programKey || "").trim().toLowerCase()
  if (!key) return "TechPivo Verified"
  if (key === "cjdropshipping" || key === "cj" || key === "cj-dropshipping") return "CJ Verified Supply"
  return (programKey || "TechPivo Verified")
    .trim()
    .split(/[\s_-]+/)
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ")
}

export interface DemoProduct {
  id: string
  name: string
  category: string
  price: number
  oldPrice?: number
  rating: number
  reviews: number
  image: string
  badge?: string
  stockLeft?: number
  stockTotal?: number
}

const px = (id: number, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`

export const MARKETPLACE_CATEGORIES = [
  { slug: "cameras", label: "Cameras", items: 142, icon: "Camera", image: px(909907, 400) },
  { slug: "computing", label: "Laptops & PCs", items: 98, icon: "Laptop", image: px(18105, 400) },
  { slug: "gaming", label: "Gaming & Consoles", items: 210, icon: "Gamepad2", image: px(275033, 400) },
  { slug: "audio", label: "Headphones", items: 85, icon: "Headphones", image: px(339465, 400) },
  { slug: "mobile", label: "Smartphones", items: 119, icon: "Smartphone", image: px(109264, 400) },
  { slug: "wearables", label: "Wearables", items: 64, icon: "Watch", image: px(437037, 400) },
  { slug: "smart-home", label: "Smart Home", items: 42, icon: "Plug", image: px(462024, 400) },
  { slug: "accessories", label: "Accessories", items: 37, icon: "Keyboard", image: px(356056, 400) },
] as const

export const DEMO_PRODUCTS: DemoProduct[] = [
  { id: "d1", name: "Sony Alpha Mirrorless 4K Camera", category: "Cameras", price: 489, oldPrice: 620, rating: 5, reviews: 214, image: px(909907), badge: "-21%", stockLeft: 18, stockTotal: 24 },
  { id: "d2", name: "Aurora X Ultra-Wide Curved Monitor 34\"", category: "Computing", price: 120, oldPrice: 135, rating: 0, reviews: 0, image: px(102975, 600), badge: "-11%", stockLeft: 13, stockTotal: 24 },
  { id: "d3", name: "Nova Tab 11\" 128GB Tablet", category: "Tablets", price: 50, oldPrice: 70, rating: 5, reviews: 98, image: px(1334597, 600), badge: "-29%" },
  { id: "d4", name: "PixelPro Flagship Smartphone 5G", category: "Smartphone", price: 150, oldPrice: 200, rating: 0, reviews: 0, image: px(109264, 600), badge: "-25%" },
  { id: "d5", name: "AeroBook Ultra 14\" Laptop", category: "Computing", price: 899, oldPrice: 1099, rating: 4, reviews: 61, image: px(18105, 600), badge: "-18%" },
  { id: "d6", name: "Pulse ANC Wireless Headphones", category: "Audio", price: 99, rating: 4, reviews: 183, image: px(1503008, 600) },
  { id: "d7", name: "Strike RGB Gaming Rig RTX Bundle", category: "Gaming", price: 1299, oldPrice: 1499, rating: 5, reviews: 44, image: px(275033, 600), badge: "-13%" },
  { id: "d8", name: "Orbit Smart Watch Series 8", category: "Wearables", price: 150, rating: 5, reviews: 320, image: px(437037, 600) },
  { id: "d9", name: "Volt Pro Portable Projector 1080p", category: "Audio Visual", price: 88, oldPrice: 106, rating: 0, reviews: 0, image: px(1775707, 600), badge: "-17%" },
  { id: "d10", name: "Forge Handheld Console OLED", category: "Handhelds", price: 200, rating: 0, reviews: 0, image: px(164938, 600) },
  { id: "d11", name: "Clarity Studio Microphone Kit", category: "Pro Audio", price: 88, rating: 0, reviews: 0, image: px(356056, 600) },
  { id: "d12", name: "Nebula Stream Hub 4K Media Box", category: "Media Hub", price: 60, oldPrice: 88, rating: 0, reviews: 0, image: px(159376, 600), badge: "-32%" },
]

export const MARKETPLACE_VENDORS = [
  { name: "TechPivo Picks", products: 12, initials: "TP", images: [px(3184291, 200), px(1108101, 200), px(3861969, 200)] },
  { name: "Gadget Hub", products: 8, initials: "GH", images: [px(109264, 200), px(18105, 200), px(1503008, 200)] },
  { name: "Pro Audio Co", products: 6, initials: "PA", images: [px(356056, 200), px(164938, 200), px(159376, 200)] },
  { name: "Smart Living", products: 9, initials: "SL", images: [px(462024, 200), px(2774556, 200), px(3184465, 200)] },
  { name: "Game Vault", products: 11, initials: "GV", images: [px(275033, 200), px(149371, 200), px(102975, 200)] },
  { name: "Mobile World", products: 7, initials: "MW", images: [px(109264, 200), px(1334597, 200), px(437037, 200)] },
]

export const MARKETPLACE_POSTS = [
  { title: "Best budget 4K cameras for creators in 2026", date: "Oct 14, 2026", comments: 4, image: px(909907, 600), excerpt: "We tested 12 mirrorless bodies under $600 — here is what actually delivers for YouTube and streaming." },
  { title: "RTX gaming rigs: what to buy before Black Friday", date: "Oct 12, 2026", comments: 9, image: px(275033, 600), excerpt: "GPU prices are dropping fast. Our editors break down the bundles worth your money right now." },
  { title: "ANC headphones ranked: sound, comfort, battery", date: "Oct 10, 2026", comments: 2, image: px(1503008, 600), excerpt: "Six flagships, one winner. Lab measurements plus two weeks of real-world commuting." },
]

export const MARKETPLACE_HERO = {
  pill: "Next-Gen Hardware Drop",
  kicker: "Limited Black Friday Special",
  titleA: "PlayStation VR",
  titleB: "Bundle",
  copy: "Complete immersive bundle includes PS VR headset, dual motion controllers, and precision camera — curated by the TechPivo team.",
  price: "$349.99",
  image: px(159376, 800),
}
