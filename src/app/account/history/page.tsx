'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, BookOpen, Clock, ArrowRight } from 'lucide-react';

interface HistoryEntry {
  id: string;
  post_id: string;
  title: string;
  progress: number;
  completed: boolean;
  last_read: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/community/history')
      .then(r => r.json())
      .then(d => {
        setHistory(d.history || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reading History</h2>
          <p className="text-muted-foreground mt-1">Articles you&apos;ve read recently</p>
        </div>
        <Badge variant="secondary">{history.length} articles</Badge>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Reading History</h3>
            <p className="text-muted-foreground mb-4">Start reading articles to track your progress here.</p>
            <Link href="/">
              <Button>Start Reading</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {history.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/${entry.post_id}`} className="font-medium hover:text-primary transition-colors truncate block">
                      {entry.title || 'Untitled Article'}
                    </Link>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.last_read).toLocaleDateString()}
                      </div>
                      <Badge variant={entry.completed ? 'default' : 'secondary'} className="text-xs">
                        {entry.completed ? 'Completed' : `${entry.progress}% read`}
                      </Badge>
                    </div>
                  </div>
                  <Link href={`/${entry.post_id}`}>
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
