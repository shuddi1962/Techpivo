import {
  Car,
  Camera,
  Cpu,
  Gamepad2,
  Headphones,
  Keyboard,
  Laptop,
  MapPin,
  Package,
  Plug,
  ShieldCheck,
  Smartphone,
  Truck,
  Watch,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { MARKET_DEPARTMENTS, type MarketDepartment } from "@/lib/marketplace-categories";

const MENU_ICONS: Record<string, LucideIcon> = {
  Cpu: Cpu,
  Smartphone: Smartphone,
  Laptop: Laptop,
  Car: Car,
  Wrench: Wrench,
  Plug: Plug,
  Headphones: Headphones,
  Watch: Watch,
  Camera: Camera,
  Keyboard: Keyboard,
  Gamepad2: Gamepad2,
};

export function menuIcon(name: string): LucideIcon {
  return MENU_ICONS[name] ?? Package;
}

export function categoryHref(slug: string): string {
  return `/marketplace/category/${slug}`;
}

export interface MenuLeaf {
  name: string;
  slug: string;
  href: string;
}

export interface MenuSub {
  name: string;
  slug: string;
  href: string;
  leaves: MenuLeaf[];
}

export interface MenuDepartment {
  name: string;
  slug: string;
  href: string;
  icon: string;
  iconNode: LucideIcon;
  image: string;
  featured: boolean;
  subs: MenuSub[];
}

export interface MenuNavItem {
  label: string;
  href: string;
  hot?: boolean;
  external?: boolean;
}

export interface MenuPromise {
  icon: LucideIcon;
  text: string;
}

export function buildMenuDepartments(tree: MarketDepartment[]): MenuDepartment[] {
  const source = tree.length > 0 ? tree : MARKET_DEPARTMENTS;
  const menus: MenuDepartment[] = [];
  source.forEach((dep, index) => {
    if (dep.subs.length === 0) return;
    menus.push({
      name: dep.name,
      slug: dep.slug,
      href: categoryHref(dep.slug),
      icon: dep.icon,
      iconNode: menuIcon(dep.icon),
      image: dep.image,
      featured: index === 0,
      subs: dep.subs.map((sub) => ({
        name: sub.name,
        slug: sub.slug,
        href: categoryHref(sub.slug),
        leaves: sub.items.map((leaf) => ({
          name: leaf.name,
          slug: leaf.slug,
          href: categoryHref(leaf.slug),
        })),
      })),
    });
  });
  return menus;
}

export const MENU_NAV: MenuNavItem[] = [
  { label: "Home", href: "/marketplace" },
  { label: "Shop", href: "/marketplace/shop" },
  { label: "Deals of the Day", href: "/marketplace/deals", hot: true },
  { label: "Best Sellers", href: "/marketplace/best-sellers" },
  { label: "Top Stores", href: "/marketplace/top-stores" },
  { label: "New Arrivals", href: "/marketplace/new-arrivals" },
  { label: "Track Order", href: "/marketplace/track" },
  { label: "Blog", href: "https://techpivo.com/", external: true },
];

export const MENU_PROMISES: MenuPromise[] = [
  { icon: Truck, text: "Free shipping on orders over $49" },
  { icon: MapPin, text: "Track your order anytime" },
  { icon: ShieldCheck, text: "Secure checkout" },
];
