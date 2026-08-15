const KEY = 'tp_poll_votes_v1';

export function getStoredVotes(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) return parsed as Record<string, string>;
  } catch {
    // ignore corrupted storage
  }
  return {};
}

export function storeVotes(votes: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(votes));
  } catch {
    // storage may be unavailable (private mode) — votes still work per-session
  }
}