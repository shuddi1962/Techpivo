'use client';

import { renderMarkdown } from '@/lib/markdown';

interface Props {
  content: string;
  className?: string;
}

/** Safe markdown renderer — renderMarkdown escapes all HTML before injection. */
export function CommunityMarkdown({ content, className }: Props) {
  return (
    <div
      className={`community-markdown ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}