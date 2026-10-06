import type { Metadata } from "next"
import Link from "next/link"
import { StorePageShell, CollectionHero } from "@/components/marketplace/store-shell"
import {
  CreditCard,
  PackageSearch,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Help Center — TechPivo Market",
  description:
    "TechPivo Market help center — how to order, pay securely, track delivery, returns and warranty.",
}

const TOPICS = [
  {
    icon: ShoppingCart,
    title: "How to order",
    body: "Browse any category, tap a product to see full details and variants, choose Add to cart, then head to checkout. Fill in your email, name, phone and delivery address, pick a shipping method, and pay securely with Paystack. You get a payment reference instantly — keep it, it is also your tracking ID.",
    link: { label: "Start shopping", href: "/marketplace/shop" },
  },
  {
    icon: CreditCard,
    title: "Payments",
    body: "Checkout totals are shown in US dollars with the live naira equivalent. Paystack charges your card or transfer in Nigerian naira at the live rate — the exact naira amount is shown on the green Pay button before you confirm. Every payment is encrypted and verified before your order is confirmed.",
    link: { label: "Go to cart", href: "/marketplace/cart" },
  },
  {
    icon: Truck,
    title: "Shipping & delivery",
    body: "Every order is delivered with tracking in 7–12 days. Standard shipping is free on orders over $35 — a progress bar in your cart shows how close you are. Express courier options appear at checkout where available, priced at the real courier rate with no markup games.",
    link: { label: "Track your order", href: "/marketplace/track" },
  },
  {
    icon: PackageSearch,
    title: "Track your order",
    body: "Open Track Order and enter your Paystack payment reference plus the email you checked out with. You will see your payment status, fulfillment status and CJ logistics tracking while your parcel moves. Lost your reference? Check your email receipt from Paystack first.",
    link: { label: "Track now", href: "/marketplace/track" },
  },
  {
    icon: RotateCcw,
    title: "Returns & warranty",
    body: "Changed your mind or received the wrong item? You have 30 days from delivery for easy returns on unused items in original packaging. Faulty items are covered — we replace or refund once the return is received and checked. Start from the contact options below and include your payment reference.",
    link: { label: "Contact us", href: "/marketplace/help#contact" },
  },
  {
    icon: ShieldCheck,
    title: "Buyer protection",
    body: "Every product is quality-checked before it lists, payments never touch sellers directly, and support can see your order, payment and tracking in one place. If anything goes wrong, you always have a human to talk to.",
    link: { label: "Read the FAQ", href: "/marketplace/faq" },
  },
]

export default function MarketplaceHelpPage() {
  return (
    <StorePageShell trail={[{ label: "Help Center" }]}>
      <CollectionHero
        kicker="TechPivo Market"
        title="Help Center"
        copy="Orders, payments, shipping, tracking, returns — everything about shopping on TechPivo Market."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TOPICS.map((t) => (
          <section
            key={t.title}
            className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFFBEB] text-[#B45309]">
              <t.icon className="h-5 w-5" />
            </span>
            <h2 className="mt-3 text-base font-extrabold text-[#0F172A]">{t.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{t.body}</p>
            <Link
              href={t.link.href}
              className="mt-3 inline-block text-sm font-bold text-[#B45309] hover:text-[#D97706]"
            >
              {t.link.label} →
            </Link>
          </section>
        ))}
      </div>
      <section
        id="contact"
        className="scroll-mt-4 rounded-2xl p-6 text-white sm:p-8"
        style={{ background: "linear-gradient(120deg, #23272E 0%, #14171C 100%)" }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#F59E0B]">
          Still stuck?
        </p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Talk to a human</h2>
        <p className="mt-1 max-w-2xl text-sm text-white/80">
          Include your payment reference in every message so we can pull up your
          order instantly.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Link
            href="/contact"
            className="rounded-lg bg-[#F59E0B] px-5 py-2.5 text-sm font-bold text-[#0F172A] transition-colors hover:bg-[#D97706]"
          >
            Contact us
          </Link>
          <Link
            href="/marketplace/faq"
            className="rounded-lg border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#0F172A]"
          >
            Read the FAQ
          </Link>
        </div>
      </section>
    </StorePageShell>
  )
}
