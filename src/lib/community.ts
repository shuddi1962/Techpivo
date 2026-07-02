import { createClient } from '@/lib/supabase/server';

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

export const LEVELS = [
  { level: 1, title: 'New Member', icon: '👤' },
  { level: 5, title: 'Tech Explorer', icon: '🔬' },
  { level: 10, title: 'Developer', icon: '💻' },
  { level: 20, title: 'Tech Enthusiast', icon: '⚡' },
  { level: 35, title: 'Power User', icon: '🚀' },
  { level: 50, title: 'Tech Guru', icon: '🏆' },
  { level: 100, title: 'TechPivo Legend', icon: '👑' },
];

export const BADGES = [
  { id: 'early_member', name: 'Early Member', icon: '🔥', description: 'Joined during the first year' },
  { id: 'programmer', name: 'Programmer', icon: '💻', description: 'Read 20 programming articles' },
  { id: 'ai_expert', name: 'AI Expert', icon: '🤖', description: 'Read 20 AI articles' },
  { id: 'cyber_pro', name: 'Cybersecurity Pro', icon: '🛡', description: 'Read 20 cybersecurity articles' },
  { id: 'gadget_lover', name: 'Gadget Lover', icon: '📱', description: 'Read 15 gadget reviews' },
  { id: 'tutorial_master', name: 'Tutorial Master', icon: '🎓', description: 'Completed 10 tutorials' },
  { id: 'quiz_champion', name: 'Quiz Champion', icon: '🏆', description: 'Scored 100% on 5 quizzes' },
  { id: 'top_commenter', name: 'Top Commenter', icon: '⭐', description: '50 comments with 10+ likes' },
  { id: 'community_helper', name: 'Community Helper', icon: '💬', description: '20 accepted forum answers' },
  { id: 'daily_visitor', name: 'Daily Visitor', icon: '🚀', description: '30-day login streak' },
  { id: 'first_post', name: 'First Post', icon: '📝', description: 'Created first forum post' },
  { id: 'quiz_beginner', name: 'Quiz Beginner', icon: '🎯', description: 'Completed 1 quiz' },
  { id: 'knowledge_seeker', name: 'Knowledge Seeker', icon: '📚', description: 'Read 50 articles' },
  { id: 'social_butterfly', name: 'Social Butterfly', icon: '🦋', description: 'Followed 10 users' },
  { id: 'bookmark_collector', name: 'Bookmark Collector', icon: '🔖', description: 'Saved 25 bookmarks' },
];

export const FORUM_CATEGORIES = [
  { slug: 'programming', name: 'Programming', icon: '💻', color: '#3B82F6', description: 'Code, languages, frameworks, and development' },
  { slug: 'cybersecurity', name: 'Cybersecurity', icon: '🛡', color: '#EF4444', description: 'Security, privacy, and threats' },
  { slug: 'ai', name: 'AI & Machine Learning', icon: '🤖', color: '#8B5CF6', description: 'Artificial intelligence, ML, and automation' },
  { slug: 'gaming', name: 'Gaming', icon: '🎮', color: '#F59E0B', description: 'Games, consoles, and gaming tech' },
  { slug: 'linux', name: 'Linux', icon: '🐧', color: '#F97316', description: 'Linux distros, commands, and servers' },
  { slug: 'windows', name: 'Windows', icon: '🪟', color: '#06B6D4', description: 'Windows OS, tips, and troubleshooting' },
  { slug: 'hardware', name: 'Hardware', icon: '🔧', color: '#6366F1', description: 'PC builds, components, and peripherals' },
  { slug: 'career', name: 'Career', icon: '📈', color: '#10B981', description: 'Jobs, skills, and professional growth' },
  { slug: 'webdev', name: 'Web Development', icon: '🌐', color: '#EC4899', description: 'HTML, CSS, JS, and web frameworks' },
  { slug: 'mobile', name: 'Mobile', icon: '📱', color: '#14B8A6', description: 'Android, iOS, and mobile apps' },
  { slug: 'networking', name: 'Networking', icon: '📡', color: '#0EA5E9', description: 'Networks, servers, and infrastructure' },
  { slug: 'general', name: 'General', icon: '💬', color: '#6B7280', description: 'General tech discussions' },
];

export function getLevelForXP(xp: number): { level: number; title: string; icon: string; xpForNext: number; progress: number } {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1] || LEVELS[0];

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= getXPForLevel(LEVELS[i].level)) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || LEVELS[i];
      break;
    }
  }

  const currentXP = getXPForLevel(currentLevel.level);
  const nextXP = getXPForLevel(nextLevel.level);
  const progress = nextXP > currentXP ? ((xp - currentXP) / (nextXP - currentXP)) * 100 : 100;

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    icon: currentLevel.icon,
    xpForNext: nextXP,
    progress: Math.min(progress, 100),
  };
}

export function getXPForLevel(level: number): number {
  return level * level * 10;
}

export function getXPForAction(action: string): number {
  const xpMap: Record<string, number> = {
    read_article: 5,
    complete_profile: 50,
    comment_approved: 15,
    forum_answer: 25,
    forum_post: 40,
    complete_quiz: 20,
    share_article: 15,
    daily_login: 10,
    newsletter_subscribe: 20,
    first_post: 25,
    follow_user: 5,
    bookmark: 5,
  };
  return xpMap[action] || 0;
}

export function getStreakReward(streak: number): number {
  if (streak >= 30) return 100;
  if (streak >= 14) return 50;
  if (streak >= 7) return 30;
  if (streak >= 3) return 15;
  return 10;
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

export function getRankTitle(level: number): string {
  if (level >= 100) return 'TechPivo Legend';
  if (level >= 50) return 'Tech Guru';
  if (level >= 35) return 'Power User';
  if (level >= 20) return 'Tech Enthusiast';
  if (level >= 10) return 'Developer';
  if (level >= 5) return 'Tech Explorer';
  return 'New Member';
}

export function getStarRating(level: number): number {
  if (level >= 50) return 5;
  if (level >= 35) return 4;
  if (level >= 20) return 3;
  if (level >= 10) return 2;
  if (level >= 5) return 1;
  return 0;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

export function timeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
  return `${Math.floor(seconds / 31536000)}y ago`;
}
