import type { Metadata } from "next"
import Link from "next/link"
import { StorePageShell, CollectionHero } from "@/components/marketplace/store-shell"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Frequently Asked Questions — TechPivo Market",
  description:
    "Answers about ordering, Paystack payments, tracked delivery, returns and warranty on TechPivo Market.",
}

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "How do I place an order?",
    a: "Add products to your cart, go to checkout, enter your email, name, phone and delivery address, choose a shipping method and pay with Paystack. Your order is confirmed the moment Paystack verifies the payment, and your receipt email doubles as proof of purchase.",
  },
  {
    q: "Which payment methods do you accept?",
    a: "All Paystack-supported methods: cards (Visa, Mastercard, Verve), bank transfers and USSD. Prices are listed in US dollars with the live naira equivalent — Paystack always charges the exact naira amount shown on the green Pay button.",
  },
  {
    q: "How long does delivery take?",
    a: "7–12 days with tracking on every order. You can follow your parcel from Track Order using your Paystack payment reference and checkout email.",
  },
  {
    q: "Is shipping really free over $35?",
    a: "Yes — Standard shipping is free on orders over $35. Your cart shows a live progress bar toward free shipping. Express courier upgrades are available at checkout, priced at the real courier rate.",
  },
  {
    q: "How do I track my order?",
    a: "Open the Track Order page and enter your payment reference plus your checkout email. You will see payment status, fulfillment status and live logistics tracking. If tracking looks stuck for more than 3 days, contact us with your reference.",
  },
  {
    q: "What is your return policy?",
    a: "30-day easy returns on unused items in original packaging. If an item arrives faulty or wrong, we replace or refund it once the return is received and checked. Start a return from the contact section of the Help Center with your payment reference ready.",
  },
  {
    q: "Do products carry a warranty?",
    a: "Electronics are covered against dead-on-arrival and early failure — report faults within 30 days of delivery with photos or a short video and we will make it right with a replacement or refund.",
  },
  {
    q: "Are your products genuine?",
    a: "Every listing is quality-checked by the TechPivo team before it goes live, branded items are sourced through verified supply, and each brand tile in the store only appears while that brand is actually in stock.",
  },
  {
    q: "Can I change or cancel my order?",
    a: "Before it ships, yes — contact us immediately with your payment reference and we will cancel or edit it free of charge. Once handed to the courier it can no longer be changed, but the 30-day return window still applies.",
  },
  {
    q: "How do I contact support?",
    a: "Use the contact options on the Help Center page and always include your payment reference so we can pull up your order, payment and tracking in one place.",
  },
]

export default function MarketplaceFaqPage() {
  return (
    <StorePageShell trail={[{ label: "FAQ" }]}>
      <CollectionHero
        kicker="TechPivo Market"
        title="Frequently Asked Questions"
        copy="Quick answers about ordering, payments, delivery, returns and warranty."
      />
      <div className="space-y-3">
        {FAQS.map((f) => (
          <details
            key={f.q}
            className="group rounded-2xl border border-[#E2E8F0] bg-white shadow-sm open:shadow-md"
          >
            <summary className="cursor-pointer list-none px-5 py-4 text-[15px] font-bold text-[#0F172A] transition-colors hover:text-[#B45309] [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                {f.q}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F8FAFC] text-lg font-bold text-[#B45309] transition-transform group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{f.a}</p>
          </details>
        ))}
      </div>
      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 text-center shadow-sm">
        <p className="text-sm font-bold text-[#0F172A]">Still have questions?</p>
        <p className="mt-1 text-sm text-slate-500">
          The Help Center walks through every part of shopping with us.
        </p>
        <Link
          href="/marketplace/help"
          className="mt-3 inline-block rounded-lg bg-[#F59E0B] px-5 py-2.5 text-sm font-bold text-[#0F172A] transition-colors hover:bg-[#D97706]"
        >
          Visit Help Center
        </Link>
      </section>
    </StorePageShell>
  )
}
