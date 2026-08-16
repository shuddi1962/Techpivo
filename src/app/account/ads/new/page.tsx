'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FxApprox } from '@/components/fx-approx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Globe, Monitor, Sparkles, Star, Tag, Upload, Video, Wallet } from 'lucide-react';
import {
  ADS_CURRENCIES, ADS_GOALS, ADS_CTA_TYPES, ADS_CTA_LABELS,
  ADS_AUDIENCE_COUNTRIES, ADS_AUDIENCE_DEVICES, ADS_AUDIENCE_INTERESTS,
  DEFAULT_FX_RATES, formatMoney,
} from '@/lib/ads';
import { getGeoOnce } from '@/lib/tools-geo';
import { COUNTRY_TO_CURRENCY } from '@/lib/geo';
import { FX_PREF_KEY } from '@/lib/use-fx';

interface Placement {
  id: string;
  name: string;
  location: string;
  position: string;
  description: string | null;
  ad_type: string;
  sizes: string[];
  is_active: boolean;
  min_bid_cpm: number;
  min_bid_cpc: number;
  supports_video: boolean;
  est_impressions: number;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [fxRates, setFxRates] = useState<Record<string, number>>({ ...DEFAULT_FX_RATES });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [notSignedIn, setNotSignedIn] = useState(false);

  // campaign settings
  const [placementId, setPlacementId] = useState<string | null>(null);
  const [billingModel, setBillingModel] = useState<'cpm' | 'cpc'>('cpm');
  const [bidAmount, setBidAmount] = useState('');
  const [dailyBudget, setDailyBudget] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [currency, setCurrency] = useState('NGN');
  const [goal, setGoal] = useState('clicks');
  const [ctaType, setCtaType] = useState('learn_more');
  const [countries, setCountries] = useState<string[]>([]);
  const [devices, setDevices] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  // creative
  const [brand, setBrand] = useState('');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [ctaText, setCtaText] = useState('Learn More');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [contentUrl, setContentUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showNotice = useCallback((type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 6000);
  }, []);

  useEffect(() => {
    getGeoOnce().then((geo) => {
      try { if (localStorage.getItem(FX_PREF_KEY)) return; } catch { /* ignore */ }
      const cc = geo?.countryCode ? COUNTRY_TO_CURRENCY[geo.countryCode] || geo.currency || null : null;
      if (cc) setCurrency(cc);
    });
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email || undefined });
      } else {
        setNotSignedIn(true);
      }
    });
    Promise.all([
      supabase
        .from('ad_placements')
        .select('*')
        .eq('is_active', true)
        .order('min_bid_cpm', { ascending: false }),
      fetch('/admin/ads/api?section=placements').then((r) => r.json()).catch(() => ({})),
    ]).then(([placementsRes, apiRes]) => {
      if (placementsRes.data) setPlacements(placementsRes.data);
      if (apiRes.fx_rates) setFxRates({ ...DEFAULT_FX_RATES, ...apiRes.fx_rates });
      const fromParam = searchParams.get('placement');
      if (fromParam && placementsRes.data?.some((p: Placement) => p.id === fromParam)) {
        setPlacementId(fromParam);
      }
      const curParam = searchParams.get('currency');
      if (curParam && ADS_CURRENCIES.some((c) => c.code === curParam)) {
        setCurrency(curParam);
      }
      setLoading(false);
    });
  }, [searchParams]);

  const placement = placements.find((p) => p.id === placementId) || null;
  const fx = Number(fxRates[currency] || 1) || 1;

  useEffect(() => {
    if (placement && !placement.supports_video && mediaType === 'video') {
      setMediaType('image');
    }
  }, [placement, mediaType]);
  const floorNGN = billingModel === 'cpc' ? (placement?.min_bid_cpc ?? 50) : (placement?.min_bid_cpm ?? 500);
  const floorInCurrency = Math.round((floorNGN / fx) * 100) / 100;
  const bid = parseFloat(bidAmount) || 0;
  const budget = parseFloat(dailyBudget) || 0;
  const bidNGN = bid * fx;
  const bidOk = bid > 0 && bidNGN >= floorNGN;
  const budgetOk = budget >= bid;
  const days = Math.max(1, Math.min(90, Math.floor(durationDays) || 1));
  const total = Math.round(budget * days * 100) / 100;
  const estImpressions = placement ? Math.round((placement.est_impressions / 30) * days) : 0;

  const toggleChip = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((c) => c !== value) : [...list, value]);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed');
      setImageUrl(data.url);
    } catch (e: any) {
      showNotice('error', e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const generateCreative = async () => {
    if (!brand.trim()) { showNotice('error', 'Enter your brand name first so the AI can write for it'); return }
    setGenerating(true);
    try {
      const res = await fetch('/admin/ads/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-creative',
          placement_id: placement?.id || null,
          brand: brand.trim(),
          goal,
          audience_hint: [countries.join(', '), devices.join(', '), interests.join(', ')].filter(Boolean).join(' · ') || 'tech enthusiasts',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setHeadline(data.creative.headline);
      setDescription(data.creative.description);
      setCtaType(data.creative.cta_type);
      setCtaText(ADS_CTA_LABELS[data.creative.cta_type] || 'Learn More');
      showNotice('success', 'AI creative generated — review and tweak below');
    } catch (e: any) {
      showNotice('error', e.message || 'AI generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const submit = async () => {
    if (!placement) { showNotice('error', 'Select an ad space'); return }
    if (!bidOk) { showNotice('error', `Your ${billingModel.toUpperCase()} bid must be at least ${formatMoney(floorInCurrency, currency)}`); return }
    if (!budgetOk) { showNotice('error', 'Daily budget must be at least your bid amount'); return }
    if (!brand.trim() || !headline.trim() || !destinationUrl.trim()) {
      showNotice('error', 'Brand name, headline and destination URL are required'); return
    }
    if (mediaType === 'video') {
      if (!placement.supports_video) { showNotice('error', 'This ad space does not support video ads'); return }
      if (!videoUrl.trim()) { showNotice('error', 'Video URL is required for video ads'); return }
    } else if (!imageUrl.trim()) {
      showNotice('error', 'Upload or paste a banner image for your ad'); return
    }
    if (placement.ad_type === 'sponsored_article' && !contentUrl.trim()) {
      showNotice('error', 'The URL of your article or landing page is required for a Sponsored Article ad'); return
    }
    setSubmitting(true);
    try {
      const res = await fetch('/admin/ads/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          placement_id: placement.id,
          billing_model: billingModel,
          bid_amount: bid,
          daily_budget: budget,
          duration_days: days,
          currency,
          goal,
          cta_type: ctaType,
          advertiser_name: brand.trim(),
          advertiser_email: user?.email || null,
          headline: headline.trim(),
          description: description.trim(),
          cta_text: ctaText.trim() || 'Learn More',
          destination_url: destinationUrl.trim(),
          ad_image_url: mediaType === 'image' ? imageUrl.trim() || null : null,
          media_type: mediaType,
          video_url: mediaType === 'video' ? videoUrl.trim() || null : null,
          poster_url: mediaType === 'video' ? posterUrl.trim() || null : null,
          content_url: placement.ad_type === 'sponsored_article' ? contentUrl.trim() || null : null,
          target_audience: { countries, devices, interests },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create campaign');
      router.push(`/account/ads/${data.campaign.id}`);
    } catch (e: any) {
      showNotice('error', e.message || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200';
  const labelCls = 'block text-xs font-semibold text-slate-500 mb-1.5';

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}</div>;
  }

  if (notSignedIn) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Sign in to start advertising</h3>
          <p className="text-muted-foreground mb-4">Create an account to set your budget, run campaigns and track performance.</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => router.push('/login')}>Sign In</Button>
            <Button variant="outline" onClick={() => router.push('/signup')}>Create Account</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => router.push('/account/ads')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to My Ads
        </button>
        <h2 className="text-2xl font-bold">Create Campaign</h2>
        <p className="text-muted-foreground mt-1">You set the budget and bid — we only charge for what delivers.</p>
      </div>

      {notice && (
        <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${notice.type === 'success' ? 'text-green-700 bg-green-50 border border-green-200' : 'text-red-600 bg-red-50 border border-red-200'}`}>
          {notice.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />} {notice.text}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          {/* Step 1 — ad space */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                <h3 className="font-semibold">Choose your ad space</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {placements.map((p) => {
                  const selected = p.id === placementId;
                  const f = billingModel === 'cpc' ? p.min_bid_cpc : p.min_bid_cpm;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPlacementId(p.id)}
                      className={`text-left rounded-xl p-3 transition-colors ${selected ? 'bg-blue-50 border-2 border-blue-600' : 'bg-slate-50 border border-slate-200 hover:border-blue-300'}`}
                    >
                      <div className="flex justify-between gap-2 items-center">
                        <span className="text-sm font-semibold text-slate-800">{p.name}</span>
                        <span className="flex items-center gap-1">
                          {p.ad_type === 'popup_toast' && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-purple-600 bg-purple-100 rounded px-1.5 py-0.5 whitespace-nowrap">POPUP</span>
                          )}
                          {p.ad_type === 'sponsored_article' && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-100 rounded px-1.5 py-0.5 whitespace-nowrap">SPONSORED</span>
                          )}
                          {p.supports_video && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-purple-600 bg-purple-100 rounded px-1.5 py-0.5 whitespace-nowrap"><Video className="h-2.5 w-2.5" />VIDEO</span>
                          )}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-blue-600 mt-1">Min {formatMoney(Math.round((f / fx) * 100) / 100, currency)} {billingModel.toUpperCase()}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {(p.sizes || []).slice(0, 2).join(' · ') || p.ad_type} · ~{p.est_impressions.toLocaleString()}/mo
                      </div>
                    </button>
                  );
                })}
                {placements.length === 0 && <p className="text-sm text-muted-foreground col-span-2 text-center py-8">No ad spaces available right now.</p>}
              </div>
            </CardContent>
          </Card>

          {/* Step 2 — budget & bidding */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                <h3 className="font-semibold">Budget &amp; bidding</h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>How do you want to pay?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['cpm', 'cpc'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setBillingModel(m)}
                        className={`rounded-lg border px-3 py-2.5 text-sm font-semibold ${billingModel === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                      >
                        {m.toUpperCase()}
                        <span className={`block text-[11px] font-normal ${billingModel === m ? 'text-blue-100' : 'text-slate-400'}`}>
                          {m === 'cpm' ? 'per 1,000 impressions' : 'per click'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Currency</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
                    {ADS_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Bid amount ({billingModel.toUpperCase()})</label>
                  <input
                    type="number"
                    min={0}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={placement ? `Min ${formatMoney(floorInCurrency, currency)}` : 'Select an ad space first'}
                    disabled={!placement}
                    className={inputCls}
                  />
                  {placement && (
                    <p className={`text-[11px] mt-1.5 ${bidOk ? 'text-green-600' : 'text-amber-600'}`}>
                      Minimum bid for this space: {formatMoney(floorInCurrency, currency)} ({floorNGN.toLocaleString()}₦)
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Daily budget ({currency})</label>
                  <input
                    type="number"
                    min={0}
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(e.target.value)}
                    placeholder="e.g. 5000"
                    className={inputCls}
                  />
                  {bid > 0 && (
                    <p className={`text-[11px] mt-1.5 ${budgetOk ? 'text-green-600' : 'text-amber-600'}`}>
                      {budgetOk ? 'Covers your bid' : `Must be at least your bid (${formatMoney(bid, currency)})`}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Duration (days)</label>
                  <input type="number" min={1} max={90} value={durationDays} onChange={(e) => setDurationDays(parseInt(e.target.value) || 7)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Campaign goal</label>
                  <select value={goal} onChange={(e) => setGoal(e.target.value)} className={inputCls}>
                    {ADS_GOALS.map((g) => <option key={g.value} value={g.value}>{g.icon} {g.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Call to action</label>
                  <select value={ctaType} onChange={(e) => { setCtaType(e.target.value); setCtaText(ADS_CTA_LABELS[e.target.value] || e.target.value) }} className={inputCls}>
                    {ADS_CTA_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Audience */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-700">Target audience</span>
                  <span className="text-[11px] text-slate-400">(optional — we target best-effort)</span>
                </div>
                {[
                  { label: 'Countries', icon: Globe, list: countries, set: setCountries, options: ADS_AUDIENCE_COUNTRIES },
                  { label: 'Devices', icon: Monitor, list: devices, set: setDevices, options: [...ADS_AUDIENCE_DEVICES] as string[] },
                  { label: 'Interests', icon: Tag, list: interests, set: setInterests, options: [...ADS_AUDIENCE_INTERESTS] as string[] },
                ].map((group) => (
                  <div key={group.label} className="mb-3">
                    <div className="text-xs font-semibold text-slate-500 mb-1.5">
                      {group.label} — <span className="text-slate-400 font-normal">{group.list.length ? group.list.join(', ') : 'All'}</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {group.options.map((opt) => {
                        const active = group.list.includes(opt);
                        return (
                          <button
                            key={opt}
                            onClick={() => toggleChip(group.list, group.set, opt)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Step 3 — creative */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                <h3 className="font-semibold">Your ad creative</h3>
                <button
                  onClick={generateCreative}
                  disabled={generating}
                  className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-purple-700 border border-purple-200 bg-purple-50 rounded-lg px-3 py-2 hover:bg-purple-100 disabled:opacity-60"
                >
                  <Sparkles className="h-3.5 w-3.5" /> {generating ? 'Writing...' : 'AI Generate'}
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Brand / Company name *</label>
                  <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Acme Tech Ltd" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Ad headline *</label>
                  <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Fastest hosting in Nigeria" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Button text</label>
                  <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Learn More" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Destination URL *</label>
                  <input value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="https://your-site.com" className={inputCls} />
                </div>
              </div>

              {placement?.ad_type === 'sponsored_article' && (
                <div className="mt-4">
                  <label className={labelCls}>Article / content URL * <span className="text-slate-400 font-normal">(the page readers see when they click your Sponsored Article)</span></label>
                  <input value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} placeholder="https://your-site.com/your-article" className={inputCls} />
                </div>
              )}

              <div className="mt-4">
                <label className={labelCls}>Short description (optional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="One line about what you offer..." className={`${inputCls} resize-y`} />
              </div>

              <div className="mt-4">
                <label className={labelCls}>Creative type</label>
                <div className="grid grid-cols-2 gap-2 max-w-sm">
                  <button onClick={() => setMediaType('image')} className={`rounded-lg border px-3 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 ${mediaType === 'image' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                    Image banner
                  </button>
                  <button
                    onClick={() => setMediaType('video')}
                    disabled={!placement?.supports_video}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 ${mediaType === 'video' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'} ${placement?.supports_video ? '' : 'opacity-50 cursor-not-allowed'}`}
                  >
                    <Video className="h-4 w-4" /> Video ad
                  </button>
                </div>
              </div>

              {mediaType === 'video' ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className={labelCls}>Video URL (MP4 / WebM) *</label>
                    <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://cdn.example.com/ad.mp4" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Poster image URL (thumbnail, optional)</label>
                    <input value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} placeholder="https://cdn.example.com/poster.jpg" className={inputCls} />
                  </div>
                  {videoUrl && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden max-w-md bg-slate-50">
                      <video src={videoUrl} poster={posterUrl || undefined} controls muted playsInline preload="metadata" className="w-full block" />
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400">Recommended max 30s, MP4/WebM, ~5MB.</p>
                </div>
              ) : (
                <div className="mt-4">
                  <label className={labelCls}>Banner image *</label>
                  <div className="flex gap-2 items-center flex-wrap">
                    <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Paste image URL or upload" className={`${inputCls} flex-1 min-w-[180px]`} />
                    <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                      <Upload className="h-3.5 w-3.5 mr-1" /> {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(f);
                      }}
                    />
                  </div>
                  {imageUrl && (
                    <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden max-w-md bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="Ad preview" className="w-full h-auto block" />
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 mt-2">Recommended size{placement?.sizes?.length ? `s: ${placement.sizes.slice(0, 3).join(', ')}` : ': 728x90 (leaderboard), 300x250 (rectangle) or 336x280 (in-content)'}. PNG/JPG, max 2MB.</p>
                </div>
              )}

              {placement?.ad_type === 'popup_toast' && (
                <div className="mt-4">
                  <label className={labelCls}>Popup preview — how readers will see it</label>
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 max-w-sm">
                    <div className="relative bg-white border border-slate-200 rounded-xl shadow-lg w-[300px] mx-auto overflow-hidden">
                      <div className="flex items-center gap-1.5 bg-slate-100 border-b border-slate-200 px-2.5 py-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-[10px] text-slate-400 ml-2">techpivo.com — ad preview</span>
                      </div>
                      {imageUrl && (
                        <div className="bg-slate-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imageUrl} alt="Popup ad preview" className="w-full h-auto max-h-40 object-cover" />
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-purple-600">Sponsored</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5 leading-snug">{headline || 'Your headline appears here'}</p>
                        {description && <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{description}</p>}
                        <span className="mt-2 inline-flex items-center text-xs font-semibold text-white bg-blue-600 rounded-lg px-3 py-1.5">
                          {ctaText || 'Learn More'}
                        </span>
                      </div>
                      <button type="button" tabIndex={-1} className="absolute top-7 right-1.5 w-5 h-5 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold flex items-center justify-center">✕</button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3 text-center">Appears bottom-right on Techpivo pages 6 seconds after load. Readers can dismiss it — you only pay for what shows.</p>
                  </div>
                </div>
              )}

              {placement?.ad_type === 'sponsored_article' && (
                <div className="mt-4">
                  <label className={labelCls}>Sponsored Article preview — how it looks in the sidebar</label>
                  <div className="border border-slate-200 rounded-xl max-w-sm overflow-hidden bg-white shadow-sm">
                    <div className="bg-amber-50 border-b border-amber-100 px-3 py-1.5 flex items-center gap-1.5">
                      <Star className="h-3 w-3 text-amber-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Sponsored</span>
                    </div>
                    {imageUrl && (
                      <div className="bg-slate-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt="Sponsored article preview" className="w-full h-auto max-h-40 object-cover" />
                      </div>
                    )}
                    <div className="p-3.5">
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{headline || 'Your article headline appears here'}</h4>
                      {description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{description}</p>}
                      <div className="mt-2.5 flex items-center gap-2 text-[11px]">
                        {contentUrl ? (
                          <span className="truncate max-w-[65%] text-slate-400">{contentUrl}</span>
                        ) : (
                          <span className="text-slate-400">Article URL</span>
                        )}
                        <span className="text-blue-600 font-semibold whitespace-nowrap">{ctaText || 'Read more'}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">Readers click through to your article page — use the Article URL above.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sticky top-24">
            <h3 className="font-semibold mb-4">Campaign Summary</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-2"><span className="text-slate-500">Ad space</span><span className="font-medium text-right">{placement?.name || '—'}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">Billing</span><span className="font-medium">{billingModel.toUpperCase()} {billingModel === 'cpm' ? '(1,000 imps)' : '(per click)'}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">Bid</span><span className="font-medium">{formatMoney(bid, currency)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">Daily budget</span><span className="font-medium">{formatMoney(budget, currency)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">Duration</span><span className="font-medium">{days} day{days > 1 ? 's' : ''}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">Est. impressions</span><span className="font-medium">{estImpressions.toLocaleString()}</span></div>
            </div>
            <div className="border-t border-slate-100 mt-4 pt-4">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold">Total budget</span>
                <span className="text-2xl font-extrabold text-blue-600">{formatMoney(total, currency)}</span>
              </div>
              {Number(total) > 0 && <FxApprox amount={Number(total)} from={currency} className="block text-right text-[11px] text-slate-400" />}
              <p className="text-[11px] text-slate-400 mt-1.5">We only charge for what actually delivers (up to your daily cap).</p>
            </div>
            <button
              onClick={submit}
              disabled={submitting}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl px-4 py-3 text-sm flex items-center justify-center gap-2"
            >
              {submitting ? 'Submitting...' : 'Submit for Approval'} <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-[11px] text-slate-400 mt-3 text-center leading-relaxed">
              Our team reviews every campaign within 24 hours before it goes live.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
