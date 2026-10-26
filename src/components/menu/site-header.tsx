"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  Flame,
  Heart,
  Menu,
  Search,
  ShoppingBasket,
  User,
  X,
} from "lucide-react";
import { MARKETPLACE_BRAND } from "@/lib/marketplace";
import { MarketCategorySync, useMarketplaceTree } from "../marketplace/market-category-store";
import { buildMenuDepartments, MENU_NAV, MENU_PROMISES } from "./menu-data";
import "./menu.css";

function readStoredCount(key: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return 0;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length;
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown[] }).items)) {
      return (parsed as { items: unknown[] }).items.length;
    }
    return 0;
  } catch {
    return 0;
  }
}

export default function SiteHeader() {
  const pathname = usePathname();
  const tree = useMarketplaceTree();
  const departments = useMemo(() => buildMenuDepartments(tree), [tree]);
  const [open, setOpen] = useState(false);
  const [openDept, setOpenDept] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [wish, setWish] = useState(0);
  const [cart, setCart] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const syncCounts = () => {
      setWish(readStoredCount("tp_market_wish_v1"));
      setCart(readStoredCount("tp_market_cart_v1"));
    };
    syncCounts();
    window.addEventListener("storage", syncCounts);
    return () => window.removeEventListener("storage", syncCounts);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setOpenDept("");
        setDrawer(false);
      }
    };
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && event.target instanceof Node && !rootRef.current.contains(event.target)) {
        setOpen(false);
        setOpenDept("");
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, []);

  const openDeptNode = departments.find((dep) => dep.slug === openDept) ?? null;

  const closeAll = () => {
    setOpen(false);
    setOpenDept("");
  };

  return (
    <div ref={rootRef}>
      <MarketCategorySync />
      <div className="hidden w-full bg-[#1668DC] text-white lg:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-4 text-[12.5px]">
          <div className="flex items-center gap-5">
            {MENU_PROMISES.map((promise) => (
              <span key={promise.text} className="inline-flex items-center gap-1.5 text-white/85">
                <promise.icon className="h-3.5 w-3.5" />
                {promise.text}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-5 text-white/85">
            <Link href="/marketplace/account" className="hover:text-white">
              My Account
            </Link>
            <Link href="/marketplace/compare" className="inline-flex items-center gap-1.5 hover:text-white">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Compare
            </Link>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 w-full border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <button type="button" className="lg:hidden" aria-label="Open menu" onClick={() => setDrawer(true)}>
            <Menu className="h-6 w-6 text-[#14171C]" />
          </button>
          <Link href="/marketplace" className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#14171C] text-sm font-bold text-[#F59E0B]">T</span>
            <span className="flex flex-col leading-none">
              <span className="text-[15px] font-bold text-[#14171C]">{MARKETPLACE_BRAND.name}</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F59E0B]">Market</span>
            </span>
          </Link>
          <form action="/marketplace" className="tp-search hidden md:flex">
            <input
              name="q"
              className="tp-search-input"
              placeholder="Search products, brands and categories"
              aria-label="Search products"
            />
            <button type="submit" className="tp-search-btn" aria-label="Search">
              <Search className="h-4 w-4" />
            </button>
          </form>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/marketplace/account"
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#14171C] hover:bg-[#F8FAFC] lg:flex"
            >
              <User className="h-5 w-5" />
              Account
            </Link>
            <Link href="/marketplace/wishlist" className="relative rounded-lg p-2 text-[#14171C] hover:bg-[#F8FAFC]" aria-label="Wishlist">
              <Heart className="h-5 w-5" />
              {wish > 0 ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-[#EF4444] px-1.5 text-[10px] font-bold leading-4 text-white">{wish}</span>
              ) : null}
            </Link>
            <Link href="/marketplace/cart" className="relative rounded-lg p-2 text-[#14171C] hover:bg-[#F8FAFC]" aria-label="Cart">
              <ShoppingBasket className="h-5 w-5" />
              {cart > 0 ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-[#EF4444] px-1.5 text-[10px] font-bold leading-4 text-white">
                  {cart > 99 ? "99+" : cart}
                </span>
              ) : null}
            </Link>
          </div>
        </div>

        <div className="tp-rail hidden w-full lg:block">
          <div className="mx-auto flex h-11 max-w-7xl items-center gap-6 px-4">
            <button
              type="button"
              className="tp-mega-btn flex h-full items-center gap-2.5 px-5 text-[13.5px] font-semibold"
              data-open={open ? "true" : undefined}
              aria-expanded={open}
              onMouseEnter={() => setOpen(true)}
              onClick={() => setOpen((prev) => !prev)}
            >
              <Menu className="h-4 w-4" />
              All Departments
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            <nav className="flex items-center gap-6" aria-label="Primary">
              {MENU_NAV.map((item) =>
                item.external ? (
                  <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className="tp-navlink text-[13.5px] font-medium">
                    {item.label}
                    {item.hot ? <Flame className="h-3.5 w-3.5 text-[#F59E0B]" /> : null}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="tp-navlink text-[13.5px] font-medium"
                    data-active={pathname === item.href ? "true" : undefined}
                  >
                    {item.label}
                    {item.hot ? <Flame className="h-3.5 w-3.5 text-[#F59E0B]" /> : null}
                  </Link>
                ),
              )}
            </nav>
          </div>

          {open && departments.length > 0 ? (
            <div className="tp-slide-down absolute inset-x-0 top-full z-50">
              <div className="mx-auto grid max-w-7xl gap-6 rounded-b-xl border-b border-black/5 bg-white p-6 shadow-2xl lg:grid-cols-12">
                <div className="flex max-h-[520px] flex-col gap-0.5 overflow-y-auto pr-1 lg:col-span-3">
                  {departments.map((dep) => {
                    const Icon = dep.iconNode;
                    return (
                      <button
                        key={dep.slug}
                        type="button"
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                          dep.slug === openDept ? "bg-[#FEF3C2] text-[#14171C]" : "text-slate-700 hover:bg-slate-50"
                        }`}
                        onMouseEnter={() => setOpenDept(dep.slug)}
                        onClick={() => setOpenDept(dep.slug === openDept ? "" : dep.slug)}
                      >
                        <span
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                            dep.slug === openDept ? "bg-[#F59E0B] text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{dep.name}</span>
                        {dep.featured ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-bold text-[#EF4444]">
                            <Flame className="h-3 w-3" />
                            HOT
                          </span>
                        ) : (
                          <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${dep.slug === openDept ? "text-slate-700" : "text-slate-300"}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="min-w-0 lg:col-span-9">
                  {openDeptNode ? (
                    <div className="grid gap-6 lg:grid-cols-4">
                      <div className="grid content-start gap-x-6 gap-y-5 sm:grid-cols-2 lg:col-span-3 xl:grid-cols-3">
                        {openDeptNode.subs.map((sub) => (
                          <div key={sub.slug} className="min-w-0">
                            <Link href={sub.href} className="text-[13px] font-bold text-[#14171C] hover:text-[#F59E0B]" onClick={closeAll}>
                              {sub.name}
                            </Link>
                            <ul className="mt-2 space-y-1.5">
                              {sub.leaves.slice(0, 8).map((leaf) => (
                                <li key={leaf.slug}>
                                  <Link
                                    href={leaf.href}
                                    className="block truncate text-[12.5px] text-slate-500 hover:text-[#F59E0B]"
                                    onClick={closeAll}
                                  >
                                    {leaf.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                            {sub.leaves.length > 8 ? (
                              <Link
                                href={sub.href}
                                className="mt-1.5 inline-block text-[11.5px] font-semibold text-[#F59E0B]"
                                onClick={closeAll}
                              >
                                +{sub.leaves.length - 8} more
                              </Link>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      <div className="hidden lg:block">
                        <Link
                          href={openDeptNode.href}
                          className="group relative block h-full min-h-[280px] overflow-hidden rounded-xl bg-slate-100"
                          onClick={closeAll}
                        >
                          <Image
                            src={openDeptNode.image}
                            alt={openDeptNode.name}
                            width={520}
                            height={360}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-0 left-0 p-4">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Featured collection</span>
                            <span className="mt-1 block text-base font-bold text-white">Shop all {openDeptNode.name}</span>
                          </div>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {departments.slice(0, 6).map((dep) => {
                        const Icon = dep.iconNode;
                        return (
                          <button
                            key={dep.slug}
                            type="button"
                            className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] p-3.5 text-left transition-colors hover:border-[#F59E0B] hover:bg-[#FEF3C2]/40"
                            onClick={() => setOpenDept(dep.slug)}
                          >
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
                              <Icon className="h-5 w-5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-[#14171C]">{dep.name}</span>
                              <span className="block text-xs text-slate-500">{dep.subs.length} categories</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {drawer ? (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3.5">
              <span className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#14171C] text-sm font-bold text-[#F59E0B]">T</span>
                <span className="text-sm font-bold text-[#14171C]">{MARKETPLACE_BRAND.storeName}</span>
              </span>
              <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)}>
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <nav className="flex flex-col gap-0.5 p-3" aria-label="Mobile">
              {MENU_NAV.map((item) =>
                item.external ? (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => setDrawer(false)}
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
            <div className="px-4 pb-2 pt-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Departments</div>
            <div className="flex flex-col gap-0.5 px-3 pb-6">
              {departments.slice(0, 12).map((dep) => {
                const Icon = dep.iconNode;
                return (
                  <Link
                    key={dep.slug}
                    href={dep.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setDrawer(false)}
                  >
                    <Icon className="h-4 w-4 text-slate-400" />
                    <span className="flex-1 truncate">{dep.name}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
