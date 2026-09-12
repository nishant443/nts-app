import "server-only";

import { RateLimitError } from "@/lib/errors";

/**
 * Fixed-window rate limiter backed by an in-process Map.
 *
 * This is correct for a single Node instance and is enough for NTS's traffic.
 * It is deliberately not shared state: if the app is ever scaled to more than
 * one instance, swap `hit()` for a Redis `INCR`/`EXPIRE` (Upstash's REST client
 * works from any runtime) — the call sites do not need to change.
 */

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

/** Stops the Map growing without bound on a long-lived server. */
let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 60_000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function hit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      ),
    };
  }

  return {
    ok: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/** Throws `RateLimitError` when the caller is over budget. */
export function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): void {
  const result = hit(key, limit, windowSeconds);
  if (!result.ok) throw new RateLimitError(result.retryAfterSeconds);
}

/** Sensible budgets per class of endpoint. */
export const RateLimits = {
  /** Brute-force protection on the login form. */
  login: { limit: 8, windowSeconds: 300 },
  /** Ordinary reads. */
  read: { limit: 240, windowSeconds: 60 },
  /** Anything that writes. */
  write: { limit: 60, windowSeconds: 60 },
  /** PDF and spreadsheet generation — comparatively expensive. */
  export: { limit: 20, windowSeconds: 60 },
  /** File uploads. */
  upload: { limit: 30, windowSeconds: 300 },
} as const;

/**
 * Best-effort client identity for rate limiting. Behind Vercel or any sane
 * proxy `x-forwarded-for` is trustworthy; falls back to a constant so the
 * limiter degrades to global rather than off.
 */
export function clientKey(request: Request, suffix: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${suffix}:${ip}`;
}
