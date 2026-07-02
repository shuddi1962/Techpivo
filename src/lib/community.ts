import { createClient } from '@/lib/supabase/server';
export { LEVELS, BADGES, FORUM_CATEGORIES, getLevelForXP, getXPForLevel, getXPForAction, getStreakReward, getRankTitle, getStarRating, formatNumber, timeAgo } from '@/lib/community-utils';

export interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  social_links: Record<string, string>;
  level: number;
  xp: number;
  badges: Badge[];
  streak: number;
  last_active_date: string | null;
  reputation: number;
  rank: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  earned_at: string;
}

export interface ForumPost {
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
  author?: { username: string | null; full_name: string | null; avatar_url: string | null; level: number };
  category?: ForumCategory;
}

export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  post_count: number;
}

export interface ForumReply {
  id: string;
  post_id: string;
  author_id: string | null;
  parent_id: string | null;
  content: string;
  vote_count: number;
  is_accepted: boolean;
  created_at: string;
  author?: { username: string | null; full_name: string | null; avatar_url: string | null; level: number };
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: string;
  time_limit: number | null;
  question_count: number;
  attempt_count: number;
  avg_score: number;
  is_published: boolean;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  points: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_taken: number | null;
  answers: Record<string, string>;
  completed: boolean;
  created_at: string;
}

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  post_id: string | null;
  total_votes: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  options?: PollOption[];
}

export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  vote_count: number;
}

export interface Discussion {
  id: string;
  post_id: string;
  author_id: string | null;
  parent_id: string | null;
  content: string;
  like_count: number;
  reply_count: number;
  is_hidden: boolean;
  created_at: string;
  author?: { username: string | null; full_name: string | null; avatar_url: string | null; level: number };
  replies?: Discussion[];
}

export interface LeaderboardEntry {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  reputation: number;
  score: number;
  rank: string;
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data as UserProfile | null;
}

export async function getLeaderboard(limit: number = 20, period: 'all' | 'weekly' | 'monthly' = 'all') {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_profiles')
    .select('id, username, full_name, avatar_url, level, xp, reputation')
    .eq('is_public', true)
    .order('xp', { ascending: false })
    .limit(limit);
  return (data || []).map((u, i) => ({ user_id: u.id, username: u.username, full_name: u.full_name, avatar_url: u.avatar_url, level: u.level, xp: u.xp, reputation: u.reputation, score: u.xp, rank: getRankTitle(u.level) })) as LeaderboardEntry[];
}

export async function getForumCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('forum_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  return data as ForumCategory[];
}

export async function getForumPosts(categoryId?: string, limit: number = 20) {
  const supabase = await createClient();
  let query = supabase
    .from('forum_posts')
    .select('*, author:user_profiles(username, full_name, avatar_url, level), category:forum_categories(name, slug, icon)')
    .order('is_pinned', { ascending: false })
    .order('last_reply_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (categoryId) query = query.eq('category_id', categoryId);
  const { data } = await query;
  return data as ForumPost[];
}

export async function getQuizzes(limit: number = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('quizzes')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data as Quiz[];
}

export async function getQuizQuestions(quizId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('sort_order');
  return data as QuizQuestion[];
}

export async function getActivePolls() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('polls')
    .select('*, options:poll_options(*)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return data as Poll[];
}

export async function getDiscussions(postId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('article_discussions')
    .select('*, author:user_profiles(username, full_name, avatar_url, level)')
    .eq('post_id', postId)
    .eq('is_hidden', false)
    .is('parent_id', null)
    .order('created_at', { ascending: false });
  return data as Discussion[];
}

export async function getUserNotifications(userId: string, limit: number = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data;
}

export async function getUnreadNotificationCount(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  return count || 0;
}
