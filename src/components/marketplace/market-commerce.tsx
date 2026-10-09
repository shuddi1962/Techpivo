// TechPivo Market commerce layer (CLIENT) — mounts the cart popup, Quick
// View, and checkout modal once for the whole storefront. Rendered inside
// MarketplaceHeader (present on every store page) so cards on any listing,
// category, product, or cart page can open them via the event bus.

import { CartPopupProvider } from "./cart-popup"
import { QuickViewProvider } from "./quick-view-modal"
import { CheckoutModalProvider } from "./checkout-modal"

export function MarketCommerce() {
  return (
    <>
      <CartPopupProvider />
      <QuickViewProvider />
      <CheckoutModalProvider />
    </>
  )
}
