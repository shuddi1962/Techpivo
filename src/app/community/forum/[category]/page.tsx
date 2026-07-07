import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getForumCategories, getForumPosts, timeAgo } from '@/lib/community';
import { MessageSquare, Plus, Pin, CheckCircle2, Eye, ThumbsUp, ArrowLeft, Clock } from 'lucide-react';
import type { Metadata } from 'next/types';
import { SITE_NAME, SITE_URL } from '@/lib/constants';

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const name = category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const description = `Browse ${name} discussions on the TechPivo forum. Join the conversation about technology topics.`
  return {
    title: `${name} — TechPivo Forum`,
    description,
    alternates: { canonical: `${SITE_URL}/community/forum/${category}` },
    openGraph: {
      title: `${name} — TechPivo Forum`,
      description,
    },
    twitter: {
      card: "summary",
      title: `${name} — TechPivo Forum`,
      description,
    },
  }
}

export default async function ForumCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const categories = await getForumCategories();
  const currentCat = categories.find(c => c.slug === category);
  const posts = await getForumPosts(currentCat?.id);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/community/forum" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Forum
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <span className="text-4xl">{currentCat?.icon || '💬'}</span>
              {currentCat?.name || category}
            </h1>
            {currentCat?.description && (
              <p className="text-muted-foreground mt-1">{currentCat.description}</p>
            )}
          </div>
          <Link href="/community/forum/new">
            <Button><Plus className="mr-2 h-4 w-4" /> New Discussion</Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <Link href="/community/forum" className="block px-3 py-2 rounded-md hover:bg-muted text-sm transition-colors">
                  All Discussions
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/community/forum/${cat.slug}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      cat.slug === category ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span className="flex-1">{cat.name}</span>
                    <span className="text-xs text-muted-foreground">{cat.post_count}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-3">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Discussions Yet</h3>
                  <p className="text-muted-foreground mb-4">Start the first conversation in this category.</p>
                  <Link href="/community/forum/new">
                    <Button><Plus className="mr-2 h-4 w-4" /> Start Discussion</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <Link key={post.id} href={`/community/forum/${category}/${post.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                          {post.author?.full_name?.[0] || post.author?.username?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {post.is_pinned && <Pin className="h-3 w-3 text-yellow-500" />}
                            {post.is_solved && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                            <h3 className="font-semibold truncate">{post.title}</h3>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{post.author?.full_name || post.author?.username || 'Anonymous'}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(post.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {post.vote_count}</span>
                            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {post.reply_count}</span>
                            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {post.view_count}</span>
                          </div>
                        </div>
                        {post.author?.level && (
                          <Badge variant="secondary" className="shrink-0">Lv.{post.author.level}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
