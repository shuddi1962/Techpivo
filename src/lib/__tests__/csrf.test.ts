import { describe, it, expect } from 'vitest';
import { isSameOrigin } from '@/lib/csrf';

describe('isSameOrigin', () => {
  it('allows same-origin requests', () => {
    const req = new Request('https://techpivo.com/api/x', {
      method: 'POST',
      headers: { origin: 'https://techpivo.com' },
    });
    expect(isSameOrigin(req)).toBe(true);
  });

  it('allows localhost in development', () => {
    const req = new Request('http://localhost:3000/api/x', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
    });
    expect(isSameOrigin(req)).toBe(true);
  });

  it('blocks cross-origin requests', () => {
    const req = new Request('https://techpivo.com/api/x', {
      method: 'POST',
      headers: { origin: 'https://evil.example.com' },
    });
    expect(isSameOrigin(req)).toBe(false);
  });

  it('rejects origin-prefix spoofing (evil.com vs evil.com.evil)', () => {
    const req = new Request('https://techpivo.com/api/x', {
      method: 'POST',
      headers: { origin: 'https://techpivo.com.evil.example.com' },
    });
    expect(isSameOrigin(req)).toBe(false);
  });

  it('allows requests without an Origin header (curl, cron, server-to-server)', () => {
    const req = new Request('https://techpivo.com/api/cron/reports', { method: 'POST' });
    expect(isSameOrigin(req)).toBe(true);
  });
});