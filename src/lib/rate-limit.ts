import "server-only";

import { RateLimitError } from "@/lib/errors";

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

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

export function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): void {
  const result = hit(key, limit, windowSeconds);
  if (!result.ok) throw new RateLimitError(result.retryAfterSeconds);
}

export const RateLimits = {
  login: { limit: 8, windowSeconds: 300 },
  read: { limit: 240, windowSeconds: 60 },
  write: { limit: 60, windowSeconds: 60 },
  export: { limit: 20, windowSeconds: 60 },
  upload: { limit: 30, windowSeconds: 300 },
} as const;

export function clientKey(request: Request, suffix: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${suffix}:${ip}`;
}
