'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FxApprox } from '@/components/fx-approx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Megaphone, Plus, Eye, MousePointerClick, Wallet, Pause, Play, AlertCircle, TrendingUp
} from 'lucide-react';
import { useFx } from '@/lib/use-fx';
import { formatMoney, ADS_BILLING_LABELS, ADS_GOAL_LABELS, computeCampaignSpend } from '@/lib/ads';

interface Campaign {
  id: string;
  advertiser_name: string;
  headline: string | null;
  description: string | null;
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
  media_type: string | null;
  review_note: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  placements?: { name?: string } | null;
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

export default function MyAdsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('signin');
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase
      .from('ad_campaigns')
      .select('*, placements:ad_placements(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (err) {
      setError(err.message);
    } else {
      setCampaigns(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const supabase = createClient();
    let counter = 0;
    const channel = supabase.channel(`my_ads_${++counter}`);
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_campaigns' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_campaign_daily_stats' }, () => load())
      .subscribe();
    const poll = setInterval(load, 30000);
    return () => {
      channel.unsubscribe().then(() => supabase.removeChannel(channel));
      clearInterval(poll);
    };
  }, [load]);

  const togglePause = async (c: Campaign) => {
    setBusyId(c.id);
    try {
      const res = await fetch('/admin/ads/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: c.status === 'paused' ? 'resume' : 'pause',
          campaign_id: c.id,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Action failed');
      } else {
        load();
      }
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c: Campaign) => {
    if (!window.confirm(`Delete campaign "${c.headline || c.advertiser_name}"? This cannot be undone.`)) return;
    setBusyId(c.id);
    try {
      await fetch('/admin/ads/api', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'campaign', id: c.id }),
      });
      load();
    } finally {
      setBusyId(null);
    }
  };

  const live = campaigns.filter((c) => c.status === 'live' || c.status === 'approved');
  const pending = campaigns.filter((c) => c.status === 'pending');
  const fx = useFx();
  const totalSpend = campaigns.reduce((s, c) => s + fx.convert(computeCampaignSpend(c), c.currency || 'NGN'), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error === 'signin') {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Sign in to run ads</h3>
          <p className="text-muted-foreground mb-4">Your ad campaigns, performance and billing live here.</p>
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">My Ads</h2>
          <p className="text-muted-foreground mt-1">Create, manage and analyze your campaigns</p>
        </div>
        <Button onClick={() => router.push('/account/ads/new')}>
          <Plus className="h-4 w-4 mr-1.5" /> New Campaign
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Active Campaigns', value: String(live.length), icon: TrendingUp, cls: 'text-blue-600 bg-blue-50' },
          { label: 'Pending Review', value: String(pending.length), icon: Megaphone, cls: 'text-amber-600 bg-amber-50' },
          { label: 'Total Spend', value: fx.format(totalSpend, fx.displayCurrency), icon: Wallet, cls: 'text-green-600 bg-green-50' },
          { label: 'Clicks', value: totalClicks.toLocaleString(), icon: MousePointerClick, cls: 'text-purple-600 bg-purple-50' },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${k.cls}`}>
                <k.icon className="h-4.5 w-4.5" />
              </div>
              <div className="text-xl font-bold">{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Campaigns Yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Set your own budget and bid — we charge only for what your ad delivers.
            </p>
            <Button onClick={() => router.push('/account/ads/new')}>
              <Plus className="h-4 w-4 mr-1.5" /> Start a Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const st = STATUS_STYLES[c.status] || STATUS_STYLES.draft;
            const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0.00';
            const spend = computeCampaignSpend(c);
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{c.headline || c.advertiser_name}</h3>
                        <Badge className={st.cls}>{st.label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {c.advertiser_name}
                        {c.placements?.name ? ` · ${c.placements.name}` : ''}
                        {' · '}{ADS_BILLING_LABELS[c.billing_model] || c.billing_model}
                        {c.goal ? ` · ${ADS_GOAL_LABELS[c.goal] || c.goal}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(c.status === 'live' || c.status === 'approved') && (
                        <Button variant="outline" size="sm" disabled={busyId === c.id} onClick={() => togglePause(c)}>
                          <Pause className="h-3.5 w-3.5 mr-1" /> Pause
                        </Button>
                      )}
                      {c.status === 'paused' && (
                        <Button variant="outline" size="sm" disabled={busyId === c.id} onClick={() => togglePause(c)}>
                          <Play className="h-3.5 w-3.5 mr-1" /> Resume
                        </Button>
                      )}
                      {(c.status === 'draft' || c.status === 'rejected' || c.status === 'cancelled') && (
                        <Button variant="ghost" size="sm" className="text-destructive" disabled={busyId === c.id} onClick={() => remove(c)}>
                          Delete
                        </Button>
                      )}
                      <Button size="sm" asChild>
                        <Link href={`/account/ads/${c.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>

                  {c.review_note && (
                    <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {c.review_note}
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <div className="text-base font-bold flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-muted-foreground" />{c.impressions.toLocaleString()}</div>
                      <div className="text-[11px] text-muted-foreground">Impressions</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <div className="text-base font-bold flex items-center gap-1.5"><MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />{c.clicks.toLocaleString()}</div>
                      <div className="text-[11px] text-muted-foreground">Clicks</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <div className="text-base font-bold">{ctr}%</div>
                      <div className="text-[11px] text-muted-foreground">CTR</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <div className="text-base font-bold text-green-600">{formatMoney(spend, c.currency || 'NGN')}</div>
                      <div className="text-[11px] text-muted-foreground">Spend</div>
                      {Number(spend) > 0 && <FxApprox amount={Number(spend)} from={c.currency || 'NGN'} className="block text-[10px] text-muted-foreground" />}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground flex-wrap gap-2">
                    <span>
                      Bid {formatMoney(c.bid_amount || 0, c.currency || 'NGN')} · Daily {formatMoney(c.daily_budget || 0, c.currency || 'NGN')} · Total {formatMoney(c.total_price, c.currency || 'NGN')}
                      <FxApprox amount={Number(c.total_price || 0)} from={c.currency || 'NGN'} className="block text-[10px]" />
                    </span>
                    <span>
                      {c.start_date ? String(c.start_date).slice(0, 10) : ''}{c.end_date ? ` → ${String(c.end_date).slice(0, 10)}` : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
