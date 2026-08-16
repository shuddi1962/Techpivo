"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Code2, Network, Smartphone, GraduationCap, BarChart3, Wallet, BadgeCheck,
  PauseCircle, Globe2, Sparkles, Megaphone, Eye, MousePointerClick, ShieldCheck,
  ArrowRight, TrendingUp, PlayCircle, LayoutGrid, Send, MapPin,
} from "lucide-react";
import { useFx } from "@/lib/use-fx";
import { FX_POPULAR } from "@/lib/fx-shared";
import { createClient } from "@/lib/supabase/client";

const PRIMARY = "#2563EB";
const PRIMARY_DARK = "#1D4ED8";
const PRIMARY_SOFT = "#DBEAFE";
const PRIMARY_GRADIENT = "linear-gradient(120deg, #1E40AF 0%, #2563EB 60%, #3B82F6 100%)";

interface Placement {
  id: string;
  name: string;
  position: string;
  ad_type: string;
  sizes: string[];
  min_bid_cpm: number;
  min_bid_cpc: number;
  supports_video: boolean;
  est_impressions: number | null;
}

interface AdStats {
  placements: Placement[];
}

const POSITION_ICONS: Record<string, string> = {
  top: "📰",
  header: "🖼️",
  sidebar: "📌",
  infeed: "🧵",
  bottom: "👇",
  sticky: "📎",
  popup: "🪟",
  native: "💬",
};

const AD_TYPE_BADGES: Record<string, { label: string; cls: string }> = {
  popup: { label: "POPUP", cls: "bg-purple-100 text-purple-700" },
  popup_toast: { label: "POPUP", cls: "bg-purple-100 text-purple-700" },
  sponsored_article: { label: "SPONSORED", cls: "bg-amber-100 text-amber-700" },
  video: { label: "VIDEO", cls: "bg-blue-100 text-blue-700" },
  banner: { label: "BANNER", cls: "bg-slate-100 text-slate-600" },
  infeed: { label: "IN-FEED", cls: "bg-slate-100 text-slate-600" },
  native: { label: "NATIVE", cls: "bg-slate-100 text-slate-600" },
  sticky: { label: "STICKY", cls: "bg-slate-100 text-slate-600" },
  display: { label: "DISPLAY", cls: "bg-slate-100 text-slate-600" },
  interstitial: { label: "INTERSTITIAL", cls: "bg-slate-100 text-slate-600" },
};

const FORMAT_EXAMPLES = [
  { title: "Leaderboard Banner", size: "728 × 90", video: false, hint: "High-visibility banner above article content", img: "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg", h: "h-24" },
  { title: "Rectangle / Sidebar", size: "300 × 250", video: false, hint: "Mid-page rectangle on articles & categories", img: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg", h: "h-44" },
  { title: "In-Content", size: "336 × 280", video: false, hint: "Inline within articles, between paragraphs", img: "https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg", h: "h-40" },
  { title: "Video Ads", size: "VIDEO", video: true, hint: "Motion ads on video-capable placements", img: "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg", h: "h-40" },
];

export function AdvertiseLanding() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const fx = useFx();
  const currency = fx.displayCurrency;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ads/stats", { cache: "no-store" });
      if (res.ok) {
        const d: AdStats = await res.json();
        setPlacements(Array.isArray(d.placements) ? d.placements : []);
      }
    } catch {
      // keep previous state
    }
  }, []);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`advertise_landing_placements_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_placements" }, () => load())
      .subscribe();
    const id = window.setInterval(load, 60000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  }, [load]);

  return (
    <div className="w-full">
      {/* ==================== TRUST BAR ==================== */}
      <div className="px-4 md:px-12 lg:px-16 pt-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { value: "20,000+", desc: "Monthly tech readers" },
            { value: "11", desc: "Content categories" },
            { value: `${placements.length > 0 ? placements.length : "10+"}`, desc: "Ad placements to choose from" },
            { value: "10+", desc: "Currencies supported" },
            { value: "24h", desc: "Campaign approval" },
          ].map((s) => (
            <div key={s.value} className="bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
              <div className="font-bold text-2xl mb-1" style={{ color: PRIMARY }}>{s.value}</div>
              <div className="text-sm text-slate-500">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ==================== AUDIENCE ==================== */}
      <div className="px-4 md:px-12 lg:px-16 py-14">
        <div className="max-w-2xl mb-10">
          <h2 className="text-3xl font-bold mb-3 text-slate-900">An Audience That Matters</h2>
          <p className="text-slate-500 text-[15px] leading-relaxed">
            Techpivo serves readers who research before they buy — from hosting and developer
            tools to laptops and security software.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Code2, title: "Developers & Programmers", desc: "Tutorials on Python, JavaScript, web development and AI tooling." },
            { icon: Network, title: "IT & Network Professionals", desc: "Networking, infrastructure and enterprise technology content." },
            { icon: Smartphone, title: "Gadget Buyers", desc: "Reviews, comparisons and buying guides for phones and laptops." },
            { icon: GraduationCap, title: "Learners & Enthusiasts", desc: "Guides on AI, cybersecurity and career skills in technology." },
          ].map((a) => {
            const Icon = a.icon;
            return (
              <div key={a.title} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: PRIMARY_SOFT, color: PRIMARY_DARK }}>
                  <Icon size={22} />
                </div>
                <h3 className="font-bold mb-1.5 text-slate-900">{a.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{a.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== AD FORMATS ==================== */}
      <div className="px-4 md:px-12 lg:px-16 py-14 bg-slate-50">
        <div className="max-w-2xl mb-10">
          <h2 className="text-3xl font-bold mb-3 text-slate-900">Ad Formats for Every Goal</h2>
          <p className="text-slate-500 text-[15px] leading-relaxed">
            From wide leaderboards to motion video — here&apos;s how your brand can appear
            across Techpivo.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FORMAT_EXAMPLES.map((f) => (
            <div key={f.title} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">{f.title}</h3>
                {f.video ? (
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 rounded-md px-2 py-1">VIDEO</span>
                ) : (
                  <span className="text-xs font-semibold bg-slate-100 text-slate-500 rounded-md px-2 py-1 font-mono">{f.size}</span>
                )}
              </div>
              <div className={`relative rounded-lg overflow-hidden ${f.h}`}>
                <img src={f.img} alt={`${f.title} example`} loading="lazy" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                {f.video && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur flex items-center justify-center border border-white/50">
                      <PlayCircle size={22} className="text-white" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-white">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <Eye size={12} /> {f.hint}
                  </span>
                  <span className="text-[10px] bg-white/20 rounded px-1.5 py-0.5">Example</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center mt-8">
          <Link href={`/account/ads/new?currency=${currency}`} className="inline-flex items-center gap-2 font-semibold text-[15px]" style={{ color: PRIMARY_DARK }}>
            See all ad spaces <ArrowRight size={16} />
          </Link>
        </p>
      </div>

      {/* ==================== AD SPACE PRICING (geo-currency) ==================== */}
      <div className="px-4 md:px-12 lg:px-16 py-14">
        <div className="max-w-2xl mb-10">
          <h2 className="text-3xl font-bold mb-3 text-slate-900">Choose Your Ad Space</h2>
          <p className="text-slate-500 text-[15px] leading-relaxed">
            No fixed rate cards. Every space has a transparent minimum bid — see it in{" "}
            <span className="font-semibold" style={{ color: PRIMARY_DARK }}>{currency}</span> when
            you start booking, and you can pay in your local currency.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <MapPin size={15} className="text-slate-400" />
            <label htmlFor="landing-currency" className="text-sm text-slate-600 font-medium">Show prices in</label>
            <select
              id="landing-currency"
              value={currency}
              onChange={(e) => fx.setDisplayCurrency(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FX_POPULAR.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {fx.loading && <span className="text-xs text-slate-400">loading rates…</span>}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(placements.length > 0 ? placements : []).map((p) => {
            const badge = AD_TYPE_BADGES[p.ad_type] || (p.supports_video ? AD_TYPE_BADGES.video : AD_TYPE_BADGES.banner);
            const sizeLabel = (p.sizes || []).slice(0, 2).join(" · ") || badge.label;
            return (
              <Link
                key={p.id}
                href={`/account/ads/new?placement=${p.id}&currency=${currency}`}
                className="group bg-white border border-slate-200 rounded-2xl p-5 flex flex-col shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{POSITION_ICONS[p.position] || "📢"}</span>
                  <div className="flex items-center gap-1.5">
                    {p.supports_video && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">
                        <PlayCircle className="h-3 w-3" /> Video
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${badge.cls}`}>{badge.label}</span>
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 group-hover:underline">{p.name}</h3>
                <div className="mt-1.5 text-xs text-slate-500">
                  <span className="font-mono bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">{sizeLabel}</span>
                  {p.est_impressions ? <span className="ml-2">~{Number(p.est_impressions).toLocaleString()} monthly impressions</span> : null}
                </div>

                <span
                  className="mt-auto pt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors group-hover:brightness-95"
                  style={{ borderColor: `${PRIMARY}40`, background: PRIMARY_SOFT, color: PRIMARY_DARK }}
                >
                  <LayoutGrid size={14} /> Book this space
                </span>
              </Link>
            );
          })}
        </div>
        {placements.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">
            <Link href={`/account/ads/new?currency=${currency}`} className="font-semibold" style={{ color: PRIMARY_DARK }}>Open My Ads</Link> to see the full inventory and start booking.
          </p>
        )}
      </div>

      {/* ==================== HOW IT WORKS ==================== */}
      <div className="px-4 md:px-12 lg:px-16 py-14">
        <div className="max-w-2xl mb-10">
          <h2 className="text-3xl font-bold mb-3 text-slate-900">How It Works</h2>
          <p className="text-slate-500 text-[15px] leading-relaxed">
            Everything happens in your account — from setup to real-time reporting.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[
            { step: "1", icon: Megaphone, title: "Create your campaign", desc: "Sign in, open My Ads and pick an ad space — every placement shows its minimum bid in your currency." },
            { step: "2", icon: Wallet, title: "Set budget & bid", desc: "Choose CPM or CPC, set your own bid and daily budget, pick your audience and duration." },
            { step: "3", icon: Sparkles, title: "Upload or AI-generate creative", desc: "Upload a banner or video — or let our AI write your headline and copy in one click." },
            { step: "4", icon: BadgeCheck, title: "Approved, live & tracked", desc: "We approve within 24 hours. Watch impressions, clicks, CTR and spend update in real time." },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.step} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: PRIMARY }}>{s.step}</span>
                  <Icon size={20} style={{ color: PRIMARY_DARK }} />
                </div>
                <h3 className="font-bold mb-1.5 text-slate-900">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== WHY + ANALYTICS ==================== */}
      <div className="px-4 md:px-12 lg:px-16 py-14 bg-slate-50">
        <div className="max-w-2xl mb-10">
          <h2 className="text-3xl font-bold mb-3 text-slate-900">Why Advertisers Choose Techpivo</h2>
          <p className="text-slate-500 text-[15px] leading-relaxed">
            A marketplace built like the big platforms — but for technology audiences, with
            transparent delivery you can actually see.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: Wallet, title: "You set the price", desc: "Auction-based bidding, Google Ads style. You choose your bid and daily budget — there are no fixed rate cards." },
            { icon: BadgeCheck, title: "Only pay for what delivers", desc: "You're charged against actual impressions or clicks, capped at your daily budget. No hidden fees." },
            { icon: BarChart3, title: "Real-time analytics", desc: "Live impressions, clicks, CTR and spend on every campaign, with a 14-day performance chart in your account." },
            { icon: MousePointerClick, title: "Measurable results", desc: "See which placements deliver and which creative works — then pause, tweak and resume anytime." },
            { icon: PauseCircle, title: "Full control", desc: "Pause or resume your campaign whenever you like. Change direction without waiting for us." },
            { icon: ShieldCheck, title: "Reviewed by humans", desc: "Every campaign is reviewed within 24 hours to protect your brand and our readers." },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: PRIMARY_SOFT, color: PRIMARY_DARK }}>
                  <Icon size={22} />
                </div>
                <h3 className="font-bold mb-1.5 text-slate-900">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== TRACKING SHOWCASE (analytics + chat) ==================== */}
      <div className="px-4 md:px-12 lg:px-16 py-14">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold mb-4" style={{ color: PRIMARY_DARK }}>
              <TrendingUp size={16} /> Tracking built in
            </div>
            <h2 className="text-3xl font-bold mb-4 text-slate-900">Every Spend, Tracked</h2>
            <p className="text-slate-500 leading-relaxed mb-6">
              From the moment your campaign goes live, Techpivo records each impression and click
              on the placement. Your account shows:
            </p>
            <ul className="space-y-3">
              {[
                "Live impressions, clicks, CTR and spend on every campaign",
                "A 14-day daily delivery chart so you can spot what works",
                "Pause / resume controls with no penalty or re-approval",
                "Campaign status at every step — pending, approved, live, paused",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-[15px] text-slate-700">
                  <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: PRIMARY }} />
                  {t}
                </li>
              ))}
            </ul>
            <Link
              href={`/account/ads/new?currency=${currency}`}
              className="inline-flex items-center gap-2 font-semibold rounded-xl px-6 py-3.5 text-[15px] mt-7"
              style={{ background: PRIMARY, color: "#fff" }}
            >
              <Megaphone size={18} /> Create Your First Campaign <ArrowRight size={16} />
            </Link>
          </div>
          <div className="space-y-5">
            {/* Analytics mock */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-slate-900">Campaign Analytics</h3>
                  <p className="text-xs text-slate-500">Sample view — last 14 days</p>
                </div>
                <span className="text-xs font-semibold bg-blue-100 text-blue-700 rounded-full px-3 py-1">● LIVE</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: "Impressions", value: "12,480" },
                  { label: "Clicks", value: "342" },
                  { label: "CTR", value: "2.74%" },
                ].map((k) => (
                  <div key={k.label} className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className="font-bold text-lg text-slate-900">{k.value}</div>
                    <div className="text-[11px] text-slate-500">{k.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-end gap-1.5 h-28">
                {[35, 55, 40, 70, 62, 85, 75, 95, 80, 100, 88, 92, 70, 84].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t" style={{ background: PRIMARY, opacity: 0.35 + (h / 100) * 0.65 }} />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-2">
                <span>14 days ago</span><span>Today</span>
              </div>
            </div>

            {/* Chat mock */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: PRIMARY }}>
                  TP
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Advertiser Support</h3>
                  <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online now — replies in minutes
                  </p>
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-700">
                  Hi — is the sidebar placement good for a SaaS product targeting dev teams?
                </div>
                <div className="max-w-[85%] ml-auto rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-white" style={{ background: PRIMARY }}>
                  Absolutely! The sidebar is a top performer for dev-focused SaaS and averages 30k+ impressions a month. Want me to walk you through the setup?
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-700">
                  Yes please — also, does the AI creative generator work for banners?
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <div className="flex-1 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-400 flex items-center gap-2">
                  <Send size={13} /> Type a message…
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ background: PRIMARY }}>
                  <Send size={14} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== FAQ ==================== */}
      <div className="px-4 md:px-12 lg:px-16 py-14 bg-slate-50">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 md:p-10 shadow-sm">
          <h2 className="text-3xl font-bold mb-8 text-center text-slate-900">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-6">
            {[
              { q: "Where do I create a campaign?", a: "Sign in and go to your account — My Ads. There you'll find the full inventory of ad spaces with their minimum bids, plus the campaign builder. It only takes a few minutes." },
              { q: "How does bidding work?", a: "Each ad space has a minimum bid (CPM — per 1,000 impressions — or CPC — per click). You set a bid at or above that floor, plus a daily budget that covers it. Higher bids win more delivery; you only pay for what actually serves, up to your daily cap." },
              { q: "When do I pay?", a: "No payment is collected when you submit. Our team reviews your campaign and confirms it before we arrange payment — usually within 24 hours." },
              { q: "Which currencies do you support?", a: "We're global. Prices are shown in your local currency automatically based on where you are — NGN, USD, EUR, GBP, GHS, KES, ZAR, CAD, AUD, INR and more — converted live at published rates, and you can pay in your own currency." },
              { q: "Can I run video ads?", a: "Yes. Ad spaces marked VIDEO support video creatives (MP4/WebM, max 30s recommended). Upload the video URL and an optional poster image." },
              { q: "What targeting options are available?", a: "You can target by country, device and interest (category). We apply it best-effort when your campaign goes live." },
              { q: "Can I see my campaign performance?", a: "Every campaign tracks impressions, clicks, CTR and spend in real time — with a 14-day performance chart in your account, plus Pause/Resume whenever you like." },
              { q: "What if my creative is rejected?", a: "We'll send you the reason and you can fix and resubmit. Common issues: low-res images, misleading claims or off-topic content." },
            ].map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold mb-1.5 text-slate-900">{f.q}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== FINAL CTA ==================== */}
      <section className="px-4 md:px-12 lg:px-16 py-16 text-center text-white" style={{ background: PRIMARY_GRADIENT }}>
        <Globe2 size={36} className="mx-auto mb-5 opacity-90" />
        <h2 className="text-3xl md:text-4xl font-bold mb-3">Launch Your Campaign in Minutes</h2>
        <p className="mb-8 opacity-90 max-w-xl mx-auto text-[15px]">
          Sign in, pick your ad space, set your budget and bid — our team approves within 24
          hours and your results are live from day one.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link
            href={`/account/ads/new?currency=${currency}`}
            className="inline-flex items-center gap-2 bg-white font-semibold px-7 py-3.5 rounded-xl"
            style={{ color: PRIMARY_DARK }}
          >
            <Megaphone size={18} /> Start Your Campaign
          </Link>
          <a
            href="mailto:ads@techpivo.com"
            className="inline-flex items-center border border-white/40 px-7 py-3.5 rounded-xl font-medium hover:bg-white/10 transition-colors"
          >
            ads@techpivo.com
          </a>
        </div>
        <p className="text-white/70 text-sm mt-6">
          Already have an account?{" "}
          <Link href="/account/ads" className="underline font-semibold">Open My Ads</Link>
        </p>
      </section>
    </div>
  );
}
