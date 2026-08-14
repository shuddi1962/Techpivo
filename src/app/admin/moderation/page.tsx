'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/community-utils';
import {
  ShieldAlert, CheckCheck, Trash2, BellRing, Loader2, Flag, FileText,
  MessageSquare, User as UserIcon, RefreshCw, Eye,
} from 'lucide-react';

interface TargetPreview {
  id: string;
  title?: string;
  content?: string;
  username?: string;
  full_name?: string;
  is_locked?: boolean;
  is_approved?: boolean;
  author_id?: string;
  author?: { username: string | null; full_name: string | null };
  post?: { id: string; title: string } | null;
}

interface Report {
  id: string;
  reporter_id: string;
  reporter: { username: string | null; full_name: string | null } | null;
  target_type: string;
  target_id: string;
  target_label: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  target: TargetPreview | null;
}

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam', harassment: 'Harassment', hate_speech: 'Hate speech',
  misinformation: 'Misinformation', plagiarism: 'Plagiarism', nsfw: 'NSFW',
  doxxing: 'Doxxing', scam: 'Scam', other: 'Other',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  under_review: 'bg-blue-100 text-blue-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  dismissed: 'bg-gray-100 text-gray-500',
};

export default function ModerationPage() {
  const supabase = createClient();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({ open: 0, total: 0, pending_today: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/moderation', {
        headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}` },
      });
      if (res.status === 401 || res.status === 403) return;
      const d = await res.json();
      setReports(d.reports || []);
      setStats(d.stats || { open: 0, total: 0, pending_today: 0 });
      setLastSync(new Date());
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`moderation_live_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_reports' }, () => load())
      .subscribe();
    channelRef.current = channel;
    const poll = setInterval(() => void load(), 30000);
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(poll);
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(channelRef.current!);
    };
  }, [supabase, load]);

  const act = async (action: string, report: Report, extra?: Record<string, unknown>) => {
    if (action === 'remove' && !confirm(`Remove this ${report.target_label.toLowerCase()}? This hides/deletes it from the community.`)) return;
    if (action === 'warn' && !confirm('Send a warning notification to this member?')) return;
    setBusy(report.id);
    setNotice('');
    try {
      const res = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
        },
        body: JSON.stringify({
          action,
          id: report.id,
          target_type: report.target_type,
          target_id: report.target_id,
          user_id: report.target_type === 'user' ? report.target_id : report.target?.author_id || undefined,
          ...extra,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Action failed');
      setNotice(`${action === 'dismiss' ? 'Dismissed' : action === 'remove' ? 'Content removed' : 'Warning sent'} — report closed.`);
      await load();
    } catch (e) {
      setNotice((e as Error).message);
    }
    setBusy(null);
  };

  const visible = reports.filter(r =>
    filter === 'open' ? ['pending', 'under_review'].includes(r.status) : filter === 'resolved' ? ['resolved', 'dismissed'].includes(r.status) : true
  );

  const TargetIcon = (t: string) => t === 'forum_post' ? FileText : t === 'forum_reply' ? MessageSquare : t === 'comment' ? MessageSquare : UserIcon;

  return (
    <div className="p-6 bg-white min-h-screen text-slate-900">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-amber-500" /> Moderation Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">Community reports — review, remove, warn, or dismiss.</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
          </span>
          {lastSync && <span className="inline-flex items-center gap-1"><RefreshCw className="h-3 w-3" /> {lastSync.toLocaleTimeString()}</span>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Open reports', value: stats.open, tone: 'text-amber-600' },
          { label: 'Reported today', value: stats.pending_today, tone: 'text-blue-600' },
          { label: 'Total (last 200)', value: stats.total, tone: 'text-slate-700' },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className={`text-3xl font-bold ${k.tone}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {notice && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 mb-4 w-fit">
        {([['open', `Open (${stats.open})`], ['all', `All (${stats.total})`], ['resolved', 'Resolved']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn('px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors', filter === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900')}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
          <Flag className="mx-auto h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">No reports in this view. Community members can flag content from any post.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(r => {
            const TIcon = TargetIcon(r.target_type);
            return (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <TIcon className="h-4 w-4 text-slate-400" aria-hidden />
                      <span className="text-xs font-semibold text-slate-700">{r.target_label}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium capitalize', STATUS_STYLES[r.status] || STATUS_STYLES.pending)}>{r.status.replace('_', ' ')}</span>
                      <span className="rounded-full bg-red-50 text-red-600 px-2 py-0.5 text-[11px] font-medium">{REASON_LABELS[r.reason] || r.reason}</span>
                      <span className="ml-auto text-xs text-slate-400">{timeAgo(r.created_at)}</span>
                    </div>

                    {r.target ? (
                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 mb-2">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {r.target.title || r.target.full_name || r.target.username || (r.target.post?.title || 'Target content')}
                        </p>
                        {r.target.content && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 whitespace-pre-line">{r.target.content}</p>
                        )}
                        {r.target.author && (
                          <p className="text-[11px] text-slate-400 mt-1">by {r.target.author.full_name || r.target.author.username || 'member'}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mb-2">Target content not found (may already be removed).</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><Flag className="h-3 w-3" /> Reported by {r.reporter?.full_name || r.reporter?.username || 'member'}</span>
                      {r.target_type === 'forum_post' && r.target && (
                        <Link href={`/community/forum/general/${r.target_id}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                          <Eye className="h-3 w-3" /> View
                        </Link>
                      )}
                      {r.target_type === 'forum_reply' && r.target?.post && (
                        <Link href={`/community/forum/general/${r.target.post.id}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                          <Eye className="h-3 w-3" /> View parent post
                        </Link>
                      )}
                    </div>
                    {r.details && (
                      <p className="text-xs text-slate-600 mt-1.5 italic">&ldquo;{r.details}&rdquo;</p>
                    )}
                  </div>

                  {!['resolved', 'dismissed'].includes(r.status) && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => act('remove', r)}
                        disabled={busy === r.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => act('warn', r)}
                        disabled={busy === r.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                      >
                        {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <BellRing className="h-3 w-3" />} Warn user
                      </button>
                      <button
                        type="button"
                        onClick={() => act('dismiss', r)}
                        disabled={busy === r.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />} Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}