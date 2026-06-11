const STORAGE_KEY = "sw_rate_limit";
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000;

interface RateLimitState {
  attempts: { time: number }[];
}

function load(): RateLimitState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { attempts: [] };
}

function save(state: RateLimitState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function checkRateLimit(): { allowed: boolean; remaining: number; cooldownMs: number } {
  const state = load();
  const now = Date.now();
  const recent = state.attempts.filter(a => now - a.time < WINDOW_MS);

  if (recent.length >= MAX_ATTEMPTS) {
    const cooldownMs = recent[0].time + WINDOW_MS - now;
    return { allowed: false, remaining: 0, cooldownMs: Math.max(0, cooldownMs) };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - recent.length, cooldownMs: 0 };
}

export function recordAttempt() {
  const state = load();
  const now = Date.now();
  state.attempts = state.attempts.filter(a => now - a.time < WINDOW_MS);
  state.attempts.push({ time: now });
  save(state);
}
