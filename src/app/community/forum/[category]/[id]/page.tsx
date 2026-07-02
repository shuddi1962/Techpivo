'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Pin, CheckCircle2, ThumbsUp, MessageSquare, Eye, Clock, Send } from 'lucide-react';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  tags: string[];
  vote_count: number;
  reply_count: number;
  view_count: number;
  is_pinned: boolean;
  is_solved: boolean;
  created_at: string;
  author: { username: string; full_name: string; avatar_url: string | null; level: number };
  category: { name: string; slug: string; icon: string };
}

interface Reply {
  id: string;
  content: string;
  vote_count: number;
  is_accepted: boolean;
  created_at: string;
  author: { username: string; full_name: string; avatar_url: string | null; level: number };
}

export default function ForumPostPage({ params }: { params: Promise<{ category: string; id: string }> }) {
  const router = useRouter();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/community/discussions/${id}`)
        .then(r => r.json())
        .then(d => {
          setPost(d.post);
          setReplies(d.replies || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [params]);

  const submitReply = async () => {
    if (!replyContent.trim() || !post) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/community/discussions/${post.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim() }),
      });
      const data = await res.json();
      if (data.reply) {
        setReplies(prev => [...prev, data.reply]);
        setReplyContent('');
      }
    } catch (e) {
      console.error('Failed to post reply');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Post not found.</p>
            <Link href="/community/forum"><Button>Back to Forum</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href={`/community/forum/${post.category?.slug || 'general'}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> {post.category?.name || 'Forum'}
        </Link>

        {/* Post */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                {post.author?.full_name?.[0] || post.author?.username?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {post.is_pinned && <Pin className="h-4 w-4 text-yellow-500" />}
                  {post.is_solved && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  <h1 className="text-xl font-bold">{post.title}</h1>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                  <Link href={`/u/${post.author?.username}`} className="hover:text-primary font-medium">
                    {post.author?.full_name || post.author?.username}
                  </Link>
                  <Badge variant="secondary" className="text-xs">Lv.{post.author?.level}</Badge>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert mb-4">
                  {post.content.split('\n').map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                {post.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {post.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
                  <button className="flex items-center gap-1 hover:text-primary">
                    <ThumbsUp className="h-4 w-4" /> {post.vote_count}
                  </button>
                  <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" /> {post.reply_count}</span>
                  <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {post.view_count}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Replies */}
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold">{replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}</h2>
          {replies.map((reply) => (
            <Card key={reply.id} className={reply.is_accepted ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/10' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {reply.author?.full_name?.[0] || reply.author?.username?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Link href={`/u/${reply.author?.username}`} className="font-medium text-sm hover:text-primary">
                        {reply.author?.full_name || reply.author?.username}
                      </Link>
                      <Badge variant="secondary" className="text-xs">Lv.{reply.author?.level}</Badge>
                      {reply.is_accepted && (
                        <Badge variant="default" className="text-xs bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Accepted</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{new Date(reply.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm">{reply.content}</div>
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <button className="flex items-center gap-1 hover:text-primary">
                        <ThumbsUp className="h-3 w-3" /> {reply.vote_count}
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Reply Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Post a Reply</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              placeholder="Share your thoughts, answer the question, or provide helpful advice..."
              rows={4}
              className="mb-3"
            />
            <div className="flex justify-end">
              <Button onClick={submitReply} disabled={submitting || !replyContent.trim()}>
                <Send className="h-4 w-4 mr-2" />
                {submitting ? 'Posting...' : 'Post Reply'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
