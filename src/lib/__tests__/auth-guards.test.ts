import { describe, it, expect, afterEach, vi } from 'vitest';
import { verifyTurnstile } from '@/lib/turnstile';
import { sha1Hex, isPasswordBreached } from '@/lib/hibp';

afterEach(() => {
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.HIBP_API_KEY;
  vi.unstubAllGlobals();
});

describe('sha1Hex', () => {
  it('hashes "password" to the known SHA-1 digest', async () => {
    expect(await sha1Hex('password')).toBe('5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8');
  });

  it('hashes "hello" to the known SHA-1 digest', async () => {
    expect(await sha1Hex('hello')).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d');
  });

  it('hashes the empty string to the SHA-1 of an empty input', async () => {
    expect(await sha1Hex('')).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
  });
});

describe('isPasswordBreached', () => {
  const PASSWORD_PREFIX = '5BAA6';
  const PASSWORD_SUFFIX = '1E4C9B93F3F0682250B6CF8331B7EE68FD8';

  it('returns true when the hash suffix appears in the range response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `00112233445566778899AABBCCDDEEFF00112233:3\r\n${PASSWORD_SUFFIX}:1234567\r\nFFEEDDCCBBAA99887766554433221100FFEEDD:1\r\n`,
    }));
    expect(await isPasswordBreached('password')).toBe(true);
  });

  it('returns false when the hash suffix is absent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `00112233445566778899AABBCCDDEEFF00112233:3\r\nFFEEDDCCBBAA99887766554433221100FFEEDD:1\r\n`,
    }));
    expect(await isPasswordBreached('password')).toBe(false);
  });

  it('requests the first five hex characters of the SHA-1 as the prefix', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);
    await isPasswordBreached('password');
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${PASSWORD_PREFIX}`);
  });

  it('sends the hibp-api-key header when HIBP_API_KEY is set', async () => {
    process.env.HIBP_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);
    await isPasswordBreached('password');
    const headers = fetchMock.mock.calls[0][1]?.headers ?? {};
    expect(headers['hibp-api-key']).toBe('test-key');
  });

  it('fails open (returns false) when the range request rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    expect(await isPasswordBreached('password')).toBe(false);
  });

  it('fails open (returns false) on a non-OK range response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, text: async () => '' }));
    expect(await isPasswordBreached('password')).toBe(false);
  });
});

describe('verifyTurnstile', () => {
  const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  it('skips verification entirely when TURNSTILE_SECRET_KEY is unset', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await verifyTurnstile('any-token')).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a non-string token', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    expect(await verifyTurnstile(12345)).toBe(false);
  });

  it('rejects an empty token', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    expect(await verifyTurnstile('')).toBe(false);
  });

  it('rejects an oversized token (> 2048 chars)', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    expect(await verifyTurnstile('x'.repeat(2049))).toBe(false);
  });

  it('returns true when siteverify responds success', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }));
    expect(await verifyTurnstile('valid-token')).toBe(true);
  });

  it('returns false when siteverify responds unsuccessfully', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    }));
    expect(await verifyTurnstile('valid-token')).toBe(false);
  });

  it('fails closed (returns false) on a non-OK siteverify response', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    expect(await verifyTurnstile('valid-token')).toBe(false);
  });

  it('fails closed (returns false) when siteverify rejects', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    expect(await verifyTurnstile('valid-token')).toBe(false);
  });

  it('posts the secret and response to the siteverify endpoint', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);
    await verifyTurnstile('token-abc');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(SITEVERIFY_URL);
    expect(init.body).toContain('"secret":"secret"');
    expect(init.body).toContain('"response":"token-abc"');
  });
});