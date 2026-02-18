// Simple in-memory cache (per Next.js instance)
// TTL default: 24h

const store = new Map();

function nowMs() {
  return Date.now();
}

export function cacheGet(key) {
  const v = store.get(key);
  if (!v) return null;
  if (v.expiresAtMs <= nowMs()) {
    store.delete(key);
    return null;
  }
  return v.value;
}

export function cacheSet(key, value, ttlMs = 24 * 60 * 60 * 1000) {
  store.set(key, { value, expiresAtMs: nowMs() + ttlMs });
}

export function normQuery(q) {
  return String(q || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
