'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FxApprox } from '@/components/fx-approx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, AlertCircle, Eye, MousePointerClick, Pause, Play, Trash2, Wallet, BarChart3, Target, Globe, Monitor, Tag
} from 'lucide-react';
import { formatMoney, ADS_BILLING_LABELS, ADS_GOAL_LABELS, ADS_CTA_LABELS, computeCampaignSpend } from '@/lib/ads';

interface Campaign {
  id: string;
  advertiser_name: string;
  advertiser_email: string | null;
  headline: string | null;
  description: string | null;
  cta_text: string | null;
  destination_url: string | null;
  ad_image_url: string | null;
  status: string;
  billing_model: string;
  currency: string;
  daily_budget: number | null;
  bid_amount: number | null;
  total_price: number;
  impressions: number;
  clicks: number;
  goal: string | null;
  cta_type: string | null;
  target_audience: { countries?: string[]; devices?: string[]; interests?: string[] } | null;
  media_type: string | null;
  video_url: string | null;
  poster_url: string | null;
  review_note: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  placements?: { name?: string } | null;
}

interface DailyStat {
  id: string;
  stat_date: string;
  impressions: number;
  clicks: number;
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
  pending: { label: 'Pending Review', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', cls: 'bg-blue-100 text-blue-700' },
  live: { label: 'Live', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-600' },
  paused: { label: 'Paused', cls: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completed', cls: 'bg-slate-100 text-slate-600' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-600' },
};

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('signin'); setLoading(false); return }
    const { data, error: err } = await supabase
      .from('ad_campaigns')
      .select('*, placements:ad_placements(name)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setCampaign(data);
    if (data) {
      const { data: stats } = await supabase
        .from('ad_campaign_daily_stats')
        .select('*')
        .eq('campaign_id', params.id)
        .order('stat_date', { ascending: true });
      setDaily(stats || []);
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
    const supabase = createClient();
    let counter = 0;
    const channel = supabase.channel(`campaign_detail_${++counter}`);
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_campaigns', filter: `id=eq.${params.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_campaign_daily_stats', filter: `campaign_id=eq.${params.id}` }, () => load())
      .subscribe();
    const poll = setInterval(load, 30000);
    return () => {
      channel.unsubscribe().then(() => supabase.removeChannel(channel));
      clearInterval(poll);
    };
  }, [load, params.id]);

  const act = async (action: string) => {
    setBusy(true);
    try {
      const res = await fetch('/admin/ads/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, campaign_id: params.id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Action failed');
      } else {
        load();
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this campaign? This cannot be undone.')) return;
    setBusy(true);
    try {
      await fetch('/admin/ads/api', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'campaign', id: params.id }),
      });
      router.push('/account/ads');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}</div>;
  }

  if (error === 'signin' || (!campaign && error)) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">{error === 'signin' ? 'Sign in to view campaigns' : 'Campaign not found'}</h3>
          <p className="text-muted-foreground mb-4">{error === 'signin' ? 'Sign in to see your campaign performance.' : 'This campaign does not exist or is not yours.'}</p>
          <Button onClick={() => router.push(error === 'signin' ? '/login' : '/account/ads')}>Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  if (!campaign) return null;

  const st = STATUS_STYLES[campaign.status] || STATUS_STYLES.draft;
  const ctr = campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : '0.00';
  const spend = computeCampaignSpend(campaign);

  // last 14 days chart data
  const days = 14;
  const buckets: { date: string; label: string; impressions: number; clicks: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const row = daily.find((s) => String(s.stat_date).slice(0, 10) === key);
    buckets.push({
      date: key,
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      impressions: row?.impressions || 0,
      clicks: row?.clicks || 0,
    });
  }
  const maxImps = Math.max(1, ...buckets.map((b) => b.impressions));
  const audience = campaign.target_audience || {};
  const audienceParts = [
    (audience.countries || []).join(', '),
    (audience.devices || []).join(', '),
    (audience.interests || []).join(', '),
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => router.push('/account/ads')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to My Ads
        </button>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold">{campaign.headline || campaign.advertiser_name}</h2>
              <Badge className={st.cls}>{st.label}</Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">{campaign.advertiser_name}{campaign.placements?.name ? ` · ${campaign.placements.name}` : ''}</p>
          </div>
          <div className="flex gap-2">
            {(campaign.status === 'live' || campaign.status === 'approved') && (
              <Button variant="outline" disabled={busy} onClick={() => act('pause')}><Pause className="h-4 w-4 mr-1.5" /> Pause</Button>
            )}
            {campaign.status === 'paused' && (
              <Button variant="outline" disabled={busy} onClick={() => act('resume')}><Play className="h-4 w-4 mr-1.5" /> Resume</Button>
            )}
            {(campaign.status === 'draft' || campaign.status === 'rejected' || campaign.status === 'cancelled') && (
              <Button variant="ghost" className="text-destructive" disabled={busy} onClick={remove}><Trash2 className="h-4 w-4 mr-1.5" /> Delete</Button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {campaign.review_note && (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {campaign.review_note}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Impressions', value: campaign.impressions.toLocaleString(), icon: Eye, cls: 'text-blue-600 bg-blue-50' },
          { label: 'Clicks', value: campaign.clicks.toLocaleString(), icon: MousePointerClick, cls: 'text-purple-600 bg-purple-50' },
          { label: 'CTR', value: `${ctr}%`, icon: BarChart3, cls: 'text-amber-600 bg-amber-50' },
          { label: 'Spend', value: formatMoney(spend, campaign.currency || 'NGN'), icon: Wallet, cls: 'text-green-600 bg-green-50' },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${k.cls}`}>
                <k.icon className="h-4.5 w-4.5" />
              </div>
              <div className="text-xl font-bold">{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
              {k.label === 'Spend' && Number(spend) > 0 && <FxApprox amount={Number(spend)} from={campaign.currency || 'NGN'} className="block text-[10px] text-muted-foreground" />}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance chart */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold mb-1 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-600" /> Performance — last 14 days</h3>
          <p className="text-xs text-muted-foreground mb-4">Delivered impressions per day (clicks shown on hover).</p>
          <div className="flex items-end gap-1 h-36">
            {buckets.map((b) => (
              <div key={b.date} className="flex-1 flex flex-col items-center gap-1 group relative min-w-0">
                <div className="relative w-full flex flex-col items-center">
                  <div
                    className="w-full max-w-[26px] rounded-t bg-blue-500 group-hover:bg-blue-600 transition-colors"
                    style={{ height: `${Math.max(2, (b.impressions / maxImps) * 100)}%`, minHeight: 2 }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap z-10">
                    {b.impressions.toLocaleString()} imps · {b.clicks} clicks
                  </div>
                </div>
                <span className="text-[9px] text-muted-foreground whitespace-nowrap">{b.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Campaign settings */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Target className="h-4 w-4 text-blue-600" /> Campaign settings</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-2"><span className="text-slate-500">Billing</span><span className="font-medium">{ADS_BILLING_LABELS[campaign.billing_model] || campaign.billing_model}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">Bid</span><span className="font-medium">{formatMoney(campaign.bid_amount || 0, campaign.currency || 'NGN')}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">Daily budget</span><span className="font-medium">{formatMoney(campaign.daily_budget || 0, campaign.currency || 'NGN')}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">Total budget</span><span className="font-medium">{formatMoney(campaign.total_price, campaign.currency || 'NGN')}</span></div>
              <FxApprox amount={Number(campaign.total_price || 0)} from={campaign.currency || 'NGN'} className="block text-right text-[10px] text-muted-foreground -mt-1.5" />
              <div className="flex justify-between gap-2"><span className="text-slate-500">Goal</span><span className="font-medium">{ADS_GOAL_LABELS[campaign.goal || 'clicks'] || campaign.goal}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">CTA</span><span className="font-medium">{ADS_CTA_LABELS[campaign.cta_type || 'learn_more'] || campaign.cta_text}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">Dates</span><span className="font-medium">{campaign.start_date ? String(campaign.start_date).slice(0, 10) : '—'}{campaign.end_date ? ` → ${String(campaign.end_date).slice(0, 10)}` : ''}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">Media</span><span className="font-medium capitalize">{campaign.media_type || 'image'}</span></div>
              {campaign.destination_url && (
                <div className="flex justify-between gap-2"><span className="text-slate-500">Destination</span><a href={campaign.destination_url} target="_blank" rel="noopener" className="font-medium text-blue-600 hover:underline truncate max-w-[60%]">{campaign.destination_url}</a></div>
              )}
              {audienceParts.length > 0 && (
                <div className="flex justify-between gap-2 items-start">
                  <span className="text-slate-500 shrink-0">Audience</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {audienceParts.map((part) => (
                      <span key={part} className="text-[11px] font-medium bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{part}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {campaign.description && (
              <p className="text-sm text-slate-600 mt-4 bg-slate-50 rounded-lg p-3">{campaign.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Creative preview */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4">Creative preview</h3>
            {campaign.media_type === 'video' && campaign.video_url ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <video src={campaign.video_url} poster={campaign.poster_url || undefined} controls muted loop playsInline preload="metadata" className="w-full block" />
              </div>
            ) : campaign.ad_image_url ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={campaign.ad_image_url} alt={campaign.advertiser_name} className="w-full h-auto block" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No creative uploaded.</p>
            )}
            <div className="mt-3 space-y-1.5">
              <p className="font-semibold">{campaign.headline}</p>
              {campaign.cta_text && (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg px-3 py-1.5">
                  {campaign.cta_text}
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{(audience.countries || []).length || 'All countries'}</span>
              <span className="flex items-center gap-1"><Monitor className="h-3 w-3" />{(audience.devices || []).length || 'All devices'}</span>
              <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{(audience.interests || []).length || 'All interests'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Created {new Date(campaign.created_at).toLocaleDateString()} ·{' '}
        <Link href="/account/ads/new" className="text-blue-600 hover:underline">Create another campaign</Link>
      </p>
    </div>
  );
}
