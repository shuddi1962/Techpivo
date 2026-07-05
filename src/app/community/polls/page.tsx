'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, CheckCircle2 } from 'lucide-react';

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
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/community" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Community
        </Link>

        <div className="text-center mb-8">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <h1 className="text-3xl font-bold">Community Polls</h1>
          <p className="text-muted-foreground mt-1">Vote and share your opinion</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          </div>
        ) : polls.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Active Polls</h3>
              <p className="text-muted-foreground">No polls are active right now. Sign in to create one.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {polls.map((poll) => {
              const hasVoted = !!votedPolls[poll.id];
              return (
                <Card key={poll.id}>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-2">{poll.title}</h2>
                    {poll.description && <p className="text-muted-foreground mb-4">{poll.description}</p>}
                    <div className="space-y-3">
                      {poll.options.map((opt) => {
                        const pct = poll.total_votes > 0 ? (opt.vote_count / poll.total_votes) * 100 : 0;
                        const isSelected = votedPolls[poll.id] === opt.id;
                        if (hasVoted) {
                          return (
                            <div key={opt.id} className="relative">
                              <div className="h-10 rounded-lg bg-muted overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-500 ${isSelected ? 'bg-primary/30' : 'bg-muted-foreground/10'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="absolute inset-0 flex items-center px-3 text-sm">
                                {isSelected && <CheckCircle2 className="h-4 w-4 mr-2 text-primary shrink-0" />}
                                <span className="flex-1 font-medium">{opt.text}</span>
                                <span className="font-bold">{pct.toFixed(1)}%</span>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <button
                            key={opt.id}
                            onClick={() => vote(poll.id, opt.id)}
                            className="w-full text-left p-3 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-sm font-medium"
                          >
                            {opt.text}
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-sm text-muted-foreground mt-3">
                      {poll.total_votes} total votes
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
