import {
  HelpCircle, MessageSquare, BarChart3, GraduationCap, Mic, Rocket, Scale, CircleDot, type LucideIcon
} from 'lucide-react';

export type CommunityContentType = 'question' | 'discussion' | 'poll' | 'quiz' | 'ama' | 'showcase' | 'debate';

export type QuestionStatus = 'new' | 'needs_context' | 'unanswered' | 'active' | 'answered' | 'solved' | 'stale' | 'archived';

export interface CommunityAuthor {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  level: number;
  reputation: number;
  role?: string | null;
  accepted_count?: number;
}

export interface CommunityTopic {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
}

export interface CommunityPost {
  id: string;
  category_id: string;
  author_id: string | null;
  title: string;
  content: string;
  slug: string | null;
  tags: string[];
  reply_count: number;
  vote_count: number;
  view_count: number;
  is_pinned: boolean;
  is_solved: boolean;
  last_reply_at: string | null;
  created_at: string;
  content_type: CommunityContentType;
  question_status: QuestionStatus;
  difficulty: string | null;
  bounty_points: number;
  is_locked: boolean;
  excerpt: string | null;
  image_url: string | null;
  meta: Record<string, unknown>;
  author?: CommunityAuthor | null;
  category?: { name: string; slug: string; image_url?: string | null } | null;
  topics?: CommunityTopic[];
  accepted_reply?: { id: string } | null;
  poll?: { id: string; title: string; total_votes: number } | null;
}

export interface CommunityReply {
  id: string;
  post_id: string;
  author_id: string | null;
  parent_id: string | null;
  content: string;
  vote_count: number;
  is_accepted: boolean;
  created_at: string;
  reply_type: 'answer' | 'comment' | 'argument' | 'alternative_solution' | 'update';
  position: 'for' | 'against' | null;
  rank_score: number;
  accepted_by?: string | null;
  accepted_at?: string | null;
  author?: CommunityAuthor | null;
}

export const CONTENT_TYPE_META: Record<CommunityContentType, { label: string; short: string; icon: LucideIcon; description: string }> = {
  question: { label: 'Question', short: 'Ask', icon: HelpCircle, description: 'Seeking a verified answer' },
  discussion: { label: 'Discussion', short: 'Discuss', icon: MessageSquare, description: 'Open technical conversation' },
  poll: { label: 'Poll', short: 'Poll', icon: BarChart3, description: 'Structured community vote' },
  quiz: { label: 'Quiz', short: 'Quiz', icon: GraduationCap, description: 'Test technical knowledge' },
  ama: { label: 'AMA', short: 'AMA', icon: Mic, description: 'Ask Me Anything session' },
  showcase: { label: 'Showcase', short: 'Showcase', icon: Rocket, description: 'Project or tool presentation' },
  debate: { label: 'Debate', short: 'Debate', icon: Scale, description: 'Structured opposing viewpoints' },
};

export const QUESTION_STATUS_META: Record<QuestionStatus, { label: string; tone: 'muted' | 'info' | 'warning' | 'success' | 'danger' | 'verified' }> = {
  new: { label: 'New', tone: 'muted' },
  needs_context: { label: 'Needs context', tone: 'warning' },
  unanswered: { label: 'Unanswered', tone: 'danger' },
  active: { label: 'Active', tone: 'info' },
  answered: { label: 'Answered', tone: 'info' },
  solved: { label: 'Solved', tone: 'success' },
  stale: { label: 'Stale', tone: 'muted' },
  archived: { label: 'Archived', tone: 'muted' },
};

export const CONTENT_TYPE_LIST: CommunityContentType[] = ['question', 'discussion', 'poll', 'quiz', 'ama', 'showcase', 'debate'];

export function contentTypeIcon(type: CommunityContentType): LucideIcon {
  return CONTENT_TYPE_META[type].icon ?? CircleDot;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function expertTierFromAccepted(acceptedCount: number): 'none' | 'contributor' | 'specialist' {
  if (acceptedCount >= 20) return 'specialist';
  if (acceptedCount >= 5) return 'contributor';
  return 'none';
}

export function questionHealthFor(post: Pick<CommunityPost, 'content_type' | 'question_status' | 'reply_count' | 'is_solved'>): QuestionStatus {
  if (post.content_type !== 'question') return post.question_status;
  if (post.is_solved) return 'solved';
  if (post.reply_count > 0) return 'active';
  if (post.question_status === 'needs_context') return 'needs_context';
  return post.question_status === 'archived' ? 'archived' : 'unanswered';
}
