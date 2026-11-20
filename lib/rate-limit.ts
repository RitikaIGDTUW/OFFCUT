import { headers } from "next/headers";

/**
 * Tiny in-memory fixed-window rate limiter. Good enough for a single local server
 * (a production deployment would use Redis). Returns `true` when the call is allowed.
 */
const g = globalThis as unknown as { _rl?: Map<string, { count: number; reset: number }> };
const buckets = g._rl ?? new Map<string, { count: number; reset: number }>();
g._rl = buckets;

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

/** Best-effort client IP (on localhost this is usually "::1"). */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}
