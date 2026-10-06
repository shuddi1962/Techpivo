import type { Metadata } from "next"
import { StorePageShell } from "@/components/marketplace/store-shell"
import { MarketAccount } from "@/components/marketplace/market-account"

export const revalidate = 60

export const metadata: Metadata = {
  title: "My Account — TechPivo Market",
  description:
    "Your TechPivo Market account — track orders, wishlist, cart and settings with the same TechPivo login.",
}

export default function MarketplaceAccountPage() {
  return (
    <StorePageShell trail={[{ label: "My Account" }]}>
      <MarketAccount />
    </StorePageShell>
  )
}
