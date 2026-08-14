import { describe, it, expect } from 'vitest';
import {
  getLevelForXP, getXPForLevel, getXPForAction, getStreakReward, getRankTitle, getStarRating, formatNumber, timeAgo,
} from '@/lib/community-utils';

describe('getLevelForXP', () => {
  it('starts at level 1 for zero XP', () => {
    expect(getLevelForXP(0).level).toBe(1);
    expect(getLevelForXP(0).title).toBe('New Member');
  });

  it('returns exact level titles at thresholds', () => {
    expect(getLevelForXP(getXPForLevel(5)).title).toBe('Tech Explorer');
    expect(getLevelForXP(getXPForLevel(10)).title).toBe('Developer');
    expect(getLevelForXP(getXPForLevel(50)).title).toBe('Tech Guru');
    expect(getLevelForXP(getXPForLevel(100)).title).toBe('TechPivo Legend');
  });

  it('clamps at the top level', () => {
    expect(getLevelForXP(1_000_000).level).toBe(100);
  });

  it('progress is a percentage between 0 and 100', () => {
    const p = getLevelForXP(120).progress;
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(100);
  });
});

describe('getXPForAction', () => {
  it('returns the XP value for known actions', () => {
    expect(getXPForAction('read_article')).toBe(5);
    expect(getXPForAction('forum_answer')).toBe(25);
    expect(getXPForAction('complete_quiz')).toBe(20);
    expect(getXPForAction('daily_login')).toBe(10);
  });

  it('returns 0 for unknown actions', () => {
    expect(getXPForAction('totally_fake_action')).toBe(0);
  });
});

describe('getStreakReward', () => {
  it('escalates with the streak', () => {
    expect(getStreakReward(1)).toBeGreaterThan(0);
    expect(getStreakReward(7)).toBeGreaterThan(getStreakReward(1));
    expect(getStreakReward(100)).toBeGreaterThanOrEqual(getStreakReward(30));
  });
});

describe('getRankTitle / getStarRating', () => {
  it('rank title follows level', () => {
    expect(getRankTitle(1)).toBeTruthy();
    expect(getRankTitle(100)).toBeTruthy();
  });

  it('star rating is bounded 0..5', () => {
    for (const lvl of [0, 1, 25, 50, 200]) {
      const stars = getStarRating(lvl);
      expect(stars).toBeGreaterThanOrEqual(0);
      expect(stars).toBeLessThanOrEqual(5);
    }
    expect(getStarRating(0)).toBe(0); // no stars below level 5
    expect(getStarRating(50)).toBe(5);
  });
});

describe('formatNumber', () => {
  it('formats thousands with suffix', () => {
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(1500)).toContain('1.5');
  });
});

describe('timeAgo', () => {
  it('returns "just now" for recent dates', () => {
    expect(timeAgo(new Date().toISOString())).toBe('just now');
  });

  it('handles invalid input gracefully', () => {
    expect(() => timeAgo('not-a-date')).not.toThrow();
  });
});