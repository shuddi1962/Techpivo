'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookMarked, ExternalLink, Trash2 } from 'lucide-react';

interface Bookmark {
  id: string;
  item_type: string;
  item_id: string;
  title: string;
  url: string;
  created_at: string;
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/community/bookmarks')
      .then(r => r.json())
      .then(d => {
        setBookmarks(d.bookmarks || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const removeBookmark = async (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
    await fetch('/api/community/bookmarks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'article': return 'default';
      case 'tutorial': return 'secondary';
      case 'quiz': return 'destructive';
      case 'tool': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bookmarks</h2>
          <p className="text-muted-foreground mt-1">Your saved articles, tutorials, and tools</p>
        </div>
        <Badge variant="secondary">{bookmarks.length} saved</Badge>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookMarked className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Bookmarks Yet</h3>
            <p className="text-muted-foreground mb-4">Save articles, tutorials, and tools to find them here later.</p>
            <Link href="/">
              <Button>Browse Articles</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {bookmarks.map((bookmark) => (
            <Card key={bookmark.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getTypeColor(bookmark.item_type) as any} className="text-xs">
                        {bookmark.item_type}
                      </Badge>
                      <h3 className="font-medium truncate">{bookmark.title || bookmark.item_id}</h3>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Saved {new Date(bookmark.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {bookmark.url && (
                      <Link href={bookmark.url}>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => removeBookmark(bookmark.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
