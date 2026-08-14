import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limiter';

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimit('test-key'));

  it('allows requests under the limit', () => {
    const first = checkRateLimit('test-key', { limit: 2, windowMs: 1000 });
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    const second = checkRateLimit('test-key', { limit: 2, windowMs: 1000 });
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it('blocks once the limit is exceeded', () => {
    checkRateLimit('test-key', { limit: 1, windowMs: 1000 });
    const blocked = checkRateLimit('test-key', { limit: 1, windowMs: 1000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.cooldown).toBeGreaterThan(0);
  });

  it('resets the window after expiry', () => {
    checkRateLimit('test-key', { limit: 1, windowMs: 10 });
    return new Promise<void>(resolve => {
      setTimeout(() => {
        const after = checkRateLimit('test-key', { limit: 1, windowMs: 10 });
        expect(after.allowed).toBe(true);
        resolve();
      }, 30);
    });
  });

  it('keys are isolated from each other', () => {
    checkRateLimit('key-a', { limit: 1, windowMs: 1000 });
    const other = checkRateLimit('key-b', { limit: 1, windowMs: 1000 });
    expect(other.allowed).toBe(true);
  });

  it('exposes the aiAnswer preset for the AI answer route', () => {
    expect(RATE_LIMITS.aiAnswer).toEqual({ limit: 10, windowMs: 60 * 60 * 1000 });
  });
});

describe('clientIp', () => {
  it('reads the first x-forwarded-for entry', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(clientIp(req)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip', () => {
    const req = new Request('http://localhost', { headers: { 'x-real-ip': '9.9.9.9' } });
    expect(clientIp(req)).toBe('9.9.9.9');
  });

  it('defaults to unknown when no headers are present', () => {
    expect(clientIp(new Request('http://localhost'))).toBe('unknown');
  });
});