'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import {
  BookMarked, ExternalLink, Trash2, ArrowRight,
  FileText, BookOpen, Wrench, HelpCircle, Star, MessageSquare
} from 'lucide-react';

interface Bookmark {
  id: string;
  item_type: string;
  item_id: string;
  title: string;
  url: string;
  created_at: string;
}

const TYPE_META: Record<string, { icon: typeof FileText; color: string; bg: string; label: string }> = {
  article:    { icon: FileText,     color: 'text-blue-500',    bg: 'bg-blue-100 dark:bg-blue-900/30',    label: 'Article' },
  tutorial:   { icon: BookOpen,     color: 'text-indigo-500',  bg: 'bg-indigo-100 dark:bg-indigo-900/30', label: 'Tutorial' },
  tool:       { icon: Wrench,       color: 'text-teal-500',    bg: 'bg-teal-100 dark:bg-teal-900/30',    label: 'Tool' },
  quiz:       { icon: HelpCircle,   color: 'text-purple-500',  bg: 'bg-purple-100 dark:bg-purple-900/30', label: 'Quiz' },
  discussion: { icon: MessageSquare,color: 'text-amber-500',   bg: 'bg-amber-100 dark:bg-amber-900/30',  label: 'Discussion' },
  forum_post: { icon: MessageSquare,color: 'text-amber-500',   bg: 'bg-amber-100 dark:bg-amber-900/30',  label: 'Forum' },
};
const DEFAULT_META = { icon: Star, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800/30', label: 'Saved' };

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const channelName = useRef(`account_bookmarks_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`).current;

  const load = (quiet = false) => {
    if (!mountedRef.current) return;
    if (!quiet) setLoading(true);
    fetch('/api/community/bookmarks')
      .then(r => r.json())
      .then(d => { if (mountedRef.current) { setBookmarks(d.bookmarks || []); setLoading(false); } })
      .catch(() => { if (mountedRef.current) setLoading(false); });
  };

  useEffect(() => {
    mountedRef.current = true;
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_bookmarks' }, () => load(true))
      .subscribe();
    const interval = setInterval(() => load(true), 30000);
    return () => { mountedRef.current = false; supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  const removeBookmark = async (bookmark: Bookmark) => {
    setRemoving(bookmark.id);
    setBookmarks(prev => prev.filter(b => b.id !== bookmark.id));
    try {
      await fetch('/api/community/bookmarks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_type: bookmark.item_type, item_id: bookmark.item_id }),
      });
    } catch {
      setBookmarks(prev => [bookmark, ...prev]);
    }
    setRemoving(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-2xl font-bold">Bookmarks</h2><p className="text-muted-foreground mt-1">Your saved articles, tutorials, and tools</p></div>
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`flex items-center gap-4 px-5 py-4 ${i < 4 ? 'border-b border-border/40' : ''}`}>
              <div className="w-10 h-10 rounded-xl bg-surface-2 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-surface-2 rounded-lg w-2/3 animate-pulse" />
                <div className="h-3 bg-surface-2 rounded-lg w-1/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bookmarks</h2>
          <p className="text-muted-foreground mt-1">Your saved articles, tutorials, and tools</p>
        </div>
        {bookmarks.length > 0 && (
          <span className="px-3 py-1 rounded-full bg-surface-2/50 text-sm font-medium text-muted-foreground tabular-nums">
            {bookmarks.length} saved
          </span>
        )}
      </div>

      {bookmarks.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
            <BookMarked className="h-7 w-7 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Bookmarks Yet</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
            Save articles, tutorials, and tools you find interesting and they will appear here for quick access.
          </p>
          <Link href="/">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white px-6">
              Browse Articles <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="divide-y divide-border/40">
            {bookmarks.map((bookmark) => {
              const meta = TYPE_META[bookmark.item_type] || DEFAULT_META;
              const Icon = meta.icon;
              return (
                <div key={bookmark.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2/30 transition-colors group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-semibold truncate">{bookmark.title || 'Saved item'}</h3>
                      <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${meta.bg} ${meta.color} shrink-0`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Saved {timeAgo(bookmark.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {bookmark.url && (
                      <Link href={bookmark.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeBookmark(bookmark)}
                      disabled={removing === bookmark.id}
                    >
                      <Trash2 className={`h-4 w-4 ${removing === bookmark.id ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
