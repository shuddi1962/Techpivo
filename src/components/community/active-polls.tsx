'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

export function ActivePolls() {
  const supabase = createClient();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votedPolls, setVotedPolls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadPolls = useCallback(async (quiet = false) => {
    try {
      const res = await fetch('/api/community/polls');
      if (!res.ok) return;
      const data = await res.json();
      setPolls(data.polls || []);
    } catch {
      if (!quiet) setError('Could not load polls. Please try again.');
    }
  }, []);

  useEffect(() => {
    loadPolls();
    const channel = supabase
      .channel(`active_polls_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, () => loadPolls(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => loadPolls(true))
      .subscribe();
    channelRef.current = channel;
    const poll = setInterval(() => loadPolls(true), 30000);
    const onFocus = () => loadPolls(true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(poll);
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(channelRef.current!);
    };
  }, [supabase, loadPolls]);

  const vote = async (pollId: string, optionId: string) => {
    if (votedPolls[pollId]) return;
    setError(null);
    setVotedPolls(prev => ({ ...prev, [pollId]: optionId }));
    setPolls(prev => prev.map(p =>
      p.id !== pollId ? p : {
        ...p,
        total_votes: p.total_votes + 1,
        options: p.options.map(o =>
          o.id === optionId ? { ...o, vote_count: o.vote_count + 1 } : o
        ),
      }
    ));
    try {
      const res = await fetch('/api/community/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poll_id: pollId, option_id: optionId }),
      });
      if (!res.ok) {
        setVotedPolls(prev => { const n = { ...prev }; delete n[pollId]; return n; });
        setError('Vote failed. Please try again.');
      }
    } catch {
      setVotedPolls(prev => { const n = { ...prev }; delete n[pollId]; return n; });
      setError('Network error. Please try again.');
    }
  };

  if (polls.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-green-500" />
          Active Polls
        </h2>
        <Link href="/community/polls">
          <Button variant="outline" size="sm">All Polls <ArrowRight className="ml-1 h-4 w-4" /></Button>
        </Link>
      </div>
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {polls.slice(0, 4).map((poll) => {
          const hasVoted = !!votedPolls[poll.id];
          return (
            <Card key={poll.id}>
              <CardContent className="p-5">
                <h3 className="font-semibold mb-3">{poll.title}</h3>
                <div className="space-y-2">
                  {poll.options.map((opt) => {
                    const pct = poll.total_votes > 0 ? (opt.vote_count / poll.total_votes) * 100 : 0;
                    const isSelected = votedPolls[poll.id] === opt.id;
                    if (hasVoted) {
                      return (
                        <div key={opt.id} className="relative">
                          <div className="h-8 rounded-md bg-muted overflow-hidden">
                            <div
                              className={`h-full transition-all ${isSelected ? 'bg-emerald-500/40' : 'bg-primary/20'}`}
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                          </div>
                          <div className="absolute inset-0 flex items-center px-3 text-sm">
                            {isSelected && <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500 shrink-0" />}
                            <span className="flex-1">{opt.text}</span>
                            <span className="font-medium">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={opt.id}
                        onClick={() => vote(poll.id, opt.id)}
                        className="w-full text-left p-2.5 rounded-md border border-border/60 hover:border-emerald-400/50 hover:bg-emerald-500/5 transition-all duration-200 text-sm font-medium"
                      >
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs text-muted-foreground mt-2">{poll.total_votes} votes</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
