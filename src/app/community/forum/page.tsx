import Link from 'next/link';
import { MessageSquare, Plus, Pin, CheckCircle2, Eye, ThumbsUp, Clock, Sparkles, ArrowRight } from 'lucide-react';
import { getForumCategories, getForumPosts, timeAgo } from '@/lib/community';

export const metadata = {
  title: 'Forum — TechPivo Community',
  description: 'Join discussions about programming, cybersecurity, AI, and more.',
};

export default async function ForumPage() {
  const [categories, recentPosts] = await Promise.all([
    getForumCategories(),
    getForumPosts(undefined, 15),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600/10 via-cyan-500/5 to-sky-600/10 dark:from-blue-500/5 dark:via-cyan-500/5 dark:to-sky-500/5 border-b border-border/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400/10 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-20 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs font-medium mb-4">
              <Sparkles className="h-3.5 w-3.5" /> Community Forum
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-syne)] tracking-tight">
              Discussions
            </h1>
            <p className="text-lg text-muted-foreground mt-3 max-w-xl">
              Ask questions, share knowledge, and help fellow tech enthusiasts.
            </p>
          </div>
          <Link
            href="/community/forum/new"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg shadow-blue-500/20"
          >
            <Plus className="h-4 w-4" /> New Discussion
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
              <div className="p-4 border-b border-border/40">
                <h2 className="font-semibold text-sm font-[family-name:var(--font-syne)]">Categories</h2>
              </div>
              <div className="p-2">
                <Link
                  href="/community/forum"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium text-sm transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  All Discussions
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/community/forum/${cat.slug}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 text-sm transition-colors group"
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="flex-1 text-muted-foreground group-hover:text-foreground transition-colors">{cat.name}</span>
                    <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{cat.post_count}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="lg:col-span-3 space-y-3">
            {recentPosts.length === 0 ? (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted/50 mb-6">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/60" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Discussions Yet</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-6">Be the first to start a conversation.</p>
                <Link
                  href="/community/forum/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg shadow-blue-500/20"
                >
                  <Plus className="h-4 w-4" /> Start Discussion
                </Link>
              </div>
            ) : (
              recentPosts.map((post) => {
                const avatarLetter = post.author?.full_name?.[0] || post.author?.username?.[0] || '?';
                const colorIndex = avatarLetter.charCodeAt(0) % 5;
                const avatarColors = ['from-blue-500 to-cyan-500', 'from-violet-500 to-purple-500', 'from-amber-500 to-orange-500', 'from-emerald-500 to-teal-500', 'from-pink-500 to-rose-500'];
                return (
                  <Link
                    key={post.id}
                    href={`/community/forum/${post.category?.slug || 'general'}/${post.id}`}
                    className="group block rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:shadow-blue-500/5 hover:border-blue-300/30 dark:hover:border-blue-700/30 transition-all duration-300 overflow-hidden"
                  >
                    <div className="p-4 md:p-5">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarColors[colorIndex]} flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm`}>
                          {avatarLetter}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {post.is_pinned && <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                            {post.is_solved && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                            <h3 className="font-semibold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{post.title}</h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                            <span>{post.author?.full_name || post.author?.username || 'Anonymous'}</span>
                            <span className="text-xs text-muted-foreground/40">·</span>
                            <span className="flex items-center gap-1">
                              {post.category?.icon} {post.category?.name}
                            </span>
                            <span className="text-xs text-muted-foreground/40">·</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {timeAgo(post.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {post.vote_count}</span>
                            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {post.reply_count}</span>
                            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {post.view_count}</span>
                          </div>
                        </div>
                        {post.author?.level && (
                          <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                            Lv.{post.author.level}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
