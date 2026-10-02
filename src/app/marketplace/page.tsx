import type { Metadata } from "next"
import { MarketplaceHome } from "@/components/marketplace/marketplace-home"

export const metadata: Metadata = {
  title: "TechPivo Market — Curated Tech Products & Deals",
  description:
    "Shop curated tech products, gadgets and deals on TechPivo Market — editor-reviewed picks, flash sales, top vendors and buying guides.",
}

export default function MarketplacePage() {
  return <MarketplaceHome />
}

