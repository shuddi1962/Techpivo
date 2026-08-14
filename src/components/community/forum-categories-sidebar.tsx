import Link from 'next/link';
import { MessageSquare, Plus, Layers, ArrowRight } from 'lucide-react';
import type { ForumCategory } from '@/lib/community';

interface Props {
  categories: ForumCategory[];
  activeSlug?: string;
}

export function ForumCategoriesSidebar({ categories, activeSlug }: Props) {
  const totalPosts = categories.reduce((s, c) => s + (c.post_count || 0), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-borderSoft bg-surface shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-borderSoft">
          <h2 className="font-semibold text-sm font-[family-name:var(--font-syne)] flex items-center gap-2">
            <Layers className="h-4 w-4 text-brand" /> Categories
          </h2>
          <span className="text-xs font-medium text-textSecondary bg-surface-2 px-2 py-0.5 rounded-full">
            {categories.length}
          </span>
        </div>
        <div className="p-2">
          <Link
            href="/community/forum"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
              !activeSlug
                ? 'bg-brand/10 text-brand font-semibold'
                : 'hover:bg-surface-2 text-textPrimary'
            }`}
          >
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${!activeSlug ? 'bg-brand text-white' : 'bg-surface-2 text-textSecondary'}`}>
              <MessageSquare className="h-4 w-4" />
            </span>
            <span className="flex-1 truncate font-medium">All Discussions</span>
            <span className="text-xs font-semibold text-textSecondary bg-surface-2 px-2 py-1 rounded-full">{totalPosts}</span>
          </Link>
          {categories.map((cat) => {
            const active = cat.slug === activeSlug;
            return (
              <Link
                key={cat.id}
                href={`/community/forum/${cat.slug}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  active ? 'bg-brand/10 text-brand font-semibold' : 'hover:bg-surface-2 text-textPrimary'
                }`}
              >
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    loading="lazy"
                    className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-borderSoft"
                  />
                ) : (
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 ${active ? 'bg-brand text-white' : 'bg-surface-2'}`}>
                    {cat.icon}
                  </span>
                )}
                <span className="flex-1 truncate font-medium">{cat.name}</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${active ? 'bg-brand/15 text-brand' : 'bg-surface-2 text-textSecondary'}`}>
                  {cat.post_count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <Link
        href="/community/forum/new"
        className="group flex items-center justify-between rounded-2xl border border-brand/25 bg-gradient-to-r from-brand/10 to-transparent px-4 py-3.5 text-sm font-semibold text-brand transition-all hover:from-brand/20"
      >
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Discussion
        </span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}