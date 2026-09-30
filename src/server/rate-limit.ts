/**
 * Minimal in-memory sliding-window rate limiter.
 * Good enough for a single App Platform instance; for several instances,
 * move this to Redis/Valkey (DigitalOcean Managed Caching).
 */
const hits = new Map<string, number[]>();
let lastSweep = Date.now();

export function rateLimit(key: string, limit = 5, windowMs = 10 * 60 * 1000): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  if (now - lastSweep > windowMs) {
    for (const [k, times] of hits) if (times.every((t) => now - t > windowMs)) hits.delete(k);
    lastSweep = now;
  }
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - recent[0]!)) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  return { ok: true, retryAfter: 0 };
}
