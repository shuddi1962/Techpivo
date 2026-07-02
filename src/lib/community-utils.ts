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
