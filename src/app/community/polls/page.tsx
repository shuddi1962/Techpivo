'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, CheckCircle2, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { JsonLd } from '@/components/ui/jsonld';
import { breadcrumbSchema } from '@/lib/jsonld';
import { CommunityHero } from '@/components/community/community-hero';
import { getStoredVotes, storeVotes } from '@/lib/poll-votes';

interface PollOption {
  id: string;
  text: string;
  vote_count: number;
}

interface Poll {
  id: string;
  title: string;
  description: string | null;
  total_votes: number;
  is_active: boolean;
  image_url: string | null;
  options: PollOption[];
}

export default function PollsPage() {
  const supabase = createClient();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votedPolls, setVotedPolls] = useState<Record<string, string>>(() => getStoredVotes());
  const [loading, setLoading] = useState(true);
  const [voteError, setVoteError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [liveAt, setLiveAt] = useState<Date | null>(null);

  const loadPolls = useCallback(async () => {
    try {
      const res = await fetch('/api/community/polls');
      const data = await res.json();
      setPolls(data.polls || []);
      setLiveAt(new Date());
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolls();
    const channel = supabase
      .channel(`polls_live_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "polls" }, () => loadPolls())
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, () => loadPolls())
      .subscribe();
    channelRef.current = channel;
    const poll = setInterval(loadPolls, 15000);
    const onFocus = () => loadPolls();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channelRef.current!);
    };
  }, [supabase, loadPolls]);

  const vote = async (pollId: string, optionId: string) => {
    if (votedPolls[pollId]) return;
    setVoteError(null);
    setVotedPolls(prev => {
      const next = { ...prev, [pollId]: optionId };
      storeVotes(next);
      return next;
    });
    setPolls(prev => prev.map(p => {
      if (p.id !== pollId) return p;
      return {
        ...p,
        total_votes: p.total_votes + 1,
        options: p.options.map(o =>
          o.id === optionId ? { ...o, vote_count: o.vote_count + 1 } : o
        ),
      };
    }));
    try {
      const res = await fetch('/api/community/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poll_id: pollId, option_id: optionId }),
      });
      if (!res.ok) {
        setVotedPolls(prev => {
          const n = { ...prev };
          delete n[pollId];
          storeVotes(n);
          return n;
        });
        setPolls(prev => prev.map(p => {
          if (p.id !== pollId) return p;
          return {
            ...p,
            total_votes: p.total_votes - 1,
            options: p.options.map(o =>
              o.id === optionId ? { ...o, vote_count: o.vote_count - 1 } : o
            ),
          };
        }));
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setVoteError('Sign in to vote in polls. <a class="underline" href="/auth/login">Sign in</a>');
        } else if (res.status === 429) {
          setVoteError('Too many votes. Please wait a moment and try again.');
        } else {
          setVoteError(data.error ? `Vote failed: ${data.error}` : 'Vote failed. Please try again.');
        }
      }
    } catch {
      setVotedPolls(prev => {
        const n = { ...prev };
        delete n[pollId];
        storeVotes(n);
        return n;
      });
      setPolls(prev => prev.map(p => {
        if (p.id !== pollId) return p;
        return {
          ...p,
          total_votes: p.total_votes - 1,
          options: p.options.map(o =>
            o.id === optionId ? { ...o, vote_count: o.vote_count - 1 } : o
          ),
        };
      }));
      setVoteError('Network error. Please try again.');
    }
  };

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: "https://techpivo.com" },
        { name: "Community", url: "https://techpivo.com/community" },
        { name: "Polls" },
      ])} />
      <div className="min-h-screen bg-background">
      {/* Hero */}
      <CommunityHero
        badge="Community Polls"
        title="Share Your Opinion"
        subtitle="Vote on technology topics and see what the community thinks."
        icon={<Sparkles className="h-3.5 w-3.5" />}
        backHref="/community"
        backLabel="Back to Community"
        imageUrl={null}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
          </span>
          {liveAt && <span className="text-xs text-muted-foreground">Votes update in real time · last refresh {liveAt.toLocaleTimeString()}</span>}
        </div>
        {voteError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            <span dangerouslySetInnerHTML={{ __html: voteError }} />
          </div>
        )}

        {loading ? (
          <div className="space-y-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl bg-muted/40 animate-pulse p-6 space-y-4">
                <div className="h-5 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="space-y-2">
                  <div className="h-10 bg-muted rounded" />
                  <div className="h-10 bg-muted rounded" />
                  <div className="h-10 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : polls.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted/50 mb-6">
              <BarChart3 className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Active Polls</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">No polls are active right now. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {polls.map((poll) => {
              const hasVoted = !!votedPolls[poll.id];
              return (
                <div key={poll.id} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                  {poll.image_url && (
                    <div className="relative h-44 overflow-hidden">
                      <img src={poll.image_url} alt={poll.title} loading="lazy" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                    </div>
                  )}
                  <div className="p-6 md:p-7">
                  <h2 className="text-xl font-semibold font-[family-name:var(--font-syne)] mb-1">{poll.title}</h2>
                  {poll.description && (
                    <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{poll.description}</p>
                  )}
                  <div className="space-y-2.5">
                    {poll.options.map((opt) => {
                      const pct = poll.total_votes > 0 ? (opt.vote_count / poll.total_votes) * 100 : 0;
                      const isSelected = votedPolls[poll.id] === opt.id;
                      if (hasVoted) {
                        return (
                          <div key={opt.id} className="relative">
                            <div className="h-12 rounded-xl bg-muted/50 overflow-hidden">
                              <div
                                className={`h-full rounded-xl transition-all duration-700 ease-out ${
                                  isSelected ? 'bg-gradient-to-r from-emerald-500/30 to-emerald-500/20' : 'bg-muted-foreground/8'
                                }`}
                                style={{ width: `${Math.max(pct, 2)}%` }}
                              />
                            </div>
                            <div className="absolute inset-0 flex items-center px-4 text-sm">
                              {isSelected && <CheckCircle2 className="h-4 w-4 mr-2.5 text-emerald-500 shrink-0" />}
                              <span className="flex-1 font-medium">{opt.text}</span>
                              <span className="font-bold text-sm">{pct.toFixed(1)}%</span>
                              <span className="text-xs text-muted-foreground ml-2">({opt.vote_count})</span>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <button
                          key={opt.id}
                          onClick={() => vote(poll.id, opt.id)}
                          className="w-full text-left p-3.5 rounded-xl border-2 border-border/60 hover:border-emerald-400/50 hover:bg-emerald-500/5 transition-all duration-200 text-sm font-medium group"
                        >
                          <span className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
                    <span className="text-xs text-muted-foreground">{poll.total_votes} total votes</span>
                    {!hasVoted && (
                      <span className="text-xs text-muted-foreground/60">Tap an option to vote</span>
                    )}
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
