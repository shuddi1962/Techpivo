import { describe, it, expect } from 'vitest';
import { titleSimilarity } from '@/lib/title-similarity';

describe('titleSimilarity (duplicate detection)', () => {
  it('returns 1 for identical titles', () => {
    expect(titleSimilarity('How do I fix a blue screen?', 'How do I fix a blue screen?')).toBe(1);
  });

  it('returns 0 for unrelated titles', () => {
    expect(titleSimilarity('Best laptops 2026', 'How to bake bread')).toBe(0);
  });

  it('detects near-duplicates with minor wording changes', () => {
    const score = titleSimilarity('How to install Node.js on Windows', 'How do I install Node.js on Windows?');
    expect(score).toBeGreaterThan(0.5);
  });

  it('is case-insensitive', () => {
    expect(titleSimilarity('REACT HOOKS GUIDE', 'react hooks guide')).toBe(1);
  });

  it('returns 0 when either title has no significant tokens', () => {
    expect(titleSimilarity('a', 'hello world')).toBe(0);
  });
});