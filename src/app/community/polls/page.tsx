'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, CheckCircle2, Sparkles } from 'lucide-react';

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
  options: PollOption[];
}

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votedPolls, setVotedPolls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/community/polls')
      .then(r => r.json())
      .then(data => {
        setPolls(data.polls || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const vote = async (pollId: string, optionId: string) => {
    if (votedPolls[pollId]) return;
    setVoteError(null);
    setVotedPolls(prev => ({ ...prev, [pollId]: optionId }));
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
        body: JSON.stringify({ pollId, optionId }),
      });
      if (!res.ok) {
        setVotedPolls(prev => { const n = { ...prev }; delete n[pollId]; return n; });
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
        setVoteError('Vote failed. Please try again.');
      }
    } catch {
      setVotedPolls(prev => { const n = { ...prev }; delete n[pollId]; return n; });
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-green-600/10 via-emerald-500/5 to-teal-600/10 dark:from-green-500/5 dark:via-emerald-500/5 dark:to-teal-500/5 border-b border-border/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-400/10 via-transparent to-transparent" />
        <div className="max-w-3xl mx-auto px-4 py-16 md:py-20 relative">
          <Link href="/community" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Community
          </Link>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-medium mb-4">
              <Sparkles className="h-3.5 w-3.5" /> Community Polls
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-syne)] tracking-tight">
              Share Your Opinion
            </h1>
            <p className="text-lg text-muted-foreground mt-3 max-w-xl">
              Vote on technology topics and see what the community thinks.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {voteError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            {voteError}
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
                <div key={poll.id} className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 md:p-7">
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
