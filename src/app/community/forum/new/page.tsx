'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Plus } from 'lucide-react';

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
}

export default function NewDiscussionPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/community/discussions')
      .then(r => r.json())
      .then(d => {
        setCategories(d.categories || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!title.trim() || !content.trim() || !categoryId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/community/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category_id: categoryId,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.post) {
        const cat = categories.find(c => c.id === categoryId);
        router.push(`/community/forum/${cat?.slug || 'general'}/${data.post.id}`);
      }
    } catch (e) {
      console.error('Failed to create discussion');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/community/forum" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Forum
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> New Discussion
            </CardTitle>
            <CardDescription>Start a conversation with the community</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Category</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left text-sm transition-all ${
                      categoryId === cat.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span className="font-medium">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Title</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="What's your question or topic?"
                maxLength={200}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Content</label>
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Describe your question, share your experience, or start a discussion..."
                rows={8}
              />
              <p className="text-xs text-muted-foreground mt-1">Supports basic Markdown formatting</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Tags (comma-separated)</label>
              <Input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="javascript, react, beginner"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={submit}
                disabled={submitting || !title.trim() || !content.trim() || !categoryId}
                size="lg"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? 'Posting...' : 'Post Discussion'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
