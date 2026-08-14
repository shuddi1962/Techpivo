"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Code2, Network, Smartphone, GraduationCap, BarChart3, Wallet, BadgeCheck,
  PauseCircle, Globe2, Sparkles, Megaphone, Eye, MousePointerClick, ShieldCheck,
  ArrowRight, TrendingUp, PlayCircle, LayoutGrid, Radio, Send,
} from "lucide-react";
import { formatMoney } from "@/lib/ads";

const PRIMARY = "#0D9488";
const PRIMARY_DARK = "#0F766E";

interface Placement {
  id: string;
  name: string;
  position: string;
  min_bid_cpm: number;
  min_bid_cpc: number;
  supports_video: boolean;
  est_impressions: number | null;
}

interface AdStats {
  live_campaigns: number;
  total_campaigns: number;
  impressions: number;
  clicks: number;
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

export function AdvertiseLanding() {
  const [stats, setStats] = useState<AdStats | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ads/stats", { cache: "no-store" });
      if (res.ok) setStats(await res.json());
    } catch {
      // keep previous state
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, 60000);
    return () => clearInterval(poll);
  }, [load]);

  const ctr = stats && stats.impressions > 0 ? ((stats.clicks / stats.impressions) * 100).toFixed(2) : "0.00";

  return (
    <div className="w-full">
      {/* ==================== HERO ==================== */}
      <div className="relative overflow-hidden">
        <Image
          src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg"
          alt="Advertise on Techpivo"
          width={1600}
          height={900}
          priority
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 px-6 md:px-12 lg:px-16 py-20 md:py-28 text-white max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/25 rounded-full px-4 py-1.5 text-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Techpivo Ads — self-serve, transparent, measurable
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5">
            Reach the Tech Audience That Builds, Buys &amp; Decides
          </h1>
          <p className="text-lg md:text-xl text-white/85 max-w-2xl leading-relaxed">
            Developers, IT professionals and gadget buyers read Techpivo every day. Run your
            campaign on your terms — set your own budget and bid, and track every impression,
            click and naira spent in real time.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              href="/account/ads/new"
              className="inline-flex items-center gap-2 font-semibold rounded-xl px-6 py-3.5 text-[15px]"
              style={{ background: PRIMARY, color: "#fff" }}
            >
              <Megaphone size={18} /> Start Your Campaign <ArrowRight size={16} />
            </Link>
            <a
              href="mailto:ads@techpivo.com"
              className="inline-flex items-center font-semibold rounded-xl px-6 py-3.5 text-[15px]"
              style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.35)", color: "#fff" }}
            >
              Talk to Our Ads Team
            </a>
          </div>
          <p className="text-sm text-white/70 mt-5">
            Launch takes minutes — campaigns are reviewed and approved within 24 hours.
          </p>
        </div>
      </div>

      {/* ==================== LIVE STATS BAND ==================== */}
      <div className="px-4 md:px-12 lg:px-16 pt-12">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
            </span>
            <span className="text-sm text-slate-500">Real-time marketplace performance</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Active campaigns", value: stats ? String(stats.live_campaigns) : "—", icon: Radio, cls: "bg-blue-50 text-blue-600" },
              { label: "Impressions delivered", value: stats ? stats.impressions.toLocaleString() : "—", icon: Eye, cls: "bg-purple-50 text-purple-600" },
              { label: "Clicks", value: stats ? stats.clicks.toLocaleString() : "—", icon: MousePointerClick, cls: "bg-amber-50 text-amber-600" },
              { label: "Avg. CTR", value: stats ? `${ctr}%` : "—", icon: TrendingUp, cls: "bg-green-50 text-green-600" },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${k.cls}`}>
                  <k.icon className="h-4 w-4" />
                </div>
                <div className="text-xl font-bold text-slate-900">{k.value}</div>
                <div className="text-xs text-slate-500">{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== TRUST BAR ==================== */}
      <div className="px-4 md:px-12 lg:px-16 pt-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { value: "20,000+", desc: "Monthly tech readers" },
            { value: "11", desc: "Content categories" },
            { value: `${stats ? stats.placements.length : "10+"}`, desc: "Ad placements to choose from" },
            { value: "10", desc: "Currencies supported" },
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
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "#CCFBF1", color: PRIMARY_DARK }}>
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
            Browse the full inventory of ad spaces — with minimum bids and real-time delivery
            stats — inside your account.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { title: "Leaderboard Banner", size: "728 × 90", video: false, hint: "High-visibility banner above article content", h: "h-20" },
            { title: "Rectangle / Sidebar", size: "300 × 250", video: false, hint: "Mid-page rectangle on articles & categories", h: "h-40" },
            { title: "In-Content", size: "336 × 280", video: false, hint: "Inline within articles, between paragraphs", h: "h-36" },
            { title: "Video Ads", size: "VIDEO", video: true, hint: "Motion ads on video-capable placements", h: "h-36" },
          ].map((f) => (
            <div key={f.title} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">{f.title}</h3>
                {f.video ? (
                  <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-md px-2 py-1">VIDEO</span>
                ) : (
                  <span className="text-xs font-semibold bg-slate-100 text-slate-500 rounded-md px-2 py-1 font-mono">{f.size}</span>
                )}
              </div>
              <div className={`rounded-lg border-2 border-dashed border-slate-200 ${f.h} flex items-center justify-center text-sm text-slate-400`}>
                <Eye size={18} className="mr-2" /> {f.hint}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center mt-8">
          <Link href="/account/ads/new" className="inline-flex items-center gap-2 font-semibold text-[15px]" style={{ color: PRIMARY_DARK }}>
            See all ad spaces &amp; minimum bids <ArrowRight size={16} />
          </Link>
        </p>
      </div>

      {/* ==================== LIVE PLACEMENTS ==================== */}
      {stats && stats.placements.length > 0 && (
        <div className="px-4 md:px-12 lg:px-16 py-14">
          <div className="max-w-2xl mb-10">
            <h2 className="text-3xl font-bold mb-3 text-slate-900">Placements, Live</h2>
            <p className="text-slate-500 text-[15px] leading-relaxed">
              These ad spaces are open for campaigns right now, with minimum bids in NGN.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.placements.map((p) => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{POSITION_ICONS[p.position] || "📢"}</span>
                  {p.supports_video && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-purple-600 bg-purple-50 rounded-full px-2 py-0.5">
                      <PlayCircle className="h-3 w-3" /> Video
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-900">{p.name}</h3>
                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  <p>CPM from <span className="font-semibold text-slate-900">{formatMoney(p.min_bid_cpm, "NGN")}</span> · CPC from <span className="font-semibold text-slate-900">{formatMoney(p.min_bid_cpc, "NGN")}</span></p>
                  {p.est_impressions ? <p>~{Number(p.est_impressions).toLocaleString()} monthly impressions</p> : null}
                </div>
                <Link
                  href="/account/ads/new"
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-teal-600/30 bg-teal-50 px-3 py-2 text-sm font-semibold transition-colors hover:bg-teal-100"
                  style={{ color: PRIMARY_DARK }}
                >
                  <LayoutGrid size={14} /> Book this space
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

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
            { step: "1", icon: Megaphone, title: "Create your campaign", desc: "Sign in, open My Ads and pick an ad space — every placement shows its minimum bid." },
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
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "#CCFBF1", color: PRIMARY_DARK }}>
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
            <h2 className="text-3xl font-bold mb-4 text-slate-900">Every Naira, Tracked</h2>
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
              href="/account/ads/new"
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
                <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full px-3 py-1">● LIVE</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: "Impressions", value: stats ? stats.impressions.toLocaleString() : "12,480" },
                  { label: "Clicks", value: stats ? stats.clicks.toLocaleString() : "342" },
                  { label: "CTR", value: ctr ? `${ctr}%` : "2.74%" },
                ].map((k) => (
                  <div key={k.label} className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className="font-bold text-lg text-slate-900">{k.value}</div>
                    <div className="text-[11px] text-slate-500">{k.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-end gap-1.5 h-28">
                {[35, 55, 40, 70, 62, 85, 75, 95, 80, 100, 88, 92, 70, 84].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-teal-500/80 hover:bg-teal-600 transition-colors" style={{ height: `${h}%` }} />
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
                  Hi — is the sidebar placement good for a SaaS product targeting Nigerian devs?
                </div>
                <div className="max-w-[85%] ml-auto rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-white" style={{ background: PRIMARY }}>
                  Absolutely! The sidebar has a CPM floor of ₦500 and 30k+ monthly impressions. Want me to walk you through the setup?
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
              { q: "Which currencies do you support?", a: "We support NGN, USD, EUR, GBP, GHS, KES, ZAR, CAD, AUD and INR. Minimum bids are converted live at published rates when you set up your campaign." },
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
      <section className="px-4 md:px-12 lg:px-16 py-16 text-center text-white" style={{ background: "linear-gradient(120deg, #0F766E 0%, #0D9488 60%, #14B8A6 100%)" }}>
        <Globe2 size={36} className="mx-auto mb-5 opacity-90" />
        <h2 className="text-3xl md:text-4xl font-bold mb-3">Launch Your Campaign in Minutes</h2>
        <p className="mb-8 opacity-90 max-w-xl mx-auto text-[15px]">
          Sign in, pick your ad space, set your budget and bid — our team approves within 24
          hours and your results are live from day one.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link
            href="/account/ads/new"
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