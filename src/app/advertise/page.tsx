import Image from "next/image"
import Link from "next/link"
import {
  Code2, Network, Smartphone, GraduationCap, BarChart3, Wallet, BadgeCheck,
  PauseCircle, Globe2, Sparkles, Megaphone, Eye, MousePointerClick, ShieldCheck,
  ArrowRight, TrendingUp,
} from "lucide-react"

const PRIMARY = "#0D9488"
const PRIMARY_DARK = "#0F766E"
const BORDER = "#E2E8F0"
const TEXT = "#0F172A"
const TEXT_MUTED = "#475569"
const TEXT_DIM = "#94A3B8"

export default function AdvertisePage() {
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

      {/* ==================== TRUST BAR ==================== */}
      <div className="px-4 md:px-12 lg:px-16 pt-12 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { value: "20,000+", desc: "Monthly tech readers" },
            { value: "11", desc: "Content categories" },
            { value: "10+", desc: "Ad placements to choose from" },
            { value: "10", desc: "Currencies supported" },
            { value: "24h", desc: "Campaign approval" },
          ].map((s) => (
            <div key={s.value} className="bg-card border rounded-xl p-5 text-center">
              <div className="font-bold text-2xl mb-1" style={{ color: PRIMARY }}>{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ==================== AUDIENCE ==================== */}
      <div className="px-4 md:px-12 lg:px-16 py-14">
        <div className="max-w-2xl mb-10">
          <h2 className="text-3xl font-bold mb-3">An Audience That Matters</h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
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
            const Icon = a.icon
            return (
              <div key={a.title} className="bg-card border rounded-2xl p-6">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "#CCFBF1", color: PRIMARY_DARK }}>
                  <Icon size={22} />
                </div>
                <h3 className="font-bold mb-1.5">{a.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{a.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ==================== AD FORMATS ==================== */}
      <div className="px-4 md:px-12 lg:px-16 py-14 bg-slate-50">
        <div className="max-w-2xl mb-10">
          <h2 className="text-3xl font-bold mb-3">Ad Formats for Every Goal</h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            Browse the full inventory of ad spaces — with minimum bids and real-time delivery
            stats — inside your account.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Leaderboard Banner</h3>
              <span className="text-xs font-semibold bg-slate-100 text-slate-500 rounded-md px-2 py-1 font-mono">728 × 90</span>
            </div>
            <div className="rounded-lg border-2 border-dashed border-slate-200 h-20 flex items-center justify-center text-sm text-slate-400">
              <Eye size={18} className="mr-2" /> High-visibility banner above article content
            </div>
          </div>
          <div className="bg-white border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Rectangle / Sidebar</h3>
              <span className="text-xs font-semibold bg-slate-100 text-slate-500 rounded-md px-2 py-1 font-mono">300 × 250</span>
            </div>
            <div className="rounded-lg border-2 border-dashed border-slate-200 h-40 flex items-center justify-center text-sm text-slate-400">
              <Eye size={18} className="mr-2" /> Mid-page rectangle on articles &amp; categories
            </div>
          </div>
          <div className="bg-white border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">In-Content</h3>
              <span className="text-xs font-semibold bg-slate-100 text-slate-500 rounded-md px-2 py-1 font-mono">336 × 280</span>
            </div>
            <div className="rounded-lg border-2 border-dashed border-slate-200 h-36 flex items-center justify-center text-sm text-slate-400">
              <Eye size={18} className="mr-2" /> Inline within articles, between paragraphs
            </div>
          </div>
          <div className="bg-white border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Video Ads</h3>
              <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-md px-2 py-1">VIDEO</span>
            </div>
            <div className="rounded-lg border-2 border-dashed border-slate-200 h-36 flex items-center justify-center text-sm text-slate-400">
              <Megaphone size={18} className="mr-2" /> Motion ads on video-capable placements
            </div>
          </div>
        </div>
        <p className="text-center mt-8">
          <Link href="/account/ads/new" className="inline-flex items-center gap-2 font-semibold text-[15px]" style={{ color: PRIMARY_DARK }}>
            See all ad spaces &amp; minimum bids <ArrowRight size={16} />
          </Link>
        </p>
      </div>

      {/* ==================== HOW IT WORKS ==================== */}
      <div className="px-4 md:px-12 lg:px-16 py-14">
        <div className="max-w-2xl mb-10">
          <h2 className="text-3xl font-bold mb-3">How It Works</h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
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
            const Icon = s.icon
            return (
              <div key={s.step} className="bg-card border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: PRIMARY }}>{s.step}</span>
                  <Icon size={20} style={{ color: PRIMARY_DARK }} />
                </div>
                <h3 className="font-bold mb-1.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ==================== WHY + ANALYTICS ==================== */}
      <div className="px-4 md:px-12 lg:px-16 py-14 bg-slate-50">
        <div className="max-w-2xl mb-10">
          <h2 className="text-3xl font-bold mb-3">Why Advertisers Choose Techpivo</h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
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
            const Icon = f.icon
            return (
              <div key={f.title} className="bg-white border rounded-2xl p-6">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "#CCFBF1", color: PRIMARY_DARK }}>
                  <Icon size={22} />
                </div>
                <h3 className="font-bold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ==================== TRACKING SHOWCASE ==================== */}
      <div className="px-4 md:px-12 lg:px-16 py-14">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold mb-4" style={{ color: PRIMARY_DARK }}>
              <TrendingUp size={16} /> Tracking built in
            </div>
            <h2 className="text-3xl font-bold mb-4">Every Naira, Tracked</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
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
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold">Campaign Analytics</h3>
                <p className="text-xs text-muted-foreground">Sample view — last 14 days</p>
              </div>
              <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full px-3 py-1">● LIVE</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Impressions", value: "12,480" },
                { label: "Clicks", value: "342" },
                { label: "CTR", value: "2.74%" },
              ].map((k) => (
                <div key={k.label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="font-bold text-lg">{k.value}</div>
                  <div className="text-[11px] text-muted-foreground">{k.label}</div>
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
        </div>
      </div>

      {/* ==================== FAQ ==================== */}
      <div className="px-4 md:px-12 lg:px-16 py-14 bg-slate-50">
        <div className="bg-card border rounded-2xl p-8 md:p-10">
          <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
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
                <h3 className="font-semibold mb-1.5" style={{ color: TEXT }}>{f.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
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
  )
}
