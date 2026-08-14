import { describe, it, expect } from 'vitest';
import { slugify, questionHealthFor, CONTENT_TYPE_META, CONTENT_TYPE_LIST, QUESTION_STATUS_META } from '@/lib/community-types';

describe('slugify', () => {
  it('lowercases and trims', () => {
    expect(slugify('  Hello World  ')).toBe('hello-world');
  });

  it('replaces runs of non-alphanumerics with dashes', () => {
    expect(slugify('React 19 vs Vue!!')).toBe('react-19-vs-vue');
  });

  it('strips leading/trailing dashes', () => {
    expect(slugify('--node.js--')).toBe('node-js');
  });

  it('caps at 120 characters', () => {
    expect(slugify('a'.repeat(300))).toHaveLength(120);
  });

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('');
  });
});

describe('questionHealthFor', () => {
  it('solved when is_solved', () => {
    expect(questionHealthFor({ content_type: 'question', question_status: 'active', reply_count: 5, is_solved: true })).toBe('solved');
  });

  it('active when it has replies', () => {
    expect(questionHealthFor({ content_type: 'question', question_status: 'new', reply_count: 2, is_solved: false })).toBe('active');
  });

  it('unanswered when no replies', () => {
    expect(questionHealthFor({ content_type: 'question', question_status: 'new', reply_count: 0, is_solved: false })).toBe('unanswered');
  });

  it('preserves needs_context', () => {
    expect(questionHealthFor({ content_type: 'question', question_status: 'needs_context', reply_count: 0, is_solved: false })).toBe('needs_context');
  });

  it('preserves archived', () => {
    expect(questionHealthFor({ content_type: 'question', question_status: 'archived', reply_count: 0, is_solved: false })).toBe('archived');
  });

  it('passes through non-question content types', () => {
    expect(questionHealthFor({ content_type: 'discussion', question_status: 'new', reply_count: 0, is_solved: false })).toBe('new');
  });
});

describe('metadata completeness', () => {
  it('every content type has meta', () => {
    for (const t of CONTENT_TYPE_LIST) {
      expect(CONTENT_TYPE_META[t]).toBeDefined();
      expect(CONTENT_TYPE_META[t].label).toBeTruthy();
    }
  });

  it('every question status has meta', () => {
    const statuses: (keyof typeof QUESTION_STATUS_META)[] = [
      'new', 'needs_context', 'unanswered', 'active', 'answered', 'solved', 'stale', 'archived',
    ];
    for (const s of statuses) {
      expect(QUESTION_STATUS_META[s]).toBeDefined();
      expect(QUESTION_STATUS_META[s].label).toBeTruthy();
    }
  });
});